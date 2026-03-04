import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin =
      user.role === "admin" && user.adminType === "super_admin";
    const isClubOwner =
      user.role === "club_owner" ||
      (user.role === "admin" && user.adminType === "club_owner");

    if (!isSuperAdmin && !isClubOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json(); // action: "approve" or "reject"

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action required" },
        { status: 400 }
      );
    }

    // Get the user to be approved/rejected
    const pendingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        userType: true,
        isApproved: true,
      },
    });

    if (!pendingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If club owner is approving, check if it's a club admin request for their location
    if (isClubOwner && !isSuperAdmin) {
      // Find the notification to get locationId
      const notification = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "admin_approval",
          metadata: {
            path: ["pendingUserId"],
            equals: userId,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!notification || !notification.metadata) {
        return NextResponse.json(
          { error: "Request not found or already processed" },
          { status: 404 }
        );
      }

      const metadata = notification.metadata as any;
      // Club owner can approve club admin OR moderator requests for their locations
      const isClubAdminRequest = metadata.userType === "club_admin";
      const isModeratorRequest = metadata.adminType === "moderator";
      
      if ((!isClubAdminRequest && !isModeratorRequest) || !metadata.locationId) {
        return NextResponse.json(
          {
            error:
              "Unauthorized - Can only approve club admin or moderator requests for your locations",
          },
          { status: 403 }
        );
      }

      // Verify the location belongs to this club owner
      const location = await prisma.location.findUnique({
        where: { id: metadata.locationId },
        select: { ownerId: true },
      });

      if (!location || location.ownerId !== user.id) {
        return NextResponse.json(
          { error: "Unauthorized - This location does not belong to you" },
          { status: 403 }
        );
      }
    }

    if (action === "approve") {
      // Get notification metadata to check if this is a moderator approval
      // For club owners, we already have the notification from the validation above
      // For super admins, we need to find it
      let notification;
      let metadata: any;
      
      if (isClubOwner && !isSuperAdmin) {
        // We already fetched this notification during validation
        notification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "admin_approval",
            metadata: {
              path: ["pendingUserId"],
              equals: userId,
            },
          },
          orderBy: { createdAt: "desc" },
        });
        metadata = notification?.metadata as any;
      } else {
        // For super admin, find the notification
        notification = await prisma.notification.findFirst({
          where: {
            type: "admin_approval",
            metadata: {
              path: ["pendingUserId"],
              equals: userId,
            },
          },
          orderBy: { createdAt: "desc" },
        });
        metadata = notification?.metadata as any;
      }

      const isModerator = metadata?.adminType === "moderator";
      const locationId = metadata?.locationId;

      // If there's a notification record, try to mark it as processed exactly once.
      // This prevents two admins from approving/rejecting the same request concurrently.
      if (notification?.id) {
        const updated = await prisma.notification.updateMany({
          where: { id: notification.id, read: false },
          data: { read: true },
        });
        if (updated.count === 0) {
          return NextResponse.json(
            {
              error:
                "This approval request has already been processed by another admin.",
            },
            { status: 409 }
          );
        }
      }

      // Update user approval status
      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true },
      });

      // If this is a moderator approval and locationId is provided, assign location
      if (isModerator && locationId) {
        try {
          // Check if assignment already exists using findFirst with compound unique fields
          const existingAssignment = await (prisma as any).locationAssignment.findFirst({
            where: {
              userId: userId,
              locationId: locationId,
            },
          });

          // Create location assignment if it doesn't exist
          if (!existingAssignment) {
            await (prisma as any).locationAssignment.create({
              data: {
                userId: userId,
                locationId: locationId,
                assignedById: user.id, // Track who assigned (club owner or super admin)
              },
            });
            console.log(`Location assignment created for moderator ${userId} at location ${locationId}`);
          } else {
            console.log(`Location assignment already exists for moderator ${userId} at location ${locationId}`);
          }
        } catch (assignmentError: any) {
          // Log error but don't fail the approval
          console.error("Failed to create location assignment:", assignmentError);
          console.error("Assignment error details:", {
            userId,
            locationId,
            error: assignmentError.message,
          });
          // Still allow approval to proceed even if assignment creation fails
        }
      }
      
      // Send notification to the approved user
      await prisma.notification.create({
        data: {
          userId: userId,
          title: "Account Approved",
          message: "Your account has been approved! You can now access all features.",
          type: "account_approved",
        },
      });
      
      return NextResponse.json({ message: "User approved" });
    } else if (action === "reject") {
      // Get the notification to check if it's club admin or moderator
      const notification = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "admin_approval",
          metadata: {
            path: ["pendingUserId"],
            equals: userId,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const metadata = notification?.metadata as any;
      const isModerator = metadata?.adminType === "moderator";
      
      // If there's a notification record, try to mark it as processed exactly once.
      if (notification?.id) {
        const updated = await prisma.notification.updateMany({
          where: { id: notification.id, read: false },
          data: { read: true },
        });
        if (updated.count === 0) {
          return NextResponse.json(
            {
              error:
                "This request has already been processed by another admin.",
            },
            { status: 409 }
          );
        }
      }
      
      // For club admin rejection, just set isApproved to true but keep userType
      // For moderator rejection, remove admin privileges
      if (pendingUser.userType === "club_admin") {
        await prisma.user.update({
          where: { id: userId },
          data: { isApproved: true, userType: null },
        });
      } else if (isModerator) {
        // Moderator rejection - remove admin privileges
        await prisma.user.update({
          where: { id: userId },
          data: { role: "user", adminType: null, isApproved: true },
        });
      } else {
        // Other admin rejection - remove admin privileges
        await prisma.user.update({
          where: { id: userId },
          data: { role: "user", adminType: null, isApproved: true },
        });
      }
      
      // Send notification to the rejected user
      await prisma.notification.create({
        data: {
          userId: userId,
          title: "Account Request Rejected",
          message: "Your account request has been rejected. Please contact support if you believe this is an error.",
          type: "account_rejected",
        },
      });
      
      return NextResponse.json({ message: "Request rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
