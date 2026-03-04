/**
 * POST /api/fixed-bookings/process-income
 * Process fixed bookings and create income transactions for completed periods
 * This should be called daily (via cron job or scheduled task)
 * 
 * Logic:
 * - For each ACTIVE fixed booking
 * - Find all dates where the booking occurred (up to yesterday)
 * - Check if transaction already exists for that date
 * - If not, create income transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { isDateInRange } from "@/lib/fixed-bookings";

/**
 * Get day of week (0-6) from a Date object
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Calculate hours from startTime to endTime (handles overnight bookings)
 */
function calculateHours(startTime: string, endTime: string): number {
  const [startHour] = startTime.split(":").map(Number);
  const [endHour] = endTime.split(":").map(Number);
  return endHour < startHour ? 24 - startHour + endHour : endHour - startHour;
}

/**
 * Get all dates where a fixed booking should have occurred
 * @param fixedBooking The fixed booking
 * @param upToDate Process up to this date (usually yesterday)
 * @returns Array of dates where the booking occurred
 */
function getFixedBookingDates(
  fixedBooking: {
    dayOfWeek: number;
    startDate: Date;
    endDate: Date | null;
  },
  upToDate: Date
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(fixedBooking.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = fixedBooking.endDate
    ? new Date(fixedBooking.endDate)
    : upToDate;
  endDate.setHours(23, 59, 59, 999);
  
  const processUpTo = new Date(upToDate);
  processUpTo.setHours(23, 59, 59, 999);
  
  // Don't process future dates or dates before startDate
  const actualEndDate = endDate < processUpTo ? endDate : processUpTo;
  
  if (startDate > actualEndDate) {
    return dates; // No dates to process
  }
  
  // Find the first occurrence of the day of week on or after startDate
  let currentDate = new Date(startDate);
  const startDayOfWeek = getDayOfWeek(currentDate);
  
  // Calculate days to add to reach the target day of week
  let daysToAdd = fixedBooking.dayOfWeek - startDayOfWeek;
  if (daysToAdd < 0) {
    daysToAdd += 7; // Next week
  }
  
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  
  // If we went past the start date, we're good. Otherwise, check if we're on the right day
  if (getDayOfWeek(currentDate) !== fixedBooking.dayOfWeek) {
    // Shouldn't happen, but just in case
    return dates;
  }
  
  // Generate all dates for this day of week between startDate and endDate
  while (currentDate <= actualEndDate) {
    if (isDateInRange(currentDate, startDate, fixedBooking.endDate)) {
      dates.push(new Date(currentDate));
    }
    // Move to next week (add 7 days)
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return dates;
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Only allow Club Owners and Super Admins to trigger this
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin =
      user.role === "admin" && user.adminType === "super_admin";
    const isClubOwner =
      user.role === "admin" && user.adminType === "club_owner";

    if (!isSuperAdmin && !isClubOwner) {
      return NextResponse.json(
        { error: "Unauthorized - Club Owner or Super Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameter for processing date (defaults to yesterday)
    const { searchParams } = new URL(request.url);
    const processUpToParam = searchParams.get("upTo");
    const processUpTo = processUpToParam
      ? new Date(processUpToParam)
      : new Date();
    
    // Default to yesterday to avoid processing today's bookings
    processUpTo.setDate(processUpTo.getDate() - 1);
    processUpTo.setHours(23, 59, 59, 999);

    // Fetch all ACTIVE fixed bookings
    const activeFixedBookings = await (prisma as any).fixedBooking.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
            locationId: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const fixedBooking of activeFixedBookings) {
      try {
        // Skip if location has no owner (can't create transaction)
        if (!fixedBooking.location.ownerId) {
          skippedCount++;
          continue;
        }

        // Get all dates where this fixed booking occurred
        const bookingDates = getFixedBookingDates(
          {
            dayOfWeek: fixedBooking.dayOfWeek,
            startDate: fixedBooking.startDate,
            endDate: fixedBooking.endDate,
          },
          processUpTo
        );

        // Calculate price
        const hours = calculateHours(fixedBooking.startTime, fixedBooking.endTime);
        const totalPrice = fixedBooking.court.pricePerHour * hours;

        // Process each date
        for (const bookingDate of bookingDates) {
          // Check if the time slot has finished (for overnight bookings, check end time)
          const now = new Date();
          const bookingDateTime = new Date(bookingDate);
          
          // Parse end time to check if it has passed
          const [endHour, endMin] = fixedBooking.endTime.split(":").map(Number);
          bookingDateTime.setHours(endHour, endMin, 0, 0);
          
          // For overnight bookings (end time < start time), end time is next day
          const [startHour] = fixedBooking.startTime.split(":").map(Number);
          if (endHour < startHour) {
            bookingDateTime.setDate(bookingDateTime.getDate() + 1);
          }
          
          // Only process if the booking time slot has finished
          if (bookingDateTime > now) {
            continue; // Skip future bookings or bookings that haven't finished yet
          }

          // Normalize date to start of day for transaction matching
          const transactionDate = new Date(bookingDate);
          transactionDate.setHours(0, 0, 0, 0);

          // Normalize booking date for booking record
          const normalizedBookingDate = new Date(bookingDate);
          normalizedBookingDate.setHours(0, 0, 0, 0);

          // Check if booking already exists for this fixed booking and date
          const existingBooking = await (prisma as any).booking.findFirst({
            where: {
              locationId: fixedBooking.locationId,
              courtId: fixedBooking.courtId,
              date: normalizedBookingDate,
              startTime: fixedBooking.startTime,
              endTime: fixedBooking.endTime,
              status: { not: "cancelled" },
            },
          });

          // Check if transaction already exists for this fixed booking and date
          const existingTransaction = await (prisma as any).financialTransaction.findFirst({
            where: {
              locationId: fixedBooking.locationId,
              courtId: fixedBooking.courtId,
              type: "income",
              source: "fixed_booking",
              transactionDate: transactionDate,
              description: {
                contains: `Fixed booking: ${fixedBooking.court.name}`,
              },
            },
          });

          if (existingBooking && existingTransaction) {
            skippedCount++;
            continue; // Already processed
          }

          // Determine userId for the booking
          // If fixed booking has a userId, use it; otherwise use the creator (owner/moderator)
          const bookingUserId = fixedBooking.userId || fixedBooking.createdById;

          // Create booking record if it doesn't exist
          if (!existingBooking) {
            await (prisma as any).booking.create({
              data: {
                userId: bookingUserId,
                locationId: fixedBooking.locationId,
                courtId: fixedBooking.courtId,
                date: normalizedBookingDate,
                startTime: fixedBooking.startTime,
                endTime: fixedBooking.endTime,
                totalPrice: totalPrice,
                status: "confirmed", // Fixed bookings are automatically confirmed
                category: fixedBooking.category || "regular", // Use fixed booking's category, default to regular
              },
            });
          }

          // Create income transaction if it doesn't exist
          if (!existingTransaction) {
            await (prisma as any).financialTransaction.create({
              data: {
                locationId: fixedBooking.locationId,
                courtId: fixedBooking.courtId,
                amount: totalPrice,
                type: "income",
                source: "fixed_booking",
                description: `Fixed booking: ${fixedBooking.court.name} - ${transactionDate.toISOString().split("T")[0]} ${fixedBooking.startTime}-${fixedBooking.endTime} (${hours} hour${hours !== 1 ? "s" : ""})`,
                transactionDate: transactionDate,
                createdById: fixedBooking.location.ownerId,
                status: "approved", // Auto-approved for fixed bookings
              },
            });
          }

          processedCount++;
        }
      } catch (error: any) {
        errorCount++;
        errors.push(
          `Failed to process fixed booking ${fixedBooking.id}: ${error.message}`
        );
        console.error(
          `Error processing fixed booking ${fixedBooking.id}:`,
          error
        );
      }
    }

    return NextResponse.json({
      message: "Fixed booking income processing completed",
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      processedUpTo: processUpTo.toISOString().split("T")[0],
      note: "Bookings and income transactions have been created for completed fixed booking periods",
    });
  } catch (error: any) {
    console.error("Error processing fixed booking income:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process fixed booking income" },
      { status: 500 }
    );
  }
}
