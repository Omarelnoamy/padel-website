import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, isLocationOwner } from "@/lib/club-owner-auth";
import {
  canModifyBookings,
  isOwnerPartner,
  isModerator,
  getCurrentUser,
  requireApprovedUser,
} from "@/lib/rbac";

/**
 * PATCH /api/club-owner/bookings/[id]
 * Update a booking (club owner can modify any booking in their locations)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can modify bookings (not owner partner - read-only)
    const canModify = await canModifyBookings();
    if (!canModify) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = await requireClubOwner().catch(async () => {
      // If not club owner, check if moderator
      if (await isModerator()) {
        const user = await getCurrentUser();
        return user?.id || null;
      }
      return null;
    });

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get booking to check ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true, court: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check location ownership
    const isOwner = await isLocationOwner(booking.locationId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "You don't own this location" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { date, startTime, endTime, status, userId: bookingUserId } = data;

    // Calculate new price if time changed
    let totalPrice = booking.totalPrice;
    if (startTime && endTime) {
      const startHour = parseInt(startTime.split(":")[0]);
      const endHour = parseInt(endTime.split(":")[0]);
      const hours =
        endHour > startHour ? endHour - startHour : 24 - startHour + endHour;
      totalPrice = booking.court.pricePerHour * hours;
    }

    // Update booking
    // If status is being changed to cancelled, set cancelledByUserId to current user (club owner)
    // If status is being changed from cancelled to confirmed (restoring), clear cancelledByUserId
    const updateData: any = {
      ...(date && { date: new Date(date) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(status && { status }),
      ...(bookingUserId && { userId: bookingUserId }),
      ...(totalPrice !== booking.totalPrice && { totalPrice }),
    };

    if (status === "cancelled" && booking.status !== "cancelled") {
      // Club owner is cancelling, set cancelledByUserId
      updateData.cancelledByUserId = userId;
    } else if (status === "confirmed" && booking.status === "cancelled") {
      // Restoring a cancelled booking - clear cancelledByUserId
      updateData.cancelledByUserId = null;
    }

    const updatedBooking = await (prisma as any).booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: true,
        court: true,
      },
    });

    // Update financial transaction if price changed or status changed
    if (status === "confirmed" && booking.status !== "confirmed") {
      // Booking was confirmed (either new confirmation or restoring cancelled booking)
      // Use booking date with time set to start of day to match date filter logic
      const bookingDate = new Date(date || booking.date);
      bookingDate.setHours(0, 0, 0, 0);

      // If restoring a cancelled booking, check if negative transaction exists and delete it
      if (booking.status === "cancelled") {
        // Find and delete the negative transaction created when cancelled
        const negativeTransaction = await (
          prisma as any
        ).financialTransaction.findFirst({
          where: {
            locationId: booking.locationId,
            courtId: booking.courtId,
            type: "income",
            source: "booking",
            amount: -booking.totalPrice, // Negative amount
            transactionDate: bookingDate,
            description: {
              contains: "Booking cancellation",
            },
          },
        });

        if (negativeTransaction) {
          await (prisma as any).financialTransaction.delete({
            where: { id: negativeTransaction.id },
          });
        }
      }

      // Create or restore the positive income transaction
      await (prisma as any).financialTransaction.create({
        data: {
          locationId: booking.locationId,
          courtId: booking.courtId,
          amount: totalPrice,
          type: "income",
          source: "booking",
          description: `Booking revenue: ${booking.court.name} - ${
            date || booking.date
          } ${startTime || booking.startTime}-${endTime || booking.endTime}`,
          transactionDate: bookingDate,
          createdById: userId,
        },
      });
    } else if (status === "cancelled" && booking.status === "confirmed") {
      // Booking was cancelled, create negative income transaction to remove from income
      // This removes the booking revenue from income without affecting expenses
      // Use the booking date (not current date) so it matches the original transaction date
      const bookingDate = new Date(date || booking.date);
      bookingDate.setHours(0, 0, 0, 0);

      // Check if negative transaction already exists (prevent duplicates)
      // Build description filter with AND conditions
      const cancellationDescription = `Booking cancellation: ${
        booking.court.name
      } - ${date || booking.date} ${startTime || booking.startTime}-${
        endTime || booking.endTime
      }`;

      const existingNegative = await (
        prisma as any
      ).financialTransaction.findFirst({
        where: {
          locationId: booking.locationId,
          courtId: booking.courtId,
          type: "income",
          source: "booking",
          amount: -totalPrice, // Negative amount
          transactionDate: bookingDate,
          description: {
            contains: "Booking cancellation",
          },
        },
      });

      // Only create if it doesn't exist
      if (!existingNegative) {
        await (prisma as any).financialTransaction.create({
          data: {
            locationId: booking.locationId,
            courtId: booking.courtId,
            amount: -totalPrice, // Negative amount to subtract from income
            type: "income", // Keep as income (negative) not expense
            source: "booking",
            description: `Booking cancellation: ${booking.court.name} - ${
              date || booking.date
            } ${startTime || booking.startTime}-${endTime || booking.endTime}`,
            transactionDate: bookingDate, // Use booking date to match original transaction
            createdById: userId,
          },
        });
      }
    }

    return NextResponse.json({ booking: updatedBooking });
  } catch (error: any) {
    console.error("Error updating club owner booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/club-owner/bookings/[id]
 * Cancel/delete a booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can modify bookings (not owner partner - read-only)
    const canModify = await canModifyBookings();
    if (!canModify) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = await requireClubOwner().catch(async () => {
      // If not club owner, check if moderator
      if (await isModerator()) {
        const user = await getCurrentUser();
        return user?.id || null;
      }
      return null;
    });

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get booking to check ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true, court: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check location ownership
    const isOwner = await isLocationOwner(booking.locationId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "You don't own this location" },
        { status: 403 }
      );
    }

    // If booking was confirmed, create negative income transaction to remove from income
    // This removes the booking revenue from income without affecting expenses
    // Use the booking date (not current date) so it matches the original transaction date
    if (booking.status === "confirmed") {
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
          description: {
            contains: "Booking cancellation",
          },
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
            description: `Booking cancellation: ${booking.court.name} - ${booking.date} ${booking.startTime}-${booking.endTime}`,
            transactionDate: bookingDate, // Use booking date to match original transaction
            createdById: userId,
          },
        });
      }
    }

    // Update booking to cancelled status with cancelledByUserId before deleting
    // This allows tracking who cancelled it
    await (prisma as any).booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        cancelledByUserId: userId, // Club owner cancelled
      },
    });

    // Delete booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting club owner booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete booking" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
