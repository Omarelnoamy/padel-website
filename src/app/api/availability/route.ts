import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getLocationOperatingMinutes,
  getSlotDateForOperationalDay,
  isWithinOperatingWindow,
} from "@/lib/operating-hours";

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string; role?: string };
    } | null;

    const isAdmin = (session?.user as any)?.role === "admin";

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    const date = searchParams.get("date");
    // Optional: client sends current time (ISO string) for exact "now" in user's timezone
    const clientNowParam = searchParams.get("now");

    if (!locationId || !date) {
      return NextResponse.json(
        { error: "Missing required parameters: locationId and date" },
        { status: 400 }
      );
    }

    // Parse date as calendar day (YYYY-MM-DD)
    const dateMatch = String(date).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      return NextResponse.json(
        { error: "Invalid date format; use YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const [, y, m, d] = dateMatch;
    const yNum = Number(y);
    const mNum = Number(m) - 1;
    const dNum = Number(d);
    // Local midnight for slot/past logic (server TZ)
    const bookingDate = new Date(yNum, mNum, dNum, 0, 0, 0, 0);
    // UTC midnight for DB query (bookings are stored as date-only / UTC)
    const bookingDateForDb = new Date(Date.UTC(yNum, mNum, dNum, 0, 0, 0, 0));

    // Get location with operating hours (openingTime/closingTime from DB; null = use 24h default)
    const location = await (prisma as any).location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const { openingMinutes, closingMinutes } = getLocationOperatingMinutes(location as any);

    // Get all bookings for this operational date (use UTC date to match DB storage)
    const bookings = await prisma.booking.findMany({
      where: {
        locationId,
        date: bookingDateForDb,
        status: { not: "cancelled" },
      },
      select: {
        courtId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Get all fixed bookings that block slots on this date
    const { getFixedBookingsForDate } = await import("@/lib/fixed-bookings");
    const fixedBookingsByCourt: Record<string, Array<{
      startTime: string;
      endTime: string;
      userId: string | null;
      createdById: string;
      notes: string | null;
    }>> = {};
    
    // Get all courts for this location first
    const courts = await prisma.court.findMany({
      where: { locationId },
    });

        // Check fixed bookings for each court
        for (const court of courts) {
          const fixedBookings = await getFixedBookingsForDate(court.id, bookingDate);
          if (fixedBookings.length > 0) {
            fixedBookingsByCourt[court.id] = fixedBookings.map(fb => ({
              startTime: fb.startTime,
              endTime: fb.endTime,
              userId: fb.userId,
              createdById: fb.createdById,
              notes: fb.notes,
            }));
          }
        }

    // Courts already fetched above

    // Generate time slots for full day: 00:00 to 23:00
    const timeSlots: {
      courtId: string;
      courtName: string;
      time: string;
      available: boolean;
      reason?: string; // "booked", "past", "reserved", or "closed"
      fixedBookingInfo?: {
        userId: string | null;
        createdById: string;
        notes: string | null;
      };
    }[] = [];

    const hours: number[] = [];
    for (let h = 0; h < 24; h++) {
      hours.push(h);
    }

    // Use client "now" when provided (user's device time) for exact past check; otherwise server time
    const now = clientNowParam
      ? (() => {
          const parsed = new Date(clientNowParam);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        })()
      : new Date();

    hours.forEach((hour) => {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      const slotStartMinutes = hour * 60;
      const slotEndMinutes = ((hour + 1) % 24) * 60;

      const isInsideOperatingHours = isWithinOperatingWindow(
        slotStartMinutes,
        slotEndMinutes,
        openingMinutes,
        closingMinutes
      );
      courts.forEach((court) => {
        // Check if slot is blocked by a fixed booking
        const fixedBookings = fixedBookingsByCourt[court.id] || [];
        const blockingFixedBooking = fixedBookings.find((fb) => {
          const [fbStartHour, fbStartMin] = fb.startTime.split(":").map(Number);
          const [fbEndHour, fbEndMin] = fb.endTime.split(":").map(Number);
          const fbStartMinutes = fbStartHour * 60 + fbStartMin;
          const fbEndMinutes = fbEndHour * 60 + fbEndMin;
          const slotMinutes = hour * 60;

          // Check if slot hour falls within fixed booking range
          // Handle overnight bookings
          if (fbEndMinutes < fbStartMinutes) {
            // Overnight fixed booking (e.g., 22:00 to 02:00)
            return (
              slotMinutes >= fbStartMinutes || slotMinutes < fbEndMinutes
            );
          } else {
            // Regular fixed booking
            return slotMinutes >= fbStartMinutes && slotMinutes < fbEndMinutes;
          }
        });
        const isBlockedByFixed = !!blockingFixedBooking;

        const isBooked = bookings.some((b) => {
          if (b.courtId !== court.id) return false;

          const bookingStart = parseInt(b.startTime.split(":")[0]);
          const bookingEnd = parseInt(b.endTime.split(":")[0]);
          const slotHour = hour;

          // Handle overnight bookings (e.g., 22:00 to 00:00)
          const isOvernightBooking = bookingEnd < bookingStart;

          if (isOvernightBooking) {
            // Booking spans midnight (e.g., 22:00 to 00:00)
            // Slot is booked if it's >= start OR < end
            // For 22:00-00:00: slots 22, 23, 0 are booked
            return slotHour >= bookingStart || slotHour < bookingEnd;
          } else {
            // Regular booking (e.g., 10:00 to 12:00)
            // Slot is booked if it's >= start AND < end
            return slotHour >= bookingStart && slotHour < bookingEnd;
          }
        });

        // Past = slot start time is strictly before "now" (exact current time)
        let isPast = false;
        if (isInsideOperatingHours) {
          const slotDate = getSlotDateForOperationalDay(
            bookingDate,
            hour,
            openingMinutes,
            closingMinutes,
            now
          );
          const slotTime = slotDate.getTime();
          const currentTime = now.getTime();
          if (slotTime < currentTime) {
            isPast = true;
          }
        }

        // Determine reason if unavailable
        let reason: string | undefined;
        let fixedBookingInfo: {
          userId: string | null;
          createdById: string;
          notes: string | null;
        } | undefined;
        
        if (!isInsideOperatingHours) {
          reason = "closed";
        } else if (isBlockedByFixed) {
          reason = "reserved"; // Reserved by fixed booking
          fixedBookingInfo = blockingFixedBooking
            ? {
                userId: blockingFixedBooking.userId,
                createdById: blockingFixedBooking.createdById,
                notes: blockingFixedBooking.notes,
              }
            : undefined;
        } else if (isBooked) {
          reason = "booked";
        } else if (isPast) {
          reason = "past";
        }

        timeSlots.push({
          courtId: court.id,
          courtName: court.name,
          time,
          available:
            isInsideOperatingHours && !isBlockedByFixed && !isBooked && !isPast,
          reason,
          fixedBookingInfo,
        });
      });
    });

    const response = NextResponse.json(timeSlots);
    // Prevent caching to ensure fresh availability data
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}
