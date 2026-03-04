import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * POST /api/club-admin/transactions/request
 * Club admin requests a transaction (expense) that needs club owner approval
 */
export async function POST(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; userType?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user as any;

    // Check if user is a club admin
    if (
      user.role !== "user" ||
      user.userType !== "club_admin" ||
      !user.isApproved
    ) {
      return NextResponse.json(
        { error: "Unauthorized - Club admin access required" },
        { status: 403 }
      );
    }

    // Get club admin's assigned location
    let clubAdminLocationId: string | null = null;
    const approvalNotifications = await prisma.notification.findMany({
      where: {
        type: "admin_approval",
      },
      orderBy: { createdAt: "desc" },
    });

    for (const notification of approvalNotifications) {
      if (notification.metadata) {
        const metadata = notification.metadata as any;
        const metadataPendingUserId =
          metadata.pendingUserId?.toString() || metadata.pendingUserId;
        const currentUserId = userId?.toString() || userId;

        if (
          metadataPendingUserId &&
          currentUserId &&
          metadataPendingUserId === currentUserId &&
          metadata.userType === "club_admin" &&
          metadata.locationId
        ) {
          clubAdminLocationId =
            metadata.locationId?.toString() || metadata.locationId;
          break;
        }
      }
    }

    if (!clubAdminLocationId) {
      return NextResponse.json(
        { error: "No assigned location found for this club admin" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { courtId, amount, description, transactionDate } = data;

    // Validate required fields
    if (amount === undefined || !description) {
      return NextResponse.json(
        { error: "amount and description are required" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate courtId if provided
    if (courtId && !/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Verify court belongs to the assigned location
    if (courtId) {
      const court = await prisma.court.findUnique({
        where: { id: courtId },
      });

      if (!court || court.locationId !== clubAdminLocationId) {
        return NextResponse.json(
          { error: "Court not found in your assigned location" },
          { status: 404 }
        );
      }
    }

    // Sanitize description
    const sanitizedDescription = String(description)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .substring(0, 500);

    // Get location owner ID for createdById (transaction will be "owned" by location owner)
    const location = await prisma.location.findUnique({
      where: { id: clubAdminLocationId },
      select: { ownerId: true },
    });

    if (!location || !location.ownerId) {
      return NextResponse.json(
        { error: "Location owner not found" },
        { status: 404 }
      );
    }

    // Create transaction request with status "pending"
    const transaction = await (prisma as any).financialTransaction.create({
      data: {
        locationId: clubAdminLocationId,
        courtId: courtId || null,
        amount: -Math.abs(amountNum), // Negative for expense
        type: "expense",
        source: "manual",
        description: sanitizedDescription,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        createdById: location.ownerId, // Location owner is the creator
        status: "pending", // Pending approval
        requestedById: userId, // Club admin who requested
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
      },
    });

    // Create notification for club owner
    await prisma.notification.create({
      data: {
        userId: location.ownerId,
        title: "New Transaction Request",
        message: `Club admin ${
          transaction.requestedBy?.name || transaction.requestedBy?.email
        } has requested a transaction: ${sanitizedDescription} (${amountNum} EGP)`,
        type: "transaction_request",
        metadata: {
          transactionId: transaction.id,
          locationId: clubAdminLocationId,
          requestedById: userId,
          amount: amountNum,
          description: sanitizedDescription,
        },
      },
    });

    return NextResponse.json(
      {
        transaction,
        message:
          "Transaction request submitted successfully. Waiting for approval.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating transaction request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transaction request" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
