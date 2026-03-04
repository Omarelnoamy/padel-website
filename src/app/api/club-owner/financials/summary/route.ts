import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, getOwnedLocationIds } from "@/lib/club-owner-auth";
import {
  canViewFinancials,
  canViewExpenses,
  isOwnerPartner,
  isModerator,
  getOwnedLocationIds as getRBACOwnedLocationIds,
  requireApprovedUser,
  getCurrentUser,
} from "@/lib/rbac";

/**
 * GET /api/club-owner/financials/summary
 * Get financial summary (income, expenses, profit) with filters
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

    // Get owned location IDs
    let ownedLocationIds: string[] = [];
    try {
      const userId = await requireClubOwner();
      ownedLocationIds = await getOwnedLocationIds();
    } catch {
      // If not club owner, try to get from RBAC (for owner partner)
      // IMPORTANT: For owner_partner and moderator, restrict to empty array to prevent access to all locations
      const currentUser = await getCurrentUser();
      const isOwnerPartner =
        currentUser?.role === "admin" &&
        currentUser?.adminType === "owner_partner";
      const isMod = await isModerator();

      if (isOwnerPartner || isMod) {
        // TODO: Implement location assignment system
        // For now, return empty to prevent access to all locations
        ownedLocationIds = [];
      } else {
        ownedLocationIds = await getRBACOwnedLocationIds();
      }
    }

    if (ownedLocationIds.length === 0) {
      return NextResponse.json({
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        byLocation: [],
        byCourt: [],
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const courtId = searchParams.get("courtId");
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
      if (!ownedLocationIds.includes(locationId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Validate courtId if provided
    if (courtId && !/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Calculate income directly from confirmed bookings
    // This is more reliable than transactions and matches what the user sees in the bookings tab
    const bookingWhere: any = {
      locationId: {
        in: ownedLocationIds,
      },
      status: "confirmed", // Only confirmed bookings count as income
    };

    if (locationId && ownedLocationIds.includes(locationId)) {
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

    // Fetch confirmed bookings with court and location info
    const confirmedBookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        court: {
          select: {
            id: true,
            name: true,
            pricePerHour: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Build where clause for expenses (manual transactions only)
    const expenseWhere: any = {
      locationId: {
        in: ownedLocationIds,
      },
      type: "expense",
      source: "manual",
    };

    if (locationId && ownedLocationIds.includes(locationId)) {
      expenseWhere.locationId = locationId;
    }

    if (courtId) {
      expenseWhere.courtId = courtId;
    }

    if (startDate || endDate) {
      expenseWhere.transactionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        expenseWhere.transactionDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        expenseWhere.transactionDate.lte = end;
      }
    }

    // Calculate income directly from confirmed bookings
    // This matches what the user sees in the bookings tab
    let totalIncome = 0;
    const incomeByLocation: Record<
      string,
      { locationId: string; locationName: string; amount: number }
    > = {};
    const incomeByCourt: Record<
      string,
      {
        courtId: string;
        courtName: string;
        locationName: string;
        amount: number;
      }
    > = {};

    // Sum income from confirmed bookings
    confirmedBookings.forEach((booking: any) => {
      const amount = booking.totalPrice;
      totalIncome += amount;

      // By location
      const locKey = booking.locationId;
      if (!incomeByLocation[locKey]) {
        incomeByLocation[locKey] = {
          locationId: booking.location.id,
          locationName: booking.location.name,
          amount: 0,
        };
      }
      incomeByLocation[locKey].amount += amount;

      // By court
      if (booking.courtId && booking.court) {
        const courtKey = booking.courtId;
        if (!incomeByCourt[courtKey]) {
          incomeByCourt[courtKey] = {
            courtId: booking.court.id,
            courtName: booking.court.name,
            locationName: booking.location.name,
            amount: 0,
          };
        }
        incomeByCourt[courtKey].amount += amount;
      }
    });

    // Check if user can view expenses (moderator cannot view expenses)
    const canViewExp = await canViewExpenses();

    // Get expenses from manual transactions only (if user can view expenses)
    let expenseTransactions: any[] = [];
    if (canViewExp) {
      expenseTransactions = await (prisma as any).financialTransaction.findMany(
        {
          where: expenseWhere,
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
            court: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }
      );
    }

    let totalExpenses = 0;
    const expenseByLocation: Record<
      string,
      { locationId: string; locationName: string; amount: number }
    > = {};
    const expenseByCourt: Record<
      string,
      {
        courtId: string;
        courtName: string;
        locationName: string;
        amount: number;
      }
    > = {};

    expenseTransactions.forEach((transaction: any) => {
      const amount = Math.abs(transaction.amount); // Expenses are stored as negative
      totalExpenses += amount;

      // By location
      const locKey = transaction.locationId;
      if (!expenseByLocation[locKey]) {
        expenseByLocation[locKey] = {
          locationId: transaction.location.id,
          locationName: transaction.location.name,
          amount: 0,
        };
      }
      expenseByLocation[locKey].amount += amount;

      // By court (if court-specific)
      if (transaction.courtId && transaction.court) {
        const courtKey = transaction.courtId;
        if (!expenseByCourt[courtKey]) {
          expenseByCourt[courtKey] = {
            courtId: transaction.court.id,
            courtName: transaction.court.name,
            locationName: transaction.location.name,
            amount: 0,
          };
        }
        expenseByCourt[courtKey].amount += amount;
      }
    });

    // Combine location data
    const byLocation = Object.values(incomeByLocation).map((income) => {
      const expense = expenseByLocation[income.locationId] || { amount: 0 };
      return {
        locationId: income.locationId,
        locationName: income.locationName,
        income: income.amount,
        expenses: expense.amount,
        profit: income.amount - expense.amount,
      };
    });

    // Combine court data
    const byCourt = Object.values(incomeByCourt).map((income) => {
      const expense = expenseByCourt[income.courtId] || { amount: 0 };
      return {
        courtId: income.courtId,
        courtName: income.courtName,
        locationName: income.locationName,
        income: income.amount,
        expenses: expense.amount,
        profit: income.amount - expense.amount,
      };
    });

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      byLocation,
      byCourt,
    });
  } catch (error: any) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch financial summary" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
