import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, getOwnedLocationIds } from "@/lib/club-owner-auth";

/**
 * POST /api/club-owner/financials/fix-cancelled-bookings
 * Create missing negative income transactions for cancelled bookings
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireClubOwner();
    const ownedLocationIds = await getOwnedLocationIds();

    if (ownedLocationIds.length === 0) {
      return NextResponse.json({
        message: "No locations owned",
        fixed: 0,
      });
    }

    // Get all cancelled bookings for owned locations
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        status: "cancelled",
        locationId: {
          in: ownedLocationIds,
        },
      },
      include: {
        court: {
          include: {
            location: true,
          },
        },
      },
    });

    let fixedCount = 0;
    const errors: string[] = [];

    for (const booking of cancelledBookings) {
      // Check if negative income transaction already exists for this booking
      const existingTransaction = await (
        prisma as any
      ).financialTransaction.findFirst({
        where: {
          locationId: booking.locationId,
          courtId: booking.courtId,
          type: "income",
          source: "booking",
          amount: -booking.totalPrice,
          description: {
            contains: "Booking cancellation",
          },
        },
      });

      // Only create if it doesn't exist and location has owner
      if (!existingTransaction && (booking.court.location as any)?.ownerId) {
        try {
          const bookingDate = new Date(booking.date);
          bookingDate.setHours(0, 0, 0, 0);

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
              createdById: (booking.court.location as any).ownerId,
            },
          });
          fixedCount++;
        } catch (error: any) {
          errors.push(
            `Failed to create transaction for booking ${booking.id}: ${error.message}`
          );
        }
      }
    }

    return NextResponse.json({
      message: `Fixed ${fixedCount} cancelled bookings`,
      fixed: fixedCount,
      totalCancelled: cancelledBookings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error fixing cancelled bookings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fix cancelled bookings" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
