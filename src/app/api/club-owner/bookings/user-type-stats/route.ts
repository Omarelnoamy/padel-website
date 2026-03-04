import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, getOwnedLocationIds } from "@/lib/club-owner-auth";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * GET /api/club-owner/bookings/user-type-stats
 * Get booking statistics by user type
 */
export async function GET(request: NextRequest) {
  try {
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    await requireClubOwner();
    const ownedLocationIds = await getOwnedLocationIds();

    if (ownedLocationIds.length === 0) {
      return NextResponse.json({
        stats: {
          player: 0,
          clubAdmin: 0,
          clubOwner: 0,
          moderator: 0,
          other: 0,
        },
      });
    }

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = {
      locationId: {
        in: ownedLocationIds,
      },
      status: "confirmed", // Only count confirmed bookings
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Fetch bookings with user information
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            role: true,
            adminType: true,
            userType: true,
          },
        },
      },
    });

    // Categorize bookings by user type
    const stats = {
      player: 0,
      clubAdmin: 0,
      clubOwner: 0,
      moderator: 0,
      other: 0,
    };

    bookings.forEach((booking) => {
      const user = booking.user;

      // Check user type based on role, adminType, and userType
      if (user.role === "user" && user.userType === "club_admin") {
        stats.clubAdmin++;
      } else if (user.role === "admin" && user.adminType === "club_owner") {
        stats.clubOwner++;
      } else if (user.role === "admin" && user.adminType === "moderator") {
        stats.moderator++;
      } else if (user.role === "user") {
        stats.player++;
      } else {
        stats.other++;
      }
    });

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error fetching user type booking stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking statistics" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
