import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, isLocationOwner } from "@/lib/club-owner-auth";
import {
  canManageFinancialTransactions,
  requireApprovedUser,
} from "@/lib/rbac";

/**
 * PATCH /api/club-owner/transactions/[id]
 * Update a financial transaction
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can manage financial transactions (not owner partner or moderator - read-only)
    const canManage = await canManageFinancialTransactions();
    if (!canManage) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = await requireClubOwner();
    const { id: transactionId } = await params;

    // Get transaction to check ownership
    const transaction = await (prisma as any).financialTransaction.findUnique({
      where: { id: transactionId },
      include: { location: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
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

    // Only allow updating manual transactions
    if (transaction.source !== "manual") {
      return NextResponse.json(
        { error: "Only manual transactions can be updated" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { amount, type, description, transactionDate, courtId } = data;

    // Validate type if provided
    if (type && !["income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    // Calculate amount
    const finalType = type || transaction.type;
    const finalAmount =
      amount !== undefined
        ? finalType === "income"
          ? Math.abs(amount)
          : -Math.abs(amount)
        : transaction.amount;

    // Update transaction
    const updatedTransaction = await (
      prisma as any
    ).financialTransaction.update({
      where: { id: transactionId },
      data: {
        ...(amount !== undefined && { amount: finalAmount }),
        ...(type && { type: finalType }),
        ...(description !== undefined && { description }),
        ...(transactionDate && { transactionDate: new Date(transactionDate) }),
        ...(courtId !== undefined && { courtId: courtId || null }),
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ transaction: updatedTransaction });
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update transaction" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/club-owner/transactions/[id]
 * Delete a financial transaction (only manual transactions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can manage financial transactions (not owner partner or moderator - read-only)
    const canManage = await canManageFinancialTransactions();
    if (!canManage) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = await requireClubOwner();
    const { id: transactionId } = await params;

    // Get transaction to check ownership
    const transaction = await (prisma as any).financialTransaction.findUnique({
      where: { id: transactionId },
      include: { location: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
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

    // Only allow deleting manual transactions
    if (transaction.source !== "manual") {
      return NextResponse.json(
        { error: "Only manual transactions can be deleted" },
        { status: 400 }
      );
    }

    // Delete transaction
    await (prisma as any).financialTransaction.delete({
      where: { id: transactionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete transaction" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
