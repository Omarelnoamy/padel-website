import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";
import {
  getLocationOperatingMinutes,
  isWithinOperatingWindow,
} from "@/lib/operating-hours";

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string; role?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    const whereClause: any = { userId: session.user.id };

    // If date is provided, filter by that calendar day (UTC range)
    if (dateParam) {
      const trimmed = String(dateParam).trim();
      const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        const yNum = Number(y);
        const mNum = Number(m) - 1;
        const dNum = Number(d);
        const dayStart = new Date(Date.UTC(yNum, mNum, dNum, 0, 0, 0, 0));
        const dayEnd = new Date(Date.UTC(yNum, mNum, dNum + 1, 0, 0, 0, 0));
        whereClause.date = {
          gte: dayStart,
          lt: dayEnd,
        };
      }
      // Don't filter out cancelled bookings - return all bookings
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: {
          include: {
            location: true,
          },
        },
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require approved user
    const user = await requireApprovedUser().catch((error) => {
      return null;
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string; role?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use user.id from requireApprovedUser for consistency
    const userId = user.id;

    const data = await request.json();

    // Validate required fields
    if (
      !data.courtId ||
      !data.locationId ||
      !data.date ||
      !data.startTime ||
      !data.endTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate input formats
    if (!/^[a-zA-Z0-9_-]+$/.test(data.locationId)) {
      return NextResponse.json(
        { error: "Invalid locationId format" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(data.courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):00$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      console.error("Time validation failed:", {
        startTime: data.startTime,
        endTime: data.endTime,
        startTimeMatch: timeRegex.test(data.startTime),
        endTimeMatch: timeRegex.test(data.endTime),
      });
      return NextResponse.json(
        {
          error: `Invalid time format. Use HH:00. Received: startTime="${data.startTime}", endTime="${data.endTime}"`,
        },
        { status: 400 }
      );
    }

    // Check user roles for permissions
    const sessionUser = session.user as any;
    const isAdmin = sessionUser.role === "admin";
    const isClubOwner =
      sessionUser.role === "club_owner" ||
      (sessionUser.role === "admin" && sessionUser.adminType === "club_owner");
    const isModerator =
      sessionUser.role === "admin" && sessionUser.adminType === "moderator";
    const isOwnerPartner =
      sessionUser.role === "admin" && sessionUser.adminType === "owner_partner";
    const isClubAdmin =
      sessionUser.role === "user" && sessionUser.userType === "club_admin";

    // Get club admin's assigned location (if club admin)
    let clubAdminLocationId: string | null = null;
    if (isClubAdmin) {
      // Find the notification that was sent when this club admin was approved
      // The notification metadata contains the locationId assigned to this club admin
      const approvalNotifications = await prisma.notification.findMany({
        where: {
          type: "admin_approval",
        },
        orderBy: { createdAt: "desc" },
      });

      // Find the notification where pendingUserId matches this user and userType is club_admin
      for (const notification of approvalNotifications) {
        if (notification.metadata) {
          const metadata = notification.metadata as any;
          // Compare user IDs (handle both string and object ID types)
          const metadataPendingUserId =
            metadata.pendingUserId?.toString() || metadata.pendingUserId;
          const currentUserId = userId?.toString() || userId;

          if (
            metadataPendingUserId &&
            currentUserId &&
            metadataPendingUserId === currentUserId &&
            metadata.userType === "club_admin" &&
            metadata.locationId
          ) {
            clubAdminLocationId =
              metadata.locationId?.toString() || metadata.locationId;
            break;
          }
        }
      }
    }

    // Owner partner is read-only - cannot create bookings
    if (isOwnerPartner) {
      return NextResponse.json(
        { error: "Unauthorized - Read-only access. Cannot create bookings." },
        { status: 403 }
      );
    }

    console.log(
      "Booking request - User role:",
      user.role,
      "AdminType:",
      user.adminType,
      "IsClubOwner:",
      isClubOwner
    );
    console.log("Booking request - Category in data:", data.category);

    // Handle category: club owners and moderators can set it, others default to "regular"
    // Always validate category if provided (security: prevent invalid categories)
    let category = "regular"; // Default for all users
    const canSetCategory = isClubOwner || isModerator || isAdmin;

    if (
      data.category &&
      data.category !== "undefined" &&
      data.category !== ""
    ) {
      const providedCategory = String(data.category).toLowerCase().trim();
      if (!["regular", "academy", "tournament"].includes(providedCategory)) {
        return NextResponse.json(
          {
            error: "Invalid category. Must be: regular, academy, or tournament",
          },
          { status: 400 }
        );
      }
      // Only use provided category if user can set it
      if (canSetCategory) {
        category = providedCategory;
      }
      // If user can't set category but provided one, ignore it (use default)
    }

    // Use UTC midnight for the calendar date so availability and booking always match
    const bookingDate = new Date(data.date + "T00:00:00.000Z");

    // Calculate hours first
    const startHour = parseInt(data.startTime.split(":")[0]);
    const endHour = parseInt(data.endTime.split(":")[0]);
    // Handle overnight bookings (e.g., 22:00 to 00:00 = 2 hours)
    const hours =
      endHour < startHour ? 24 - startHour + endHour : endHour - startHour;

    // Ensure booking is within location operating hours
    const operatingLocation = await (prisma as any).location.findUnique({
      where: { id: data.locationId },
      select: {
        id: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!operatingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 400 }
      );
    }

    const { openingMinutes, closingMinutes } = getLocationOperatingMinutes(
      operatingLocation as any
    );

    const startMinutes = startHour * 60;
    const endMinutes = (endHour % 24) * 60; // 23:00 -> 00:00 wrap handled in helper

    const isInsideOperatingHours = isWithinOperatingWindow(
      startMinutes,
      endMinutes,
      openingMinutes,
      closingMinutes
    );

    if (!isInsideOperatingHours) {
      return NextResponse.json(
        {
          error:
            "Requested time is outside this location's operating hours. Please choose a valid time.",
        },
        { status: 400 }
      );
    }

    // Validate duration based on user role
    // Club admins only have unrestricted booking for their assigned location
    // Convert both to strings for comparison to handle type mismatches
    const requestLocationId = data.locationId?.toString() || data.locationId;
    const adminLocationId =
      clubAdminLocationId?.toString() || clubAdminLocationId;
    const hasUnrestrictedBooking =
      isAdmin ||
      isClubOwner ||
      isModerator ||
      (isClubAdmin &&
        adminLocationId &&
        requestLocationId &&
        adminLocationId === requestLocationId);

    // Debug logging for club admin bookings
    if (isClubAdmin) {
      console.log("Club Admin Booking Check:", {
        userId,
        clubAdminLocationId: adminLocationId,
        requestLocationId,
        matches: adminLocationId === requestLocationId,
        hasUnrestrictedBooking,
      });
    }

    // Users can now book at any time - no 4-hour advance booking restriction
    // However, they still cannot cancel within 4 hours (handled in cancel endpoint)
    if (!hasUnrestrictedBooking && hours > 2) {
      return NextResponse.json(
        { error: "Regular users can only book 1 or 2 hours per booking" },
        { status: 400 }
      );
    }

    // Users with unrestricted booking can book unlimited hours, regular users are limited to 1-2 hours
    if (!hasUnrestrictedBooking && (hours < 1 || hours > 2)) {
      return NextResponse.json(
        {
          error:
            "Booking duration must be between 1 and 2 hours for regular users",
        },
        { status: 400 }
      );
    }

    // Minimum 1 hour for regular users only (users with unrestricted booking have no restrictions)
    if (!hasUnrestrictedBooking && hours < 1) {
      return NextResponse.json(
        { error: "Booking duration must be at least 1 hour" },
        { status: 400 }
      );
    }

    // For regular users only, check total hours booked on the same day
    if (!hasUnrestrictedBooking) {
      const existingBookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
          date: bookingDate,
          status: { not: "cancelled" },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      // Calculate total hours already booked today
      let totalHoursBooked = 0;
      for (const booking of existingBookings) {
        const existingStart = parseInt(booking.startTime.split(":")[0]);
        const existingEnd = parseInt(booking.endTime.split(":")[0]);
        // Handle overnight bookings
        const bookingHours =
          existingEnd < existingStart
            ? 24 - existingStart + existingEnd
            : existingEnd - existingStart;
        totalHoursBooked += bookingHours;
      }

      // Check if adding this booking would exceed 2 hours per day limit
      if (totalHoursBooked + hours > 2) {
        const remainingHours = 2 - totalHoursBooked;
        return NextResponse.json(
          {
            error: `You have already booked ${totalHoursBooked} hour${
              totalHoursBooked !== 1 ? "s" : ""
            } today. Regular users can only book a maximum of 2 hours per day. You can book up to ${remainingHours} more hour${
              remainingHours !== 1 ? "s" : ""
            }.`,
          },
          { status: 400 }
        );
      }
    }

    // Get court to calculate price
    const court = await prisma.court.findUnique({
      where: { id: data.courtId },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Check for conflicts with fixed bookings FIRST
    // Fixed bookings take priority and block slots automatically
    const { checkFixedBookingConflict } = await import("@/lib/fixed-bookings");
    const fixedBookingConflict = await checkFixedBookingConflict(
      data.courtId,
      bookingDate,
      data.startTime,
      data.endTime
    );

    if (fixedBookingConflict) {
      return NextResponse.json(
        {
          error:
            "This time slot is reserved by a fixed booking. Please choose another time.",
        },
        { status: 400 }
      );
    }

    // Check if all time slots in the duration are available
    // We need to check for any overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        courtId: data.courtId,
        date: bookingDate,
        status: { not: "cancelled" },
      },
    });

    // Check for conflicts with existing bookings
    // Handle overnight bookings (e.g., 23:00-01:00)
    for (const booking of overlappingBookings) {
      const existingStart = parseInt(booking.startTime.split(":")[0]);
      const existingEnd = parseInt(booking.endTime.split(":")[0]);
      const isExistingOvernight = existingStart > existingEnd;
      const isNewOvernight = startHour > endHour;

      // Check if there's any overlap
      let hasOverlap = false;

      if (isExistingOvernight && isNewOvernight) {
        // Both are overnight - check if they overlap
        hasOverlap = !(endHour <= existingStart && startHour >= existingEnd);
      } else if (isExistingOvernight) {
        // Existing is overnight, new is not
        hasOverlap = startHour < existingEnd || endHour > existingStart;
      } else if (isNewOvernight) {
        // New is overnight, existing is not
        hasOverlap = existingStart < endHour || existingEnd > startHour;
      } else {
        // Neither is overnight - normal overlap check
        hasOverlap = startHour < existingEnd && endHour > existingStart;
      }

      if (hasOverlap) {
        return NextResponse.json(
          {
            error: `Time slot conflicts with existing booking (${booking.startTime} - ${booking.endTime})`,
          },
          { status: 400 }
        );
      }
    }

    // Additional validation: Ensure we're not trying to book in the past
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isToday = data.date === todayStr;
    const [y, m, d] = data.date.split("-").map(Number);
    const bookingDateTime = new Date(y, m - 1, d, startHour, 0, 0, 0);

    // Handle overnight slots (0-5): they're part of the same booking day that started at 8:00 AM
    if (startHour <= 5) {
      const currentHour = now.getHours();
      if (currentHour >= 8) {
        // Overnight slots are in the future
      } else if (currentHour <= 5 && isToday && startHour < currentHour) {
        return NextResponse.json(
          { error: "Cannot book time slots in the past" },
          { status: 400 }
        );
      }
    } else {
      if (isToday && bookingDateTime.getTime() < now.getTime()) {
        return NextResponse.json(
          { error: "Cannot book time slots in the past" },
          { status: 400 }
        );
      }
    }

    const totalPrice = court.pricePerHour * hours;

    // Create booking in a transaction to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check for overlapping bookings inside transaction
      const overlappingBookingsInTx = await tx.booking.findMany({
        where: {
          courtId: data.courtId,
          date: bookingDate,
          status: { not: "cancelled" },
        },
      });

      // Check for conflicts again (defensive check)
      for (const existingBooking of overlappingBookingsInTx) {
        const existingStart = parseInt(existingBooking.startTime.split(":")[0]);
        const existingEnd = parseInt(existingBooking.endTime.split(":")[0]);
        const isExistingOvernight = existingStart > existingEnd;
        const isNewOvernight = startHour > endHour;

        let hasOverlap = false;

        if (isExistingOvernight && isNewOvernight) {
          hasOverlap = !(endHour <= existingStart && startHour >= existingEnd);
        } else if (isExistingOvernight) {
          hasOverlap = startHour < existingEnd || endHour > existingStart;
        } else if (isNewOvernight) {
          hasOverlap = existingStart < endHour || existingEnd > startHour;
        } else {
          hasOverlap = startHour < existingEnd && endHour > existingStart;
        }

        if (hasOverlap) {
          throw new Error(
            `Time slot conflicts with existing booking (${existingBooking.startTime} - ${existingBooking.endTime})`
          );
        }
      }

      // Create booking
      const newBooking = await (tx as any).booking.create({
        data: {
          userId: userId,
          locationId: data.locationId,
          courtId: data.courtId,
          date: bookingDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalPrice,
          status: "confirmed",
          category, // regular, academy, or tournament (club owner only)
        },
        include: {
          court: {
            include: { location: true },
          },
        },
      });

      return newBooking;
    });

    console.log(
      "Booking created successfully with category:",
      booking.category
    );

    // Auto-create financial transaction for booking revenue
    // Only if location has an owner (club owner)
    const locationRecord = (await prisma.location.findUnique({
      where: { id: data.locationId },
    })) as any;

    if (locationRecord?.ownerId) {
      try {
        await (prisma as any).financialTransaction.create({
          data: {
            locationId: data.locationId,
            courtId: data.courtId,
            amount: totalPrice,
            type: "income",
            source: "booking",
            description: `Booking revenue: ${booking.court.name} - ${data.date} ${data.startTime}-${data.endTime}`,
            transactionDate: bookingDate, // Already normalized to start of day
            createdById: locationRecord.ownerId, // Use location owner, not booking user
          },
        });
      } catch (error) {
        console.error(
          "Error creating financial transaction for booking:",
          error
        );
        // Don't fail the booking creation if transaction creation fails
      }
    } else {
      console.warn(
        `Location ${data.locationId} does not have an ownerId. Transaction not created.`
      );
    }

    // Create reminder notification immediately if booking is less than 1 hour away
    // If more than 1 hour away, the cron job will send it exactly 1 hour before
    try {
      // Calculate booking start time
      const bookingStartTime = new Date(bookingDate);
      const [startHour, startMinute] = data.startTime.split(":").map(Number);
      if (startHour <= 5) {
        bookingStartTime.setDate(bookingStartTime.getDate() + 1);
      }
      bookingStartTime.setHours(startHour, startMinute, 0, 0);

      const now = new Date();
      const hoursUntilBooking =
        (bookingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const minutesUntil = Math.round(hoursUntilBooking * 60);

      // If booking starts in less than 1 hour, send notification immediately
      // If more than 1 hour away, the cron job will send it exactly 1 hour before
      if (hoursUntilBooking > 0 && hoursUntilBooking < 1) {
        // Check if reminder already exists
        const existingNotifications = await prisma.notification.findMany({
          where: {
            userId: session.user.id,
            type: "booking_reminder",
          },
        });

        const existingReminder = existingNotifications.find((notif) => {
          const metadata = notif.metadata as any;
          return metadata?.bookingId === booking.id;
        });

        if (!existingReminder) {
          await prisma.notification.create({
            data: {
              userId: session.user.id,
              title: "Booking Reminder",
              message: `Your booking at ${booking.court.location.name} - ${booking.court.name} starts in ${minutesUntil} minutes (${data.startTime} - ${data.endTime})`,
              type: "booking_reminder",
              metadata: {
                bookingId: booking.id,
                locationId: data.locationId,
                courtId: data.courtId,
                startTime: data.startTime,
                endTime: data.endTime,
                date: bookingDate.toISOString(),
              },
            },
          });
        }
      }
    } catch (reminderError) {
      // Don't fail booking creation if reminder creation fails
      console.error("Failed to create immediate reminder:", reminderError);
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    const errorMessage =
      error?.message || error?.error || "Failed to create booking";
    const isConflict =
      typeof errorMessage === "string" &&
      /conflict|already booked|reserved/i.test(errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: isConflict ? 409 : error?.status || 500 }
    );
  }
}
