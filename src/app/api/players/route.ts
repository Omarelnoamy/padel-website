import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMatchingPlayer } from "@/lib/point-system";

export async function GET() {
  try {
    // Sort by points descending (highest first), then by rank as tiebreaker
    const players = await prisma.player.findMany({
      orderBy: [
        { points: "desc" }, // Highest points first
        { rank: "asc" }, // Then by rank for same points
      ],
    });
    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      points,
      category,
      location,
      useMatchedPoints,
      userId, // REQUIRED: userId to link player to user
    } = await req.json();

    // CRITICAL FIX #1: Make userId required (no standalone players)
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required. Players must be linked to a user." },
        { status: 400 }
      );
    }

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    // CRITICAL FIX #2: Wrap in transaction to prevent race conditions
    const result = await prisma.$transaction(
      async (tx) => {
        // Validate user exists and doesn't already have a player (atomic check)
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { player: true },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (user.player) {
          throw new Error("USER_ALREADY_HAS_PLAYER");
        }

        // Use user's name if name not provided
        let finalName = name;
        if (!finalName && user.name) {
          finalName = user.name;
        }

        // Check for match if not explicitly using matched points
        const parsedPoints =
          typeof points === "number"
            ? points
            : Number.isFinite(Number(points))
            ? Number(points)
            : 0;

        let finalPoints = parsedPoints;
        let matchedPlayer = null;

        if (!useMatchedPoints) {
          const { match } = findMatchingPlayer(finalName);
          if (match) {
            matchedPlayer = match;
            // Don't auto-assign points, wait for confirmation
          }
        } else {
          // User confirmed match, use matched points
          const { match } = findMatchingPlayer(finalName);
          if (match) {
            finalPoints = match.points;
          }
        }

        // CRITICAL FIX #3: Get max rank within transaction (prevents race condition on rank)
        const maxRankPlayer = await tx.player.findFirst({
          orderBy: { rank: "desc" },
          select: { rank: true },
        });

        const newRank = (maxRankPlayer?.rank || 0) + 1;

        // Create player (userId is required, so always linked)
        const player = await tx.player.create({
          data: {
            name: finalName,
            points: finalPoints,
            rank: newRank,
            category: category || null,
            location,
            wins: 0,
            losses: 0,
            userId: userId, // Always linked to user
          },
        });

        return {
          player,
          matchedPlayer: matchedPlayer
            ? {
                name: matchedPlayer.name,
                points: matchedPlayer.points,
              }
            : null,
        };
      },
      {
        isolationLevel: "Serializable", // Highest isolation to prevent race conditions
        timeout: 10000, // 10 second timeout
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating player:", error);

    // Handle transaction errors
    if (error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (error.message === "USER_ALREADY_HAS_PLAYER") {
      return NextResponse.json(
        { error: "User already has a player record" },
        { status: 400 }
      );
    }

    // Handle Prisma unique constraint violations
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("userId")) {
        return NextResponse.json(
          { error: "User already has a player record" },
          { status: 400 }
        );
      }
      if (error.meta?.target?.includes("name")) {
        return NextResponse.json(
          {
            error:
              "A player with this name already exists. Player names must be unique.",
          },
          { status: 400 }
        );
      }
    }

    // Handle transaction timeout
    if (error.code === "P2034") {
      return NextResponse.json(
        {
          error:
            "Operation timed out. Another admin may be creating a player. Please try again.",
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create player",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
