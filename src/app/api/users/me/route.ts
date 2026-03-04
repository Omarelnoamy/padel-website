import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/users/me
 * Update current user info (phone number, name, etc.)
 * Club owners can update their phone number to be displayed on their locations
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: {
        id?: string;
        role?: string;
        adminType?: string;
      };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { phone, name } = body;

    // Build update data
    const updateData: any = {};

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    if (name !== undefined) {
      updateData.name = name?.trim() || null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        adminType: true,
        userType: true,
        isApproved: true,
      },
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating user info:", error);
    return NextResponse.json(
      { error: "Failed to update user info" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/me
 * Get current user info including club admin location if applicable
 */
export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: {
        id?: string;
        role?: string;
        adminType?: string;
        userType?: string;
      };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = session.user as any;

    // Get user from database to get full info
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        adminType: true,
        userType: true,
        isApproved: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user is a club admin, get their assigned location
    let clubAdminLocationId: string | null = null;
    if (dbUser.userType === "club_admin" && dbUser.isApproved) {
      // Find the notification that was sent when this club admin was approved
      const approvalNotifications = await prisma.notification.findMany({
        where: {
          type: "admin_approval",
        },
        orderBy: { createdAt: "desc" },
      });

      // Find the notification where pendingUserId matches this user and userType is club_admin
      for (const notification of approvalNotifications) {
        if (notification.metadata) {
          const metadata = notification.metadata as any;
          // Compare user IDs (handle both string and object ID types)
          const metadataPendingUserId =
            metadata.pendingUserId?.toString() || metadata.pendingUserId;
          const currentUserId = userId?.toString() || userId;

          if (
            metadataPendingUserId &&
            currentUserId &&
            metadataPendingUserId === currentUserId &&
            metadata.userType === "club_admin" &&
            metadata.locationId
          ) {
            clubAdminLocationId =
              metadata.locationId?.toString() || metadata.locationId;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      user: {
        ...dbUser,
        clubAdminLocationId,
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
