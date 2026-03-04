import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/lib/rbac";
import { getClubAdminLocationId } from "@/lib/club-admin-helpers";

/**
 * GET /api/club-admin/bookings
 * Get all bookings for the club admin's assigned location
 * Includes payment information and summary
 */
export async function GET(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Get club admin's assigned location
    const locationId = await getClubAdminLocationId();
    if (!locationId) {
      return NextResponse.json(
        { error: "Unauthorized - Club admin access required or no assigned location" },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    // Build where clause
    const where: any = {
      locationId,
      status: { not: "cancelled" }, // Exclude cancelled bookings
    };

    // Filter by date if provided
    if (date) {
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = {
        gte: filterDate,
        lt: nextDay,
      };
    }

    // Filter by booking status if provided
    if (status) {
      where.status = status;
    }

    // Filter by payment status if provided
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    // Fetch bookings with related data
    const bookings = await (prisma as any).booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerHour: true,
          },
        },
        bookingPayments: {
          select: {
            id: true,
            method: true,
            amount: true,
            paymentReference: true,
            payerName: true,
            payerPhone: true,
            recordedAt: true,
            recordedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            recordedAt: "desc",
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            instapayPhone: true, // Include location's fixed InstaPay number
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { startTime: "asc" },
      ],
    });

    // Calculate payment summary for each booking
    const bookingsWithSummary = bookings.map((booking: any) => {
      const totalPaid = booking.bookingPayments.reduce(
        (sum: number, payment: any) => sum + payment.amount,
        0
      );
      const remaining = booking.totalPrice - totalPaid;

      // Group payments by method
      const paymentsByMethod = booking.bookingPayments.reduce(
        (acc: any, payment: any) => {
          acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
          return acc;
        },
        {}
      );

      return {
        ...booking,
        paymentSummary: {
          totalPrice: booking.totalPrice,
          totalPaid,
          remaining,
          paymentsByMethod,
          paymentCount: booking.bookingPayments.length,
        },
      };
    });

    return NextResponse.json({
      bookings: bookingsWithSummary,
      locationId,
    });
  } catch (error: any) {
    console.error("Error fetching club admin bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
