import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/lib/rbac";
import { getClubAdminLocationId } from "@/lib/club-admin-helpers";

/**
 * GET /api/club-admin/payments/daily-summary
 * Get daily payment summary for the club admin's assigned location
 * Returns totals by payment method for a specific date
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // Default to today if no date provided
    // Parse date string (YYYY-MM-DD) - use same approach as bookings API
    const filterDate = date ? new Date(date) : new Date();
    filterDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(filterDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log("Summary query - Date param:", date, "Filter date:", filterDate.toISOString(), "Next day:", nextDay.toISOString(), "LocationId:", locationId);

    // Get all bookings for this location and date
    console.log("Querying bookings for locationId:", locationId, "date range:", filterDate.toISOString(), "to", nextDay.toISOString());
    
    let bookings;
    try {
      bookings = await (prisma as any).booking.findMany({
      where: {
        locationId,
        date: {
          gte: filterDate,
          lt: nextDay,
        },
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        totalPrice: true,
        paymentStatus: true,
        bookingPayments: {
          select: {
            method: true,
            amount: true,
            recordedAt: true,
            payerName: true,
            payerPhone: true,
            paymentReference: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      });
      console.log("Found bookings:", bookings.length);
    } catch (queryError: any) {
      console.error("Prisma query error:", queryError);
      console.error("Query error details:", queryError?.message, queryError?.code);
      throw new Error(`Database query failed: ${queryError?.message || "Unknown error"}`);
    }
    
    // Initialize summary structure
    const totals = {
      cash: 0,
      visa: 0,
      instapay: 0,
      online: 0,
      total: 0,
    };
    
    let paidBookings = 0;
    let pendingBookings = 0;
    let partialBookings = 0;
    
    // Process bookings to calculate totals and counts
    const processedBookings = bookings.map((booking: any) => {
      console.log("Processing booking:", booking.id, "date:", booking.date, "paymentStatus:", booking.paymentStatus);
      
      // Safely handle bookingPayments - it might be null or undefined
      const payments = booking.bookingPayments || [];
      const totalPaid = payments.reduce(
        (sum: number, payment: any) => sum + (payment.amount || 0),
        0
      );

      // Count by payment status
      if (booking.paymentStatus === "PAID") {
        paidBookings++;
      } else if (booking.paymentStatus === "PENDING") {
        pendingBookings++;
      } else if (booking.paymentStatus === "PARTIAL") {
        partialBookings++;
      }

      // Sum payments by method
      payments.forEach((payment: any) => {
        if (payment && payment.method && payment.amount) {
          const method = payment.method.toLowerCase();
          if (totals.hasOwnProperty(method)) {
            totals[method as keyof typeof totals] += payment.amount;
          }
        }
      });

        return {
          id: booking.id,
          courtName: booking.court?.name || "Unknown Court",
          userName: booking.user?.name || booking.user?.email || "Unknown User",
          userPhone: booking.user?.phone || null,
          userId: booking.user?.id || null,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalPrice: booking.totalPrice,
          totalPaid,
          paymentStatus: booking.paymentStatus,
          paymentCount: payments.length,
          payments: payments.map((payment: any) => ({
            method: payment.method,
            amount: payment.amount,
            recordedAt: payment.recordedAt,
            payerName: payment.payerName || null,
            payerPhone: payment.payerPhone || null,
            paymentReference: payment.paymentReference || null,
          })),
        };
    });

    // Calculate total
    totals.total = totals.cash + totals.visa + totals.instapay + totals.online;

    // Build final summary object
    const summary = {
      date: filterDate.toISOString().split("T")[0],
      locationId,
      totals,
      bookingCount: bookings.length,
      paidBookings,
      pendingBookings,
      partialBookings,
      bookings: processedBookings,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Error fetching daily summary:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error message:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch daily summary", details: error?.stack },
      { status: 500 }
    );
  }
}
