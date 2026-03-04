import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/players/[id]
 * Get a single player by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const player = await prisma.player.findUnique({
      where: { id: const { id } = await params; id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json(
      { error: "Failed to fetch player" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/players/[id]
 * Update a player (points, category, location, etc.)
 * Only admins can update players
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is admin
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

    const body = await request.json();
    const { name, points, category, location } = body;

    // Check if player exists
    const existingPlayer = await prisma.player.findUnique({
      where: { id: const { id } = await params; id },
    });

    if (!existingPlayer) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (points !== undefined) {
      const parsedPoints = Number(points);
      if (isNaN(parsedPoints) || parsedPoints < 0) {
        return NextResponse.json(
          { error: "Points must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.points = parsedPoints;
    }

    if (category !== undefined) {
      updateData.category = category?.trim() || null;
    }

    if (location !== undefined) {
      updateData.location = location.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If points changed, recalculate ranks for all players
    if (updateData.points !== undefined) {
      // Update player first
      const updatedPlayer = await prisma.player.update({
        where: { id: const { id } = await params; id },
        data: updateData,
      });

      // Recalculate all ranks based on points (descending)
      await recalculateRanks();

      // Fetch updated player with new rank
      const playerWithNewRank = await prisma.player.findUnique({
        where: { id: const { id } = await params; id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json({ player: playerWithNewRank });
    } else {
      // No points change, just update
      const updatedPlayer = await prisma.player.update({
        where: { id: const { id } = await params; id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json({ player: updatedPlayer });
    }
  } catch (error: any) {
    console.error("Error updating player:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A player with this name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/players/[id]
 * Delete a player (soft delete or hard delete)
 * Only super admins can delete players
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is super admin
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin =
      user.role === "admin" && user.adminType === "super_admin";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Super admin access required" },
        { status: 403 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id: const { id } = await params; id },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Delete player
    await prisma.player.delete({
      where: { id: const { id } = await params; id },
    });

    // Recalculate ranks after deletion
    await recalculateRanks();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}

/**
 * Recalculate ranks for all players based on points (descending)
 */
async function recalculateRanks() {
  // Get all players sorted by points (descending)
  const players = await prisma.player.findMany({
    orderBy: [
      { points: "desc" },
      { createdAt: "asc" }, // Tiebreaker: older players rank higher
    ],
  });

  // Update ranks
  for (let i = 0; i < players.length; i++) {
    await prisma.player.update({
      where: { id: players[i].id },
      data: { rank: i + 1 },
    });
  }
}
