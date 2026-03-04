import { prisma } from "@/lib/prisma";
import {
  getLocationOperatingMinutes,
} from "@/lib/operating-hours";

type ProcessingStatus = "processed" | "skipped" | "error";

export interface DailyProcessingResult {
  locationId: string;
  locationName: string;
  operationalDate: string;
  status: ProcessingStatus;
  message: string;
}

export interface RunDailyFinancialProcessingOptions {
  /**
   * Optional list of location IDs to restrict processing to.
   * If omitted, all locations are considered (cron behaviour).
   */
  locationIds?: string[];
  /**
   * Optional reference time. Defaults to current UTC time.
   */
  now?: Date;
}

/**
 * Core daily financial processing logic.
 *
 * This is shared between the cron endpoint and manual triggers (e.g. admin button),
 * and is safe to call multiple times thanks to the unique constraint on
 * (locationId, operationalDate).
 */
export async function runDailyFinancialProcessing(
  options: RunDailyFinancialProcessingOptions = {}
): Promise<{
  success: boolean;
  message: string;
  processedAt: string;
  results: DailyProcessingResult[];
}> {
  const nowUTC = options.now ?? new Date();
  const results: DailyProcessingResult[] = [];

  // Fetch locations with operating hours, optionally restricted by IDs
  const baseWhere: any = {
    OR: [{ openingTime: { not: null } }, { closingTime: { not: null } }],
  };

  if (options.locationIds && options.locationIds.length > 0) {
    baseWhere.id = { in: options.locationIds };
  }

  const locationsWithHours = await (prisma as any).location.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      openingTime: true,
      closingTime: true,
      ownerId: true,
    },
  });

  // If no locations have operating hours set, use default for all locations
  let allLocations = locationsWithHours;
  if (allLocations.length === 0) {
    const fallbackWhere: any = {};
    if (options.locationIds && options.locationIds.length > 0) {
      fallbackWhere.id = { in: options.locationIds };
    }

    allLocations = await (prisma as any).location.findMany({
      where: fallbackWhere,
      select: {
        id: true,
        name: true,
        openingTime: true,
        closingTime: true,
        ownerId: true,
      },
    });
  }

  // Helper: get day of week (0-6) from a Date object (UTC, to match operationalDate)
  function getUTCDayOfWeek(date: Date): number {
    return date.getUTCDay();
  }

  // Helper: calculate hours from startTime to endTime (handles overnight bookings)
  function calculateHours(startTime: string, endTime: string): number {
    const [startHour] = startTime.split(":").map(Number);
    const [endHour] = endTime.split(":").map(Number);
    return endHour < startHour ? 24 - startHour + endHour : endHour - startHour;
  }

  // Helper: check if a date is within a date range (inclusive), using UTC for consistency
  function isDateInRangeUTC(
    date: Date,
    startDate: Date,
    endDate: Date | null
  ): boolean {
    const dateOnly = new Date(date);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    if (!endDate) return dateOnly.getTime() >= start.getTime();

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    return dateOnly.getTime() >= start.getTime() && dateOnly.getTime() <= end.getTime();
  }

  // Helper: get all dates where a fixed booking should have occurred (UTC calendar dates)
  // Uses UTC so that "Wednesday" matches operationalDate (also UTC) regardless of server timezone.
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
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = fixedBooking.endDate
      ? new Date(fixedBooking.endDate)
      : new Date(operationalDate);
    endDate.setUTCHours(23, 59, 59, 999);

    const processUpTo = new Date(operationalDate);
    processUpTo.setUTCHours(23, 59, 59, 999);

    const actualEndDate = endDate.getTime() < processUpTo.getTime() ? endDate : processUpTo;

    if (startDate.getTime() > actualEndDate.getTime()) {
      return dates;
    }

    // Find the first occurrence of the day of week on or after startDate (UTC)
    let currentDate = new Date(startDate);
    const startDayOfWeek = getUTCDayOfWeek(currentDate);

    let daysToAdd = fixedBooking.dayOfWeek - startDayOfWeek;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + daysToAdd);
    currentDate.setUTCHours(0, 0, 0, 0);

    if (getUTCDayOfWeek(currentDate) !== fixedBooking.dayOfWeek) {
      return dates;
    }

    // Generate all dates for this day of week between startDate and actualEndDate
    while (currentDate.getTime() <= actualEndDate.getTime()) {
      if (isDateInRangeUTC(currentDate, startDate, fixedBooking.endDate)) {
        dates.push(new Date(currentDate.getTime()));
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    }

    return dates;
  }

  /**
   * Determine the operational end time for a given operational date
   * Returns the Date when the operational day ends (closing time)
   *
   * NOTE: This mirrors the existing cron logic; any behavioural changes
   * should be done centrally here so both cron and manual triggers stay in sync.
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

  /** Process fixed bookings for this operational day and update the DailyFinancialProcessing row totals. */
  async function processFixedBookingsAndUpdateTotals(
    tx: any,
    location: any,
    operationalDate: Date,
    processingRecordId: string
  ): Promise<void> {
    const activeFixedBookings = await (tx as any).fixedBooking.findMany({
      where: {
        status: "ACTIVE",
        locationId: location.id,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
          },
        },
      },
    });

    for (const fixedBooking of activeFixedBookings) {
      const bookingDates = getFixedBookingDates(
        {
          dayOfWeek: fixedBooking.dayOfWeek,
          startDate: fixedBooking.startDate,
          endDate: fixedBooking.endDate,
        },
        operationalDate
      );
      if (bookingDates.length === 0) continue;

      const operationalDateOnly = new Date(operationalDate);
      operationalDateOnly.setUTCHours(0, 0, 0, 0);
      const matchesOperationalDate = bookingDates.some((bd) => {
        const bdOnly = new Date(bd);
        bdOnly.setUTCHours(0, 0, 0, 0);
        return bdOnly.getTime() === operationalDateOnly.getTime();
      });
      if (!matchesOperationalDate) continue;

      const hours = calculateHours(
        fixedBooking.startTime,
        fixedBooking.endTime
      );
      const totalPrice = fixedBooking.court.pricePerHour * hours;
      const normalizedBookingDate = new Date(operationalDate);
      normalizedBookingDate.setUTCHours(0, 0, 0, 0);
      const transactionDate = new Date(operationalDate);
      transactionDate.setUTCHours(0, 0, 0, 0);

      const existingBooking = await (tx as any).booking.findFirst({
        where: {
          locationId: location.id,
          courtId: fixedBooking.courtId,
          date: normalizedBookingDate,
          startTime: fixedBooking.startTime,
          endTime: fixedBooking.endTime,
          status: { not: "cancelled" },
        },
      });
      const existingTransaction = await (tx as any).financialTransaction.findFirst(
        {
          where: {
            locationId: location.id,
            courtId: fixedBooking.courtId,
            type: "income",
            source: "fixed_booking",
            transactionDate: transactionDate,
            description: {
              contains: `Fixed booking: ${fixedBooking.court.name}`,
            },
          },
        }
      );
      const bookingUserId = fixedBooking.userId || fixedBooking.createdById;

      if (!existingBooking) {
        await (tx as any).booking.create({
          data: {
            userId: bookingUserId,
            locationId: location.id,
            courtId: fixedBooking.courtId,
            date: normalizedBookingDate,
            startTime: fixedBooking.startTime,
            endTime: fixedBooking.endTime,
            totalPrice: totalPrice,
            status: "confirmed",
            category: fixedBooking.category || "regular",
          },
        });
      }
      if (!existingTransaction) {
        await (tx as any).financialTransaction.create({
          data: {
            locationId: location.id,
            courtId: fixedBooking.courtId,
            amount: totalPrice,
            type: "income",
            source: "fixed_booking",
            description: `Fixed booking: ${fixedBooking.court.name} - ${
              transactionDate.toISOString().split("T")[0]
            } ${fixedBooking.startTime}-${fixedBooking.endTime} (${hours} hour${
              hours !== 1 ? "s" : ""
            })`,
            transactionDate: transactionDate,
            createdById: location.ownerId,
            status: "approved",
          },
        });
      }
    }

    const revenueResult = await (tx as any).financialTransaction.aggregate({
      where: {
        locationId: location.id,
        type: "income",
        transactionDate: {
          gte: new Date(operationalDate),
          lt: new Date(
            new Date(operationalDate).setUTCDate(
              operationalDate.getUTCDate() + 1
            )
          ),
        },
      },
      _sum: { amount: true },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    const bookingsOnDate = await (tx as any).booking.findMany({
      where: {
        locationId: location.id,
        date: {
          gte: new Date(operationalDate),
          lt: new Date(
            new Date(operationalDate).setUTCDate(
              operationalDate.getUTCDate() + 1
            )
          ),
        },
      },
      include: {
        bookingPayments: {
          select: { method: true, amount: true },
        },
      },
    });
    let totalCash = 0,
      totalVisa = 0,
      totalInstapay = 0,
      totalOnline = 0;
    for (const booking of bookingsOnDate) {
      for (const payment of booking.bookingPayments) {
        if (payment.method === "cash") totalCash += payment.amount;
        else if (payment.method === "visa") totalVisa += payment.amount;
        else if (payment.method === "instapay") totalInstapay += payment.amount;
        else if (payment.method === "online") totalOnline += payment.amount;
      }
    }

    await (tx as any).dailyFinancialProcessing.update({
      where: { id: processingRecordId },
      data: {
        totalRevenue,
        totalCash,
        totalVisa,
        totalInstapay,
        totalOnline,
      },
    });
  }

  for (const location of allLocations) {
    try {
      const { openingMinutes, closingMinutes, isOvernight } =
        getLocationOperatingMinutes(location);

      // Check the last 2 operational days to catch any missed days
      // (in case cron was down or missed a run)
      for (let daysBack = 0; daysBack <= 1; daysBack++) {
        // Calculate operational date (the day that "opened")
        let operationalDate = new Date(nowUTC);

        if (isOvernight) {
          const currentMinutes =
            nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();
          if (currentMinutes < closingMinutes) {
            // Early morning: operational day that just ended opened the previous day
            operationalDate.setUTCDate(
              operationalDate.getUTCDate() - daysBack - 1
            );
          } else {
            operationalDate.setUTCDate(
              operationalDate.getUTCDate() - daysBack
            );
          }
        } else {
          operationalDate.setUTCDate(operationalDate.getUTCDate() - daysBack);
        }

        operationalDate.setUTCHours(0, 0, 0, 0);

        // Calculate when this operational day ended
        const operationalEndTime = getOperationalEndTime(
          operationalDate,
          openingMinutes,
          closingMinutes
        );

        // Only process if the operational day has ended
        const buffer = 60 * 1000; // 1 minute in milliseconds
        if (nowUTC < new Date(operationalEndTime.getTime() + buffer)) {
          // Day hasn't ended yet (or just ended, wait a bit)
          continue;
        }

        // Check if already processed (or has a zero row we can backfill)
        const existing = await (prisma as any).dailyFinancialProcessing.findUnique(
          {
            where: {
              locationId_operationalDate: {
                locationId: location.id,
                operationalDate: operationalDate,
              },
            },
          }
        );

        if (existing) {
          // Backfill: row exists with zero revenue and location now has owner → run fixed bookings and update row
          if (existing.totalRevenue === 0 && location.ownerId) {
            await prisma.$transaction(async (tx) => {
              await processFixedBookingsAndUpdateTotals(
                tx,
                location,
                operationalDate,
                existing.id
              );
            });
            results.push({
              locationId: location.id,
              locationName: location.name,
              operationalDate: operationalDate.toISOString().split("T")[0],
              status: "processed",
              message: "Backfilled fixed bookings",
            });
          } else {
            results.push({
              locationId: location.id,
              locationName: location.name,
              operationalDate: operationalDate.toISOString().split("T")[0],
              status: "skipped",
              message: "Already processed",
            });
          }
          continue;
        }

        // Skip if location has no owner (can't create fixed-booking transactions).
        // Don't create a processing record so we can retry when an owner is set.
        if (!location.ownerId) {
          results.push({
            locationId: location.id,
            locationName: location.name,
            operationalDate: operationalDate.toISOString().split("T")[0],
            status: "skipped",
            message: "Location has no owner (set owner to process fixed bookings)",
          });
          continue;
        }

        // Process this operational day (create new row, then fixed bookings + totals)
        await prisma.$transaction(async (tx) => {
          // Try to create the processing record (will fail if duplicate due to unique constraint)
          let processingRecord;
          try {
            processingRecord = await (tx as any).dailyFinancialProcessing.create(
              {
                data: {
                  locationId: location.id,
                  operationalDate: operationalDate,
                  totalRevenue: 0,
                  totalCash: 0,
                  totalVisa: 0,
                  totalInstapay: 0,
                  totalOnline: 0,
                },
              }
            );
          } catch (error: any) {
            // Unique constraint violation = already processed by another cron run
            if (error.code === "P2002") {
              return; // Skip processing
            }
            throw error;
          }

          await processFixedBookingsAndUpdateTotals(
            tx,
            location,
            operationalDate,
            processingRecord.id
          );
        });

        results.push({
          locationId: location.id,
          locationName: location.name,
          operationalDate: operationalDate.toISOString().split("T")[0],
          status: "processed",
          message: "Successfully processed",
        });
        continue;
      }
    } catch (error: any) {
      results.push({
        locationId: location.id,
        locationName: location.name,
        operationalDate: "unknown",
        status: "error",
        message: error.message || "Unknown error",
      });
      console.error(`Error processing location ${location.id}:`, error);
    }
  }

  return {
    success: true,
    message: "Daily financial processing completed",
    processedAt: nowUTC.toISOString(),
    results,
  };
}

