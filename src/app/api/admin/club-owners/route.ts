import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/admin/club-owners
 * Get all approved club owners (for super admin to assign to locations)
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is super admin
    if (
      !session?.user ||
      (session.user as any)?.role !== "admin" ||
      (session.user as any)?.adminType !== "super_admin"
    ) {
      return NextResponse.json(
        { error: "Unauthorized - Super admin access required" },
        { status: 401 }
      );
    }

    // Fetch all approved club owners
    const clubOwners = await prisma.user.findMany({
      where: {
        OR: [
          { role: "club_owner" },
          { role: "admin", adminType: "club_owner", isApproved: true },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isApproved: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clubOwners);
  } catch (error) {
    console.error("Error fetching club owners:", error);
    return NextResponse.json(
      { error: "Failed to fetch club owners" },
      { status: 500 }
    );
  }
}
