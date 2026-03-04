import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/users/search
 * Search all users (regular users, players, moderators, club owners, etc.)
 * Only accessible by admins
 * 
 * Query parameters:
 * - search: Search term (name or email) - optional
 * - limit: Max results (default: 20, max: 100)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is admin (super admin, club owner, or moderator)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isAdmin =
      user.role === "admin" ||
      user.role === "club_owner" ||
      (user.role === "admin" && user.adminType);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Build where clause with optional search
    const where: any = {};

    // Add search filter if provided
    if (searchTerm.trim()) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Fetch all users (no role or player filter)
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        adminType: true,
        userType: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            name: true,
            points: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get total count for pagination info (only if search is provided)
    const totalCount = searchTerm.trim()
      ? await prisma.user.count({ where })
      : null;

    return NextResponse.json({
      users,
      total: totalCount,
      limit,
      hasMore: totalCount ? totalCount > limit : false,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
