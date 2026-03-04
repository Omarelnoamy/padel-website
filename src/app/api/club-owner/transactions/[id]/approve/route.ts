import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, isLocationOwner } from "@/lib/club-owner-auth";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * PATCH /api/club-owner/transactions/[id]/approve
 * Approve a pending transaction request
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

    const userId = await requireClubOwner();
    const { id: transactionId } = await params;

    // Get the transaction
    const transaction = await (prisma as any).financialTransaction.findUnique({
      where: { id: transactionId },
      include: {
        location: true,
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if transaction is pending
    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: "Transaction is not pending approval" },
        { status: 400 }
      );
    }

    // Check location ownership
    const isOwner = await isLocationOwner(transaction.locationId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "You don't own this location" },
        { status: 403 }
      );
    }

    // Update transaction status to approved
    const updatedTransaction = await (
      prisma as any
    ).financialTransaction.update({
      where: { id: transactionId },
      data: {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create notification for club admin
    if (transaction.requestedById) {
      await prisma.notification.create({
        data: {
          userId: transaction.requestedById,
          title: "Transaction Approved",
          message: `Your transaction request "${
            transaction.description
          }" (${Math.abs(transaction.amount)} EGP) has been approved.`,
          type: "transaction_approved",
          metadata: {
            transactionId: transaction.id,
            locationId: transaction.locationId,
          },
        },
      });
    }

    return NextResponse.json({
      transaction: updatedTransaction,
      message: "Transaction approved successfully",
    });
  } catch (error: any) {
    console.error("Error approving transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve transaction" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
