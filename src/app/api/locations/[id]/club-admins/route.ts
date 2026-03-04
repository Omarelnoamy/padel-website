import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/locations/[id]/club-admins
 * Get all club admins for a specific location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Find all notifications for this location that have club admin approval
    const notifications = await prisma.notification.findMany({
      where: {
        type: "admin_approval",
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter notifications to find club admins for this location (exclude revoked)
    const clubAdminUserIds: string[] = [];
    for (const notification of notifications) {
      if (notification.metadata) {
        const metadata = notification.metadata as any;
        if (metadata.revokedAt) continue; // Skip revoked assignments
        if (
          metadata.userType === "club_admin" &&
          metadata.locationId === locationId &&
          metadata.pendingUserId
        ) {
          // Check if this user is approved
          const user = await prisma.user.findUnique({
            where: { id: metadata.pendingUserId },
            select: {
              id: true,
              isApproved: true,
              userType: true,
            },
          });

          if (user && user.isApproved && user.userType === "club_admin") {
            clubAdminUserIds.push(metadata.pendingUserId);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(clubAdminUserIds)];

    // Fetch club admin users
    const clubAdmins = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        userType: "club_admin",
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

    return NextResponse.json({ clubAdmins });
  } catch (error) {
    console.error("Error fetching club admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch club admins" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations/[id]/club-admins
 * Assign a club admin to this location (body: { clubAdminId })
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const clubAdminId = body.clubAdminId;

    if (!clubAdminId) {
      return NextResponse.json(
        { error: "Club admin ID is required" },
        { status: 400 }
      );
    }

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

    const clubAdmin = await prisma.user.findUnique({
      where: { id: clubAdminId },
      select: {
        id: true,
        userType: true,
        isApproved: true,
      },
    });

    if (!clubAdmin) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (clubAdmin.userType !== "club_admin" || !clubAdmin.isApproved) {
      return NextResponse.json(
        { error: "User is not an approved club admin" },
        { status: 400 }
      );
    }

    // Check if already assigned to this location (non-revoked)
    const notifications = await prisma.notification.findMany({
      where: { type: "admin_approval" },
    });

    for (const n of notifications) {
      if (!n.metadata) continue;
      const meta = n.metadata as any;
      if (meta.revokedAt) continue;
      if (
        meta.userType === "club_admin" &&
        meta.locationId === locationId &&
        (meta.pendingUserId?.toString() || meta.pendingUserId) === clubAdminId
      ) {
        return NextResponse.json(
          { error: "Club admin is already assigned to this location" },
          { status: 400 }
        );
      }
    }

    // Create assignment via notification (same shape as approval flow)
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Club admin assigned",
        message: "Club admin was assigned to this location.",
        type: "admin_approval",
        metadata: {
          pendingUserId: clubAdminId,
          locationId,
          userType: "club_admin",
          assignedBy: user.id,
          assignedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ message: "Club admin assigned successfully" });
  } catch (error: any) {
    console.error("Error assigning club admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign club admin" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]/club-admins?clubAdminId=xxx
 * Remove (revoke) a club admin from this location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const clubAdminId = searchParams.get("clubAdminId");

    if (!clubAdminId) {
      return NextResponse.json(
        { error: "Club admin ID is required" },
        { status: 400 }
      );
    }

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

    // Find notification(s) that assigned this club admin to this location
    const notifications = await prisma.notification.findMany({
      where: { type: "admin_approval" },
      orderBy: { createdAt: "desc" },
    });

    let updated = 0;
    for (const notification of notifications) {
      if (!notification.metadata) continue;
      const metadata = notification.metadata as any;
      if (
        metadata.userType === "club_admin" &&
        metadata.locationId === locationId &&
        (metadata.pendingUserId?.toString() || metadata.pendingUserId) === clubAdminId &&
        !metadata.revokedAt
      ) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            metadata: {
              ...metadata,
              revokedAt: new Date().toISOString(),
            },
          },
        });
        updated++;
      }
    }

    if (updated === 0) {
      return NextResponse.json(
        { error: "Club admin assignment not found or already removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Club admin removed successfully" });
  } catch (error: any) {
    console.error("Error removing club admin:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove club admin" },
      { status: 500 }
    );
  }
}
