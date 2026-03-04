import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, getOwnedLocationIds } from "@/lib/club-owner-auth";
import {
  canViewFinancials,
  canViewExpenses,
  getOwnedLocationIds as getRBACOwnedLocationIds,
  requireApprovedUser,
  getCurrentUser,
  isModerator,
} from "@/lib/rbac";

/**
 * GET /api/club-owner/financials/monthly
 * Get monthly financial data for charts
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
        monthlyData: [],
        revenueBySource: { booking: 0, manual: 0 },
        profitByLocation: [],
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate income directly from confirmed bookings (like the summary API)
    const bookingWhere: any = {
      status: "confirmed", // Only confirmed bookings count as income
      locationId: {
        in: ownedLocationIds,
      },
    };

    if (locationId && ownedLocationIds.includes(locationId)) {
      bookingWhere.locationId = locationId;
    }

    // Use same date normalization as summary API so charts match summary cards
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

    // Fetch confirmed bookings (including category)
    const confirmedBookings = await (prisma as any).booking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        date: true,
        totalPrice: true,
        category: true,
        locationId: true,
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

    // Get expenses from manual transactions only
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

    // Get manual income transactions (for revenue by source)
    const manualIncomeWhere: any = {
      locationId: {
        in: ownedLocationIds,
      },
      type: "income",
      source: "manual",
    };

    if (locationId && ownedLocationIds.includes(locationId)) {
      manualIncomeWhere.locationId = locationId;
    }

    if (startDate || endDate) {
      manualIncomeWhere.transactionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        manualIncomeWhere.transactionDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        manualIncomeWhere.transactionDate.lte = end;
      }
    }

    const manualIncomeTransactions = await (
      prisma as any
    ).financialTransaction.findMany({
      where: manualIncomeWhere,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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
          },
        }
      );
    }

    // Group by month
    const monthlyMap: Record<
      string,
      { income: number; expenses: number; month: string }
    > = {};

    // Revenue by source and category
    let bookingRevenue = 0;
    let manualRevenue = 0;
    const bookingRevenueByCategory: Record<string, number> = {
      regular: 0,
      academy: 0,
      tournament: 0,
    };

    // Profit by location
    const profitByLocationMap: Record<
      string,
      { locationId: string; locationName: string; profit: number }
    > = {};

    // Process confirmed bookings for income
    confirmedBookings.forEach((booking: any) => {
      const date = new Date(booking.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expenses: 0,
          month: monthLabel,
        };
      }

      const amount = booking.totalPrice;
      monthlyMap[monthKey].income += amount;
      bookingRevenue += amount;

      // Group by category
      const category = booking.category || "regular";
      if (bookingRevenueByCategory.hasOwnProperty(category)) {
        bookingRevenueByCategory[category] += amount;
      } else {
        bookingRevenueByCategory[category] = amount;
      }

      // Calculate profit by location
      const locKey = booking.locationId;
      if (!profitByLocationMap[locKey]) {
        profitByLocationMap[locKey] = {
          locationId: booking.location.id,
          locationName: booking.location.name,
          profit: 0,
        };
      }
      profitByLocationMap[locKey].profit += amount;
    });

    // Process manual income transactions
    manualIncomeTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expenses: 0,
          month: monthLabel,
        };
      }

      const amount = transaction.amount;
      if (amount > 0) {
        monthlyMap[monthKey].income += amount;
        manualRevenue += amount;

        // Calculate profit by location
        const locKey = transaction.locationId;
        if (!profitByLocationMap[locKey]) {
          profitByLocationMap[locKey] = {
            locationId: transaction.location.id,
            locationName: transaction.location.name,
            profit: 0,
          };
        }
        profitByLocationMap[locKey].profit += amount;
      }
    });

    // Process expenses
    expenseTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          income: 0,
          expenses: 0,
          month: monthLabel,
        };
      }

      const amount = Math.abs(transaction.amount);
      monthlyMap[monthKey].expenses += amount;

      // Subtract from profit by location
      const locKey = transaction.locationId;
      if (!profitByLocationMap[locKey]) {
        profitByLocationMap[locKey] = {
          locationId: transaction.location.id,
          locationName: transaction.location.name,
          profit: 0,
        };
      }
      profitByLocationMap[locKey].profit -= amount;
    });

    // Convert to array and calculate net profit
    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        month: data.month,
        monthKey: key,
        income: data.income,
        expenses: data.expenses,
        profit: data.income - data.expenses,
      }));

    const profitByLocation = Object.values(profitByLocationMap).filter(
      (loc) => loc.profit !== 0
    );

    return NextResponse.json({
      monthlyData,
      revenueBySource: {
        booking: bookingRevenue,
        manual: manualRevenue,
        bookingByCategory: bookingRevenueByCategory,
      },
      profitByLocation,
    });
  } catch (error: any) {
    console.error("Error fetching monthly financial data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch monthly financial data" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
