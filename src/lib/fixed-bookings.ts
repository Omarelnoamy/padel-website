/**
 * Fixed Bookings Utility
 * Helper functions for checking conflicts and managing fixed bookings
 */

import { prisma } from "@/lib/prisma";

export type FixedBookingStatus = "ACTIVE" | "PAUSED" | "CANCELED";

/**
 * Check if a time range overlaps with another time range
 * @param start1 Start time of first range (HH:MM)
 * @param end1 End time of first range (HH:MM)
 * @param start2 Start time of second range (HH:MM)
 * @param end2 End time of second range (HH:MM)
 * @returns true if ranges overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert "HH:MM" to minutes for easier comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);

  // Handle overnight bookings (end < start means it wraps to next day)
  // For fixed bookings, we assume same-day ranges
  const end1Final = end1Min < start1Min ? end1Min + 1440 : end1Min;
  const end2Final = end2Min < start2Min ? end2Min + 1440 : end2Min;

  // Check overlap: ranges overlap if one starts before the other ends
  return (
    (start1Min < end2Final && end1Final > start2Min) ||
    (start2Min < end1Final && end2Final > start1Min)
  );
}

/**
 * Get day of week (0-6) from a Date object
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Check if a date falls within a fixed booking's active period
 * @param date Date to check
 * @param startDate Fixed booking start date
 * @param endDate Fixed booking end date (null = infinite)
 * @returns true if date is within active period
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date | null
): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (checkDate < start) {
    return false;
  }

  if (endDate === null) {
    return true; // Infinite range
  }

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return checkDate <= end;
}

/**
 * Check if a booking slot conflicts with any active fixed bookings
 * @param courtId Court ID
 * @param date Booking date
 * @param startTime Booking start time (HH:MM)
 * @param endTime Booking end time (HH:MM)
 * @returns Fixed booking that conflicts, or null if no conflict
 */
export async function checkFixedBookingConflict(
  courtId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<{ id: string; userId: string | null; createdById: string } | null> {
  const dayOfWeek = getDayOfWeek(date);

  // Find all ACTIVE fixed bookings for this court and day of week
  const fixedBookings = await prisma.fixedBooking.findMany({
    where: {
      courtId,
      dayOfWeek,
      status: "ACTIVE", // Only ACTIVE bookings block slots
    },
    select: {
      id: true,
      userId: true,
      createdById: true,
      startTime: true,
      endTime: true,
      startDate: true,
      endDate: true,
    },
  });

  // Check each fixed booking for conflicts
  for (const fixedBooking of fixedBookings) {
    // Check if date is within fixed booking's active period
    if (
      !isDateInRange(date, fixedBooking.startDate, fixedBooking.endDate)
    ) {
      continue; // Fixed booking not active on this date
    }

    // Check if time ranges overlap
    if (
      timeRangesOverlap(
        startTime,
        endTime,
        fixedBooking.startTime,
        fixedBooking.endTime
      )
    ) {
      return {
        id: fixedBooking.id,
        userId: fixedBooking.userId,
        createdById: fixedBooking.createdById,
      };
    }
  }

  return null; // No conflict
}

/**
 * Check if a new fixed booking would conflict with existing ones
 * @param courtId Court ID
 * @param dayOfWeek Day of week (0-6)
 * @param startTime Start time (HH:MM)
 * @param endTime End time (HH:MM)
 * @param startDate Start date
 * @param endDate End date (null = infinite)
 * @param excludeId Fixed booking ID to exclude from check (for updates)
 * @returns Fixed booking that conflicts, or null if no conflict
 */
export async function checkFixedBookingOverlap(
  courtId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  startDate: Date,
  endDate: Date | null,
  excludeId?: string
): Promise<{ id: string; userId: string | null } | null> {
  // Find all ACTIVE fixed bookings for this court and day of week
  const where: any = {
    courtId,
    dayOfWeek,
    status: "ACTIVE",
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existingFixedBookings = await prisma.fixedBooking.findMany({
    where,
    select: {
      id: true,
      userId: true,
      startTime: true,
      endTime: true,
      startDate: true,
      endDate: true,
    },
  });

  // Check each existing fixed booking for overlap
  for (const existing of existingFixedBookings) {
    // First, check if date ranges overlap
    // For fixed bookings, if both are active at any point in time, they conflict
    const dateRangesOverlap =
      endDate === null ||
      existing.endDate === null ||
      (startDate <= (existing.endDate || new Date()) &&
        (endDate || new Date()) >= existing.startDate);

    if (!dateRangesOverlap) {
      continue; // Date ranges don't overlap, no conflict
    }

    // If date ranges overlap, check if time ranges also overlap
    const timesOverlap = timeRangesOverlap(
      startTime,
      endTime,
      existing.startTime,
      existing.endTime
    );

    if (timesOverlap) {
      // Both date and time ranges overlap - this is a conflict
      return {
        id: existing.id,
        userId: existing.userId,
      };
    }
  }

  return null; // No overlap
}

/**
 * Get all fixed bookings that would block a specific date
 * Useful for displaying blocked slots in calendar view
 */
export async function getFixedBookingsForDate(
  courtId: string,
  date: Date
): Promise<
  Array<{
    id: string;
    startTime: string;
    endTime: string;
    userId: string | null;
    createdById: string;
    notes: string | null;
  }>
> {
  const dayOfWeek = getDayOfWeek(date);

  const fixedBookings = await prisma.fixedBooking.findMany({
    where: {
      courtId,
      dayOfWeek,
      status: "ACTIVE",
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      userId: true,
      createdById: true,
      startDate: true,
      endDate: true,
      notes: true,
    },
  });

  // Filter by date range
  return fixedBookings
    .filter((fb: any) => isDateInRange(date, fb.startDate, fb.endDate))
    .map((fb: any) => ({
      id: fb.id,
      startTime: fb.startTime,
      endTime: fb.endTime,
      userId: fb.userId,
      createdById: fb.createdById,
      notes: fb.notes,
    }));
}
