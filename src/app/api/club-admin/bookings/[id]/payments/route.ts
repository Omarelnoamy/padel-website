import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/lib/rbac";
import { getClubAdminLocationId, canAccessBooking } from "@/lib/club-admin-helpers";

/**
 * POST /api/club-admin/bookings/[id]/payments
 * Record payment(s) for a booking
 * Supports multiple payment methods (cash, visa, instapay)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require approved user
    const userOrError = await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    // Verify user is club admin
    const locationId = await getClubAdminLocationId();
    if (!locationId) {
      return NextResponse.json(
        { error: "Unauthorized - Club admin access required" },
        { status: 403 }
      );
    }

    const { id: bookingId } = await params;

    // Verify booking belongs to club admin's location
    const canAccess = await canAccessBooking(bookingId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Booking not found or access denied" },
        { status: 403 }
      );
    }

    // Get booking details
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingPayments: true,
        court: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking is already closed
    if (booking.paymentStatus === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot modify payments for closed bookings" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { payments } = body; // Array of { method: string, amount: number }

    // Validate payments array
    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: "Payments array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate payment methods and amounts
    const validMethods = ["cash", "visa", "instapay", "online"];
    let totalPaymentAmount = 0;

    for (const payment of payments) {
      if (!payment.method || !validMethods.includes(payment.method)) {
        return NextResponse.json(
          { error: `Invalid payment method. Must be one of: ${validMethods.join(", ")}` },
          { status: 400 }
        );
      }

      const amount = Number(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Payment amount must be a positive number" },
          { status: 400 }
        );
      }

      totalPaymentAmount += amount;
    }

    // Calculate current total paid
    const currentTotalPaid = booking.bookingPayments.reduce(
      (sum: number, payment: { amount: number }) => sum + payment.amount,
      0
    );

    // Calculate new total paid
    const newTotalPaid = currentTotalPaid + totalPaymentAmount;

    // Validate total doesn't exceed booking price
    if (newTotalPaid > booking.totalPrice) {
      return NextResponse.json(
        {
          error: `Total payment amount (${newTotalPaid} EGP) exceeds booking price (${booking.totalPrice} EGP). Overpayment not allowed.`,
        },
        { status: 400 }
      );
    }

    // Check if booking has ended (payment can only be recorded after booking ends or on the same day)
    const now = new Date();
    const bookingDate = new Date(booking.date);
    bookingDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Parse booking end time
    const [endHour, endMinute] = booking.endTime.split(":").map(Number);
    const bookingEndTime = new Date(bookingDate);
    
    // Handle overnight bookings (end time < start time means next day)
    const [startHour] = booking.startTime.split(":").map(Number);
    if (endHour < startHour || (endHour === startHour && endMinute === 0 && startHour <= 5)) {
      bookingEndTime.setDate(bookingEndTime.getDate() + 1);
    }
    bookingEndTime.setHours(endHour, endMinute, 0, 0);

    // Allow payment if:
    // 1. Booking has ended, OR
    // 2. It's the same day as the booking (for same-day bookings)
    const isSameDay = bookingDate.getTime() === today.getTime();
    const hasEnded = now >= bookingEndTime;

    if (!hasEnded && !isSameDay) {
      return NextResponse.json(
        { error: "Payments can only be recorded after booking ends or on the same day" },
        { status: 400 }
      );
    }

    // Create payments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment records
      const createdPayments = await Promise.all(
        payments.map((payment: any) =>
          (tx as any).bookingPayment.create({
            data: {
              bookingId,
              method: payment.method,
              amount: Math.round(payment.amount), // Ensure integer
              paymentReference: payment.paymentReference || null, // Reference for Visa
              payerName: payment.payerName || null, // Name of person who sent InstaPay
              payerPhone: payment.payerPhone || null, // Phone number of person who sent InstaPay
              recordedById: user.id,
            },
          })
        )
      );

      // Update booking payment status
      let newPaymentStatus = "PENDING";
      if (newTotalPaid === booking.totalPrice) {
        newPaymentStatus = "PAID";
      } else if (newTotalPaid > 0) {
        newPaymentStatus = "PARTIAL";
      }

      const updatedBooking = await (tx as any).booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: newPaymentStatus,
          paidAt: newPaymentStatus === "PAID" ? new Date() : booking.paidAt,
        },
        include: {
          bookingPayments: {
            include: {
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
        },
      });

      // If booking is now PAID, create financial transactions
      if (newPaymentStatus === "PAID" && booking.paymentStatus !== "PAID") {
        const location = (booking.court as any).location;
        
        if (location?.ownerId) {
          // Group payments by method and create financial transactions
          const paymentsByMethod = createdPayments.reduce((acc: any, payment: any) => {
            acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
            return acc;
          }, {});

          // Create a financial transaction for each payment method
          for (const [method, amount] of Object.entries(paymentsByMethod)) {
            try {
              await (tx as any).financialTransaction.create({
                data: {
                  locationId: booking.locationId,
                  courtId: booking.courtId,
                  amount: amount as number,
                  type: "income",
                  source: "booking",
                  description: `Booking payment (${method}): ${(booking.court as any).name} - ${bookingDate.toISOString().split("T")[0]} ${booking.startTime}-${booking.endTime}`,
                  transactionDate: bookingDate,
                  createdById: location.ownerId,
                },
              });
            } catch (error) {
              console.error(`Error creating financial transaction for ${method}:`, error);
              // Don't fail the payment recording if financial transaction creation fails
            }
          }
        }
      }

      return {
        booking: updatedBooking,
        payments: createdPayments,
      };
    });

    return NextResponse.json({
      success: true,
      booking: result.booking,
      payments: result.payments,
      message: "Payment(s) recorded successfully",
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: error.status || 500 }
    );
  }
}
