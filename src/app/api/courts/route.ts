import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 }
      );
    }

    const courts = await prisma.court.findMany({
      where: { locationId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(courts);
  } catch (error) {
    console.error("Error fetching courts:", error);
    return NextResponse.json(
      { error: "Failed to fetch courts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is admin
    if (!session?.user || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { locationId, name, type, pricePerHour } = await req.json();
    if (!locationId || !name || !type || pricePerHour === undefined) {
      return NextResponse.json(
        { error: "locationId, name, type, pricePerHour are required" },
        { status: 400 }
      );
    }

    // Validate input formats
    if (!/^[a-zA-Z0-9_-]+$/.test(locationId)) {
      return NextResponse.json(
        { error: "Invalid locationId format" },
        { status: 400 }
      );
    }

    // Validate price
    const priceNum = Number(pricePerHour);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    const created = await prisma.court.create({
      data: {
        locationId,
        name,
        type,
        pricePerHour: Number(pricePerHour),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating court:", error);
    return NextResponse.json(
      { error: "Failed to create court" },
      { status: 500 }
    );
  }
}
