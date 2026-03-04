import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

/**
 * GET /api/club-owner/pending-approvals
 * Get all pending club admin and moderator approval requests for club owner's locations
 */
export async function GET(request: NextRequest) {
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

    if (!isClubOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all locations owned by this club owner
    const ownedLocations = await prisma.location.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
    });

    if (ownedLocations.length === 0) {
      return NextResponse.json({ approvals: [] });
    }

    const locationIds = ownedLocations.map((loc) => loc.id);

    // Get all notifications for admin_approval type
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: "admin_approval",
        read: false, // Only unread notifications
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter notifications to find club admin and moderator requests for owned locations
    const pendingApprovals: any[] = [];

    for (const notification of notifications) {
      if (!notification.metadata) continue;

      const metadata = notification.metadata as any;
      const notificationLocationId = metadata.locationId;

      // Check if this notification is for one of the club owner's locations
      if (!notificationLocationId || !locationIds.includes(notificationLocationId)) {
        continue;
      }

      // Check if it's a club admin or moderator request
      const isClubAdmin = metadata.userType === "club_admin";
      const isModerator = metadata.adminType === "moderator";

      if (!isClubAdmin && !isModerator) {
        continue;
      }

      // Get the pending user details
      const pendingUser = await prisma.user.findUnique({
        where: { id: metadata.pendingUserId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isApproved: true,
          userType: true,
          adminType: true,
          createdAt: true,
        },
      });

      // Only include if still pending approval
      if (pendingUser && !pendingUser.isApproved) {
        const location = ownedLocations.find(
          (loc) => loc.id === notificationLocationId
        );

        pendingApprovals.push({
          id: notification.id,
          notificationId: notification.id,
          userId: pendingUser.id,
          email: pendingUser.email,
          name: pendingUser.name,
          phone: pendingUser.phone,
          role: isModerator ? "moderator" : "club_admin",
          locationId: notificationLocationId,
          locationName: location?.name || metadata.locationName,
          createdAt: notification.createdAt,
          message: notification.message,
          title: notification.title,
        });
      }
    }

    return NextResponse.json({ approvals: pendingApprovals });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending approvals" },
      { status: 500 }
    );
  }
}
