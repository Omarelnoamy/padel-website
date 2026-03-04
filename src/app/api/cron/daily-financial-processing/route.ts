/**
 * GET /api/cron/daily-financial-processing
 * 
 * Automated daily financial processing endpoint.
 * Runs every 10 minutes to check if any location's operational day has ended.
 * 
 * Logic:
 * - For each location with openingTime/closingTime:
 *   - Check if the operational day has ended (based on closingTime)
 *   - If yes, check if that day was already processed
 *   - If not processed → process fixed bookings and create DailyFinancialProcessing record
 * 
 * Security:
 * - Protected by CRON_SECRET environment variable
 * 
 * Idempotency:
 * - Uses unique constraint (locationId + operationalDate) to prevent duplicate processing
 * - Safe to run multiple times
 */

import { NextRequest, NextResponse } from "next/server";
import { runDailyFinancialProcessing } from "@/lib/daily-financial-processing";

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
 * Check if a date is within a date range (inclusive)
 */
function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date | null
): boolean {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  if (!endDate) return dateOnly >= start;
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return dateOnly >= start && dateOnly <= end;
}

/**
 * Get all dates where a fixed booking should have occurred
 */
function getFixedBookingDates(
  fixedBooking: {
    dayOfWeek: number;
    startDate: Date;
    endDate: Date | null;
  },
  operationalDate: Date
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(fixedBooking.startDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = fixedBooking.endDate
    ? new Date(fixedBooking.endDate)
    : operationalDate;
  endDate.setHours(23, 59, 59, 999);
  
  const processUpTo = new Date(operationalDate);
  processUpTo.setHours(23, 59, 59, 999);
  
  const actualEndDate = endDate < processUpTo ? endDate : processUpTo;
  
  if (startDate > actualEndDate) {
    return dates;
  }
  
  // Find the first occurrence of the day of week on or after startDate
  let currentDate = new Date(startDate);
  const startDayOfWeek = getDayOfWeek(currentDate);
  
  let daysToAdd = fixedBooking.dayOfWeek - startDayOfWeek;
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  
  if (getDayOfWeek(currentDate) !== fixedBooking.dayOfWeek) {
    return dates;
  }
  
  // Generate all dates for this day of week between startDate and endDate
  while (currentDate <= actualEndDate) {
    if (isDateInRange(currentDate, startDate, fixedBooking.endDate)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return dates;
}

/**
 * Determine the operational end time for a given operational date
 * Returns the Date when the operational day ends (closing time)
 */
function getOperationalEndTime(
  operationalDate: Date,
  openingMinutes: number,
  closingMinutes: number
): Date {
  const isOvernight = closingMinutes < openingMinutes;
  const endTime = new Date(operationalDate);
  endTime.setHours(0, 0, 0, 0);
  
  if (isOvernight) {
    // Overnight: closing time is on the next calendar day
    endTime.setDate(endTime.getDate() + 1);
    endTime.setMinutes(closingMinutes);
  } else {
    // Same-day: closing time is on the same calendar day
    endTime.setMinutes(closingMinutes);
  }
  
  return endTime;
}

export async function GET(request: NextRequest) {
  try {
    // Security: Check CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && cronSecret.trim() !== "") {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await runDailyFinancialProcessing();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in daily financial processing cron:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process daily financials",
      },
      { status: 500 }
    );
  }
}
