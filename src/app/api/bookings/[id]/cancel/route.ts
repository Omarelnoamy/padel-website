import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string; role?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          include: { location: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if the booking belongs to the user
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized - This booking does not belong to you" },
        { status: 403 }
      );
    }

    // Check if booking is already cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    // Check user roles for cancellation permissions
    const user = session.user as any;
    const isAdmin = user.role === "admin";
    const isClubOwner =
      user.role === "club_owner" ||
      (user.role === "admin" && user.adminType === "club_owner");
    const isModerator = user.role === "admin" && user.adminType === "moderator";
    const isOwnerPartner =
      user.role === "admin" && user.adminType === "owner_partner";
    const isClubAdmin = user.role === "user" && user.userType === "club_admin";

    // Owner partner is read-only - cannot cancel bookings
    if (isOwnerPartner) {
      return NextResponse.json(
        { error: "Unauthorized - Read-only access. Cannot cancel bookings." },
        { status: 403 }
      );
    }

    // Users with unrestricted access can cancel at any time
    const hasUnrestrictedAccess =
      isAdmin || isClubOwner || isModerator || isClubAdmin;

    // Get cancellation hours from location (default to 4 if not set)
    const cancellationHours =
      (booking.court.location as any)?.cancellationHours ?? 4;

    // Validate cancellation rule based on location settings (only for regular users, not users with unrestricted access)
    if (!hasUnrestrictedAccess) {
      const now = new Date();
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);
      const currentDate = new Date(now);
      currentDate.setHours(0, 0, 0, 0);
      const isToday = bookingDate.getTime() === currentDate.getTime();

      if (isToday) {
        const bookingStartDateTime = new Date(now);
        const currentHour = now.getHours();
        const startHour = parseInt(booking.startTime.split(":")[0]);

        // Handle overnight slots (0-5) - they're on the next day
        if (startHour <= 5) {
          // If current hour is 8-23, overnight slots (0-5) are tomorrow, so they're more than cancellationHours away
          if (currentHour >= 8) {
            bookingStartDateTime.setDate(bookingStartDateTime.getDate() + 1);
            bookingStartDateTime.setHours(startHour, 0, 0, 0);
            // Overnight slots are always cancellable when current hour is 8-23
          } else {
            // If current hour is 0-5, check if booking is at least cancellationHours away
            // If slot hour is after current hour on same day, it's today
            if (startHour > currentHour) {
              bookingStartDateTime.setHours(startHour, 0, 0, 0);
            } else {
              // Slot is tomorrow
              bookingStartDateTime.setDate(bookingStartDateTime.getDate() + 1);
              bookingStartDateTime.setHours(startHour, 0, 0, 0);
            }
            const hoursUntilBooking =
              (bookingStartDateTime.getTime() - now.getTime()) /
              (1000 * 60 * 60);
            if (hoursUntilBooking < cancellationHours) {
              return NextResponse.json(
                {
                  error: `Bookings can only be cancelled if they are at least ${cancellationHours} hour${
                    cancellationHours !== 1 ? "s" : ""
                  } in the future`,
                },
                { status: 400 }
              );
            }
          }
        } else {
          // Regular slots (8-23) on the same day
          bookingStartDateTime.setHours(startHour, 0, 0, 0);
          const hoursUntilBooking =
            (bookingStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          // If slot is in the past or less than cancellationHours away, cannot cancel
          if (hoursUntilBooking < cancellationHours) {
            return NextResponse.json(
              {
                error: `Bookings can only be cancelled if they are at least ${cancellationHours} hour${
                  cancellationHours !== 1 ? "s" : ""
                } in the future`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Cancel the booking
    // Set cancelledByUserId: if user cancels their own booking, set to null (self-cancelled)
    // If admin/club owner cancels, set to their ID
    const isSelfCancellation = booking.userId === session.user.id;
    const cancelledBooking = await (prisma as any).booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        cancelledByUserId: isSelfCancellation ? null : session.user.id,
      },
      include: {
        court: {
          include: { location: true },
        },
      },
    });

    // Remove booking revenue from income (create negative income transaction)
    // Only if location has an owner (club owner) and booking was confirmed
    if (booking.status === "confirmed") {
      const location = booking.court.location as any;

      if (location?.ownerId) {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);

        // Check if negative transaction already exists (prevent duplicates)
        const existingNegative = await (
          prisma as any
        ).financialTransaction.findFirst({
          where: {
            locationId: booking.locationId,
            courtId: booking.courtId,
            type: "income",
            source: "booking",
            amount: -booking.totalPrice, // Negative amount
            transactionDate: bookingDate,
            AND: [
              { description: { contains: "Booking cancellation" } },
              { description: { contains: booking.startTime } },
              { description: { contains: booking.endTime } },
            ],
          },
        });

        // Only create if it doesn't exist
        if (!existingNegative) {
          await (prisma as any).financialTransaction.create({
            data: {
              locationId: booking.locationId,
              courtId: booking.courtId,
              amount: -booking.totalPrice, // Negative amount to subtract from income
              type: "income", // Keep as income (negative) not expense
              source: "booking",
              description: `Booking cancellation: ${booking.court.name} - ${
                new Date(booking.date).toISOString().split("T")[0]
              } ${booking.startTime}-${booking.endTime}`,
              transactionDate: bookingDate, // Use booking date to match original transaction
              createdById: location.ownerId,
            },
          });
        }
      }
    }

    return NextResponse.json(cancelledBooking);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
