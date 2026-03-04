import { NextRequest, NextResponse } from "next/server";
import { findMatchingPlayer } from "@/lib/point-system";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { match, similarity } = findMatchingPlayer(name);

    if (match) {
      return NextResponse.json({
        hasMatch: true,
        match: {
          name: match.name,
          points: match.points,
        },
        similarity: Math.round(similarity * 100),
      });
    }

    return NextResponse.json({
      hasMatch: false,
      similarity: Math.round(similarity * 100),
    });
  } catch (error) {
    console.error("Error checking match:", error);
    return NextResponse.json(
      { error: "Failed to check match" },
      { status: 500 }
    );
  }
}

