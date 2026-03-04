import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/admin/moderators
 * Get all approved moderators
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isClubOwner =
      user.role === "club_owner" ||
      (user.role === "admin" && user.adminType === "club_owner");
    const isSuperAdmin =
      user.role === "admin" && user.adminType === "super_admin";

    if (!isClubOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all approved moderators
    const moderators = await prisma.user.findMany({
      where: {
        role: "admin",
        adminType: "moderator",
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ moderators });
  } catch (error) {
    console.error("Error fetching moderators:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderators" },
      { status: 500 }
    );
  }
}
