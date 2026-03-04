import { NextRequest, NextResponse } from "next/server";
import {
  requireApprovedUser,
  canViewFinancials,
  getAccessibleLocationIds,
} from "@/lib/rbac";
import { runDailyFinancialProcessing } from "@/lib/daily-financial-processing";

/**
 * POST /api/club-owner/financials/run-daily-processing
 *
 * Manually trigger daily financial processing for all locations
 * the current user has access to (club owner / super admin).
 *
 * This reuses the same core logic as the cron endpoint and is
 * safe to run multiple times thanks to the unique constraint
 * on (locationId, operationalDate).
 */
export async function POST(request: NextRequest) {
  try {
    // Require authenticated & approved user
    await requireApprovedUser();

    // Only users allowed to view financials (club owner / owner partner / super admin)
    const canView = await canViewFinancials();
    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Restrict processing to locations the user can actually access
    const accessibleLocationIds = await getAccessibleLocationIds();
    if (accessibleLocationIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No accessible locations to process",
          processedAt: new Date().toISOString(),
          results: [],
        },
        { status: 200 }
      );
    }

    const result = await runDailyFinancialProcessing({
      locationIds: accessibleLocationIds,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(
      "Error in manual daily financial processing trigger:",
      error
    );
    return NextResponse.json(
      {
        error:
          error?.message || "Failed to run manual daily financial processing",
      },
      { status: 500 }
    );
  }
}

