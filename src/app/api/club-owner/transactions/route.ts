import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireClubOwner,
  getOwnedLocationIds,
  isLocationOwner,
} from "@/lib/club-owner-auth";
import {
  canViewFinancials,
  canViewExpenses,
  canManageFinancialTransactions,
  isOwnerPartner,
  isModerator,
  getOwnedLocationIds as getRBACOwnedLocationIds,
  getAccessibleLocationIds,
  requireApprovedUser,
  getCurrentUser,
} from "@/lib/rbac";

/**
 * GET /api/club-owner/transactions
 * Get all financial transactions for owned locations
 */
export async function GET(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can view financials (club owner, owner partner, or super admin)
    const canView = await canViewFinancials();
    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Moderators cannot view financial transactions at all
    if (await isModerator()) {
      return NextResponse.json(
        { error: "Moderators cannot view financial transactions" },
        { status: 403 }
      );
    }

    // Get accessible location IDs (owned for club owners, assigned for owner partners)
    const accessibleLocationIds = await getAccessibleLocationIds();

    if (accessibleLocationIds.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const courtId = searchParams.get("courtId");
    const type = searchParams.get("type"); // income, expense
    const source = searchParams.get("source"); // booking, manual
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Validate locationId if provided
    if (locationId) {
      if (!/^[a-zA-Z0-9_-]+$/.test(locationId)) {
        return NextResponse.json(
          { error: "Invalid locationId format" },
          { status: 400 }
        );
      }
      // Ensure locationId is in owned locations
      if (!accessibleLocationIds.includes(locationId)) {
        return NextResponse.json(
          { error: "You don't have access to this location" },
          { status: 403 }
        );
      }
    }

    // Validate courtId if provided
    if (courtId && !/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      locationId: {
        in: accessibleLocationIds,
      },
    };

    if (locationId && accessibleLocationIds.includes(locationId)) {
      where.locationId = locationId;
    }

    if (courtId) {
      where.courtId = courtId;
    }

    if (type) {
      where.type = type;
    }

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        where.transactionDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day to include all transactions on that date
        where.transactionDate.lte = end;
      }
    }

    // Calculate income from confirmed bookings directly (like the summary API)
    // This matches what the user sees in the bookings tab
    const bookingWhere: any = {
      status: "confirmed", // Only confirmed bookings count as income
      locationId: {
        in: accessibleLocationIds,
      },
    };

    if (locationId && accessibleLocationIds.includes(locationId)) {
      bookingWhere.locationId = locationId;
    }

    if (courtId) {
      bookingWhere.courtId = courtId;
    }

    if (startDate || endDate) {
      bookingWhere.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        bookingWhere.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        bookingWhere.date.lte = end;
      }
    }

    // Fetch confirmed bookings
    const confirmedBookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerHour: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Convert confirmed bookings to transaction-like objects for the response
    const bookingTransactions = confirmedBookings.map((booking: any) => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);

      return {
        id: `booking-${booking.id}`, // Unique ID for booking-based transaction
        locationId: booking.locationId,
        courtId: booking.courtId,
        amount: booking.totalPrice,
        type: "income",
        source: "booking",
        description: `Booking revenue: ${booking.court.name} - ${
          new Date(booking.date).toISOString().split("T")[0]
        } ${booking.startTime}-${booking.endTime}`,
        transactionDate: bookingDate,
        createdAt: booking.createdAt,
        location: booking.location,
        court: booking.court,
        createdBy: booking.user,
        bookingId: booking.id, // Store original booking ID for reference
      };
    });

    // Get manual transactions (expenses and manual income)
    // Exclude booking-related transactions from the query since we're getting them from bookings
    // Only show approved transactions (hide pending/rejected)
    const manualWhere: any = {
      locationId: {
        in: accessibleLocationIds,
      },
      source: "manual", // Only manual transactions from the transaction table
      status: "approved", // Only show approved transactions to club owner
    };

    if (locationId && accessibleLocationIds.includes(locationId)) {
      manualWhere.locationId = locationId;
    }

    if (courtId) {
      manualWhere.courtId = courtId;
    }

    // Fetch all manual transactions (we'll filter by type later)
    if (startDate || endDate) {
      manualWhere.transactionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        manualWhere.transactionDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        manualWhere.transactionDate.lte = end;
      }
    }

    const manualTransactions = await (
      prisma as any
    ).financialTransaction.findMany({
      where: manualWhere,
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
      orderBy: {
        transactionDate: "desc",
      },
    });

    // Combine booking transactions and manual transactions
    let allTransactions: any[] = [];

    // Filter based on type and source parameters
    if (!type || type === "all") {
      // Return both income and expense transactions
      if (!source || source === "booking") {
        // Include booking income (confirmed bookings)
        allTransactions.push(...bookingTransactions);
      }
      if (!source || source === "manual") {
        // Include all manual transactions (both income and expense)
        allTransactions.push(...manualTransactions);
      }
    } else if (type === "income") {
      // Income transactions only
      if (!source || source === "booking") {
        // Include booking income (confirmed bookings)
        allTransactions.push(...bookingTransactions);
      }
      if (!source || source === "manual") {
        // Include manual income transactions
        const manualIncome = manualTransactions.filter(
          (t: any) => t.type === "income"
        );
        allTransactions.push(...manualIncome);
      }
    } else if (type === "expense") {
      // Expense transactions (only manual, no booking expenses)
      if (!source || source === "manual") {
        const manualExpenses = manualTransactions.filter(
          (t: any) => t.type === "expense"
        );
        allTransactions.push(...manualExpenses);
      }
    }

    // Sort by transaction date descending
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.transactionDate).getTime();
      const dateB = new Date(b.transactionDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ transactions: allTransactions });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transactions" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * POST /api/club-owner/transactions
 * Create a manual financial transaction
 */
export async function POST(request: NextRequest) {
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
    const data = await request.json();

    const {
      locationId,
      courtId,
      amount,
      type, // income, expense
      description,
      transactionDate,
    } = data;

    // Validate required fields
    if (!locationId || amount === undefined || !type) {
      return NextResponse.json(
        { error: "locationId, amount, and type are required" },
        { status: 400 }
      );
    }

    // Validate input formats
    if (!/^[a-zA-Z0-9_-]+$/.test(locationId)) {
      return NextResponse.json(
        { error: "Invalid locationId format" },
        { status: 400 }
      );
    }

    if (courtId && !/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum === 0) {
      return NextResponse.json(
        { error: "Amount must be a non-zero number" },
        { status: 400 }
      );
    }

    if (!["income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }

    // Sanitize description (basic XSS prevention)
    const sanitizedDescription = description
      ? String(description)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .substring(0, 500) // Limit length
      : null;

    // Check location ownership
    const isOwner = await isLocationOwner(locationId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "You don't own this location" },
        { status: 403 }
      );
    }

    // If courtId provided, verify it belongs to location
    if (courtId) {
      const court = await prisma.court.findUnique({
        where: { id: courtId },
      });

      if (!court || court.locationId !== locationId) {
        return NextResponse.json(
          { error: "Court not found in this location" },
          { status: 404 }
        );
      }
    }

    // Store amount as positive for income, negative for expense
    const transactionAmount =
      type === "income" ? Math.abs(amount) : -Math.abs(amount);

    // Create transaction
    const transaction = await (prisma as any).financialTransaction.create({
      data: {
        locationId,
        courtId: courtId || null,
        amount: transactionAmount,
        type,
        source: "manual",
        description: sanitizedDescription,
        transactionDate: transactionDate
          ? new Date(transactionDate)
          : new Date(),
        createdById: userId,
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

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create transaction" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
