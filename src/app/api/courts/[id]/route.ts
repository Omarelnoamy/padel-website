import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * PATCH /api/courts/[id]
 * Update an existing court
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Check if user is authenticated and is admin
    if (!session?.user || (session.user as any)?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: courtId } = await params;
    const body = await request.json();
    const { name, type, pricePerHour } = body;

    // Check if court exists
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!existingCourt) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Build update data object
    const updateData: any = {};

    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return NextResponse.json(
          { error: "Court name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (type !== undefined) {
      const validTypes = ["Indoor", "Outdoor", "Covered"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.type = type;
    }

    if (pricePerHour !== undefined) {
      const priceNum = Number(pricePerHour);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      updateData.pricePerHour = priceNum;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update court
    const updated = await prisma.court.update({
      where: { id: courtId },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating court:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      {
        error: "Failed to update court",
        details: error?.message || "Unknown error",
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
