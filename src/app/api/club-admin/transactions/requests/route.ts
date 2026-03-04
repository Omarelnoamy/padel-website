import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * GET /api/club-admin/transactions/requests
 * Get all transaction requests made by this club admin
 */
export async function GET(request: NextRequest) {
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

    // Get all transaction requests made by this club admin
    const requests = await (prisma as any).financialTransaction.findMany({
      where: {
        requestedById: userId,
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
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
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
