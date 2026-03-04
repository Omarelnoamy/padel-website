import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/locations/[id]/moderators
 * Get all moderators assigned to a specific location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: locationId } = await params;

    // Verify location exists and belongs to club owner (if not super admin)
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { ownerId: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && location.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - This location does not belong to you" },
        { status: 403 }
      );
    }

    // Get all moderators assigned to this location
    const assignments = await (prisma as any).locationAssignment.findMany({
      where: { locationId: locationId },
      select: { userId: true },
    });

    const moderatorIds = assignments.map((assignment: any) => assignment.userId);

    if (moderatorIds.length === 0) {
      return NextResponse.json({ moderators: [] });
    }

    // Fetch moderator users
    const moderators = await prisma.user.findMany({
      where: {
        id: { in: moderatorIds },
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

/**
 * POST /api/locations/[id]/moderators
 * Assign a moderator to a location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: locationId } = await params;
    const body = await request.json();
    const { moderatorId } = body;

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 }
      );
    }

    // Verify location exists and belongs to club owner (if not super admin)
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { ownerId: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && location.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - This location does not belong to you" },
        { status: 403 }
      );
    }

    // Verify moderator exists and is approved
    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: {
        id: true,
        role: true,
        adminType: true,
        isApproved: true,
      },
    });

    if (!moderator) {
      return NextResponse.json(
        { error: "Moderator not found" },
        { status: 404 }
      );
    }

    if (
      moderator.role !== "admin" ||
      moderator.adminType !== "moderator" ||
      !moderator.isApproved
    ) {
      return NextResponse.json(
        { error: "User is not an approved moderator" },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await (prisma as any).locationAssignment.findFirst({
      where: {
        userId: moderatorId,
        locationId: locationId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Moderator is already assigned to this location" },
        { status: 400 }
      );
    }

    // Create assignment
    await (prisma as any).locationAssignment.create({
      data: {
        userId: moderatorId,
        locationId: locationId,
        assignedById: user.id,
      },
    });

    return NextResponse.json({ message: "Moderator assigned successfully" });
  } catch (error: any) {
    console.error("Error assigning moderator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign moderator" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]/moderators?moderatorId=xxx
 * Remove a moderator from a location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: locationId } = await params;
    const { searchParams } = new URL(request.url);
    const moderatorId = searchParams.get("moderatorId");

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 }
      );
    }

    // Verify location exists and belongs to club owner (if not super admin)
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { ownerId: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && location.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - This location does not belong to you" },
        { status: 403 }
      );
    }

    // Find and delete assignment
    const assignment = await (prisma as any).locationAssignment.findFirst({
      where: {
        userId: moderatorId,
        locationId: locationId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    await (prisma as any).locationAssignment.delete({
      where: { id: assignment.id },
    });

    return NextResponse.json({ message: "Moderator removed successfully" });
  } catch (error: any) {
    console.error("Error removing moderator:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove moderator" },
      { status: 500 }
    );
  }
}
