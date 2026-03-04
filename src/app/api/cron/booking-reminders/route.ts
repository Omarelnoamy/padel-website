import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/booking-reminders
 *
 * This endpoint runs every hour at :00 (e.g., 00:00, 01:00, 10:00)
 * to check for bookings and send TWO types of reminder notifications:
 * 1. Booking reminder: 1 hour before the booking starts
 * 2. Cancellation deadline reminder: (cancellationHours + 1) hours before booking
 *    This gives users 1 hour to cancel before the cancellation deadline
 *
 * Can be triggered by:
 * - Vercel Cron Jobs (if deployed on Vercel) - scheduled every hour at :00
 * - External cron service (cron-job.org, EasyCron, etc.) - set to run at :00 each hour
 * - Manual API call for testing
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization for cron endpoint
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Only require auth if CRON_SECRET is explicitly set and not empty
    if (cronSecret && cronSecret.trim() !== "") {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    const currentMinute = now.getMinutes();

    // Only run at exact hour times (:00) - skip if called at :30, :45, etc.
    // Allow a small window of 0-2 minutes for timing variations
    if (currentMinute > 2) {
      return NextResponse.json({
        success: true,
        message:
          "Skipped - not running at exact hour. Cron should run at :00 each hour.",
        currentTime: now.toISOString(),
        currentMinute,
      });
    }

    // Get bookings for the next 7 days (to cover all possible reminders)
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["confirmed", "pending"] }, // Only confirmed or pending bookings
        date: {
          gte: today,
          lt: sevenDaysLater,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            cancellationHours: true, // Include cancellation hours from location
          },
        },
      },
    });

    const bookingRemindersCreated = [];
    const cancellationRemindersCreated = [];

    for (const booking of upcomingBookings) {
      // Calculate booking start time
      const bookingDate = new Date(booking.date);
      const [startHour, startMinute] = booking.startTime.split(":").map(Number);

      // Handle overnight slots (0-5) - they're on the next day
      if (startHour <= 5) {
        bookingDate.setDate(bookingDate.getDate() + 1);
      }

      bookingDate.setHours(startHour, startMinute, 0, 0);

      // Calculate hours until booking
      const hoursUntilBooking =
        (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get cancellation hours from location (default to 4 if not set)
      const cancellationHours = booking.location.cancellationHours ?? 4;
      const cancellationDeadlineHours = cancellationHours + 1; // Remind 1 hour before deadline

      // Check if we need to send booking reminder (1 hour before)
      if (hoursUntilBooking >= 0.98 && hoursUntilBooking <= 1.02) {
        // Check if booking reminder already exists
        const existingBookingReminders = await prisma.notification.findMany({
          where: {
            userId: booking.userId,
            type: "booking_reminder",
          },
        });

        const existingBookingReminder = existingBookingReminders.find(
          (notif) => {
            const metadata = notif.metadata as any;
            return (
              metadata?.bookingId === booking.id &&
              metadata?.reminderType === "booking"
            );
          }
        );

        if (!existingBookingReminder) {
          const minutesUntil = Math.round(hoursUntilBooking * 60);
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              title: "Booking Reminder",
              message: `Your booking at ${booking.location.name} - ${booking.court.name} starts in ${minutesUntil} minutes (${booking.startTime} - ${booking.endTime})`,
              type: "booking_reminder",
              metadata: {
                bookingId: booking.id,
                locationId: booking.locationId,
                courtId: booking.courtId,
                startTime: booking.startTime,
                endTime: booking.endTime,
                date: booking.date.toISOString(),
                reminderType: "booking", // Distinguish from cancellation reminder
              },
            },
          });

          bookingRemindersCreated.push({
            bookingId: booking.id,
            userId: booking.userId,
            userName: booking.user.name || booking.user.email,
            reminderType: "booking",
          });
        }
      }

      // Check if we need to send cancellation deadline reminder
      // Send reminder (cancellationHours + 1) hours before booking
      if (
        hoursUntilBooking >= cancellationDeadlineHours - 0.02 &&
        hoursUntilBooking <= cancellationDeadlineHours + 0.02
      ) {
        // Check if cancellation reminder already exists
        const existingCancellationReminders =
          await prisma.notification.findMany({
            where: {
              userId: booking.userId,
              type: "booking_reminder",
            },
          });

        const existingCancellationReminder = existingCancellationReminders.find(
          (notif) => {
            const metadata = notif.metadata as any;
            return (
              metadata?.bookingId === booking.id &&
              metadata?.reminderType === "cancellation_deadline"
            );
          }
        );

        if (!existingCancellationReminder) {
          const hoursUntilDeadline = cancellationHours;
          const deadlineTime = new Date(bookingDate);
          deadlineTime.setHours(
            deadlineTime.getHours() - cancellationHours,
            0,
            0,
            0
          );

          await prisma.notification.create({
            data: {
              userId: booking.userId,
              title: "Last Chance to Cancel",
              message: `You have ${hoursUntilDeadline} hour${
                hoursUntilDeadline !== 1 ? "s" : ""
              } left to cancel your booking at ${booking.location.name} - ${
                booking.court.name
              } (${booking.startTime} - ${
                booking.endTime
              }). After ${deadlineTime.getHours()}:${deadlineTime
                .getMinutes()
                .toString()
                .padStart(2, "0")}, cancellation will not be allowed.`,
              type: "booking_reminder",
              metadata: {
                bookingId: booking.id,
                locationId: booking.locationId,
                courtId: booking.courtId,
                startTime: booking.startTime,
                endTime: booking.endTime,
                date: booking.date.toISOString(),
                reminderType: "cancellation_deadline",
                cancellationHours,
                deadlineTime: deadlineTime.toISOString(),
              },
            },
          });

          cancellationRemindersCreated.push({
            bookingId: booking.id,
            userId: booking.userId,
            userName: booking.user.name || booking.user.email,
            reminderType: "cancellation_deadline",
            cancellationHours,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${bookingRemindersCreated.length} booking reminder(s) and ${cancellationRemindersCreated.length} cancellation deadline reminder(s)`,
      bookingRemindersCreated,
      cancellationRemindersCreated,
      totalBookings: upcomingBookings.length,
      currentTime: now.toISOString(),
    });
  } catch (error) {
    console.error("Error creating booking reminders:", error);
    return NextResponse.json(
      { error: "Failed to create booking reminders" },
      { status: 500 }
    );
  }
}

// GET endpoint for testing (shows what would be notified)
export async function GET() {
  try {
    const now = new Date();
    const currentMinute = now.getMinutes();

    // Only show results if called at exact hour or allow manual testing
    const isExactHour = currentMinute <= 2;

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["confirmed", "pending"] },
        date: {
          gte: today,
          lt: sevenDaysLater,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            cancellationHours: true,
          },
        },
      },
    });

    const bookingRemindersToSend = [];
    const cancellationRemindersToSend = [];

    for (const booking of upcomingBookings) {
      const bookingDate = new Date(booking.date);
      const [startHour, startMinute] = booking.startTime.split(":").map(Number);

      if (startHour <= 5) {
        bookingDate.setDate(bookingDate.getDate() + 1);
      }

      bookingDate.setHours(startHour, startMinute, 0, 0);
      const hoursUntilBooking =
        (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      const cancellationHours = booking.location.cancellationHours ?? 4;
      const cancellationDeadlineHours = cancellationHours + 1;

      // Check booking reminder (1 hour before)
      if (hoursUntilBooking >= 0.98 && hoursUntilBooking <= 1.02) {
        bookingRemindersToSend.push({
          id: booking.id,
          userId: booking.userId,
          userName: booking.user.name || booking.user.email,
          location: booking.location.name,
          court: booking.court.name,
          startTime: booking.startTime,
          endTime: booking.endTime,
          hoursUntilBooking: hoursUntilBooking.toFixed(2),
          reminderType: "booking",
        });
      }

      // Check cancellation reminder ((cancellationHours + 1) hours before)
      if (
        hoursUntilBooking >= cancellationDeadlineHours - 0.02 &&
        hoursUntilBooking <= cancellationDeadlineHours + 0.02
      ) {
        cancellationRemindersToSend.push({
          id: booking.id,
          userId: booking.userId,
          userName: booking.user.name || booking.user.email,
          location: booking.location.name,
          court: booking.court.name,
          startTime: booking.startTime,
          endTime: booking.endTime,
          hoursUntilBooking: hoursUntilBooking.toFixed(2),
          cancellationHours,
          reminderType: "cancellation_deadline",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: isExactHour
        ? `Would send ${bookingRemindersToSend.length} booking reminder(s) and ${cancellationRemindersToSend.length} cancellation deadline reminder(s)`
        : "Note: Cron should run at exact hour (:00). Current minute: " +
          currentMinute,
      bookingRemindersToSend,
      cancellationRemindersToSend,
      totalBookings: upcomingBookings.length,
      currentTime: now.toISOString(),
      currentMinute,
    });
  } catch (error) {
    console.error("Error checking booking reminders:", error);
    return NextResponse.json(
      { error: "Failed to check booking reminders" },
      { status: 500 }
    );
  }
}
