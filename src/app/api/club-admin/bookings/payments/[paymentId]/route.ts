import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApprovedUser } from "@/lib/rbac";
import { getClubAdminLocationId, canAccessBooking } from "@/lib/club-admin-helpers";

/**
 * DELETE /api/club-admin/bookings/payments/[paymentId]
 * Delete a payment entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // Require approved user
    const user = await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Verify user is club admin
    const locationId = await getClubAdminLocationId();
    if (!locationId) {
      return NextResponse.json(
        { error: "Unauthorized - Club admin access required" },
        { status: 403 }
      );
    }

    const { paymentId: paymentId } = await params;

    // Get payment with booking
    const payment = await (prisma as any).bookingPayment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            court: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify booking belongs to club admin's location
    const canAccess = await canAccessBooking(payment.bookingId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Access denied" },
        { status: 403 }
      );
    }

    // Check if booking is closed
    if (payment.booking.paymentStatus === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot delete payments for closed bookings" },
        { status: 400 }
      );
    }

    // Delete payment and update booking status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete the payment
      await (tx as any).bookingPayment.delete({
        where: { id: paymentId },
      });

      // Recalculate booking payment status
      const remainingPayments = await (tx as any).bookingPayment.findMany({
        where: { bookingId: payment.bookingId },
      });

      const totalPaid = remainingPayments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0
      );

      let newPaymentStatus = "PENDING";
      if (totalPaid === payment.booking.totalPrice) {
        newPaymentStatus = "PAID";
      } else if (totalPaid > 0) {
        newPaymentStatus = "PARTIAL";
      }

      const updatedBooking = await (tx as any).booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: newPaymentStatus,
          paidAt: newPaymentStatus === "PAID" ? payment.booking.paidAt : null,
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

      return updatedBooking;
    });

    return NextResponse.json({
      success: true,
      booking: result,
      message: "Payment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete payment" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/club-admin/bookings/payments/[paymentId]
 * Update a payment entry (amount and/or method)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // Require approved user
    const user = await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Verify user is club admin
    const locationId = await getClubAdminLocationId();
    if (!locationId) {
      return NextResponse.json(
        { error: "Unauthorized - Club admin access required" },
        { status: 403 }
      );
    }

    const { paymentId: paymentId } = await params;

    // Get payment with booking
    const payment = await (prisma as any).bookingPayment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            court: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Verify booking belongs to club admin's location
    const canAccess = await canAccessBooking(payment.bookingId);
    if (!canAccess) {
      return NextResponse.json(
        { error: "Unauthorized - Access denied" },
        { status: 403 }
      );
    }

    // Check if booking is closed
    if (payment.booking.paymentStatus === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot edit payments for closed bookings" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, method, paymentReference, payerName, payerPhone } = body;

    // Validate
    const validMethods = ["cash", "visa", "instapay", "online"];
    if (method && !validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid payment method. Must be one of: ${validMethods.join(", ")}` },
        { status: 400 }
      );
    }

    const newAmount = amount !== undefined ? Number(amount) : payment.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be a positive number" },
        { status: 400 }
      );
    }

    // Update payment and recalculate booking status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the payment
      const updatedPayment = await (tx as any).bookingPayment.update({
        where: { id: paymentId },
        data: {
          amount: Math.round(newAmount),
          method: method || payment.method,
          paymentReference: paymentReference !== undefined ? paymentReference : payment.paymentReference,
          payerName: payerName !== undefined ? payerName : payment.payerName,
          payerPhone: payerPhone !== undefined ? payerPhone : payment.payerPhone,
        },
      });

      // Recalculate booking payment status
      const allPayments = await (tx as any).bookingPayment.findMany({
        where: { bookingId: payment.bookingId },
      });

      const totalPaid = allPayments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0
      );

      // Validate total doesn't exceed booking price
      if (totalPaid > payment.booking.totalPrice) {
        throw new Error(
          `Total payment amount (${totalPaid} EGP) exceeds booking price (${payment.booking.totalPrice} EGP). Overpayment not allowed.`
        );
      }

      let newPaymentStatus = "PENDING";
      if (totalPaid === payment.booking.totalPrice) {
        newPaymentStatus = "PAID";
      } else if (totalPaid > 0) {
        newPaymentStatus = "PARTIAL";
      }

      const updatedBooking = await (tx as any).booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: newPaymentStatus,
          paidAt: newPaymentStatus === "PAID" ? new Date() : payment.booking.paidAt,
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

      return { payment: updatedPayment, booking: updatedBooking };
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      booking: result.booking,
      message: "Payment updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment" },
      { status: error.status || 500 }
    );
  }
}
