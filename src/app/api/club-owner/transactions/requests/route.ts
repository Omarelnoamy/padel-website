import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireClubOwner,
  getOwnedLocationIds,
  isLocationOwner,
} from "@/lib/club-owner-auth";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * GET /api/club-owner/transactions/requests
 * Get all pending transaction requests for owned locations
 */
export async function GET(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    const userId = await requireClubOwner();
    const ownedLocationIds = await getOwnedLocationIds();

    if (ownedLocationIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    // Get all pending transaction requests for owned locations
    const requests = await (prisma as any).financialTransaction.findMany({
      where: {
        locationId: {
          in: ownedLocationIds,
        },
        status: "pending",
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
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching transaction requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transaction requests" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
