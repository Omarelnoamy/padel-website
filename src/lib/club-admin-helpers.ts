/**
 * Club Admin Helper Functions
 * Utilities for Club Admin operations
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";

/**
 * Get the assigned location ID for the current club admin
 * Returns null if user is not a club admin or has no assigned location
 */
export async function getClubAdminLocationId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Check if user is a club admin
  if (user.role !== "user" || user.userType !== "club_admin" || !user.isApproved) {
    return null;
  }

  try {
    // Find the notification that was sent when this club admin was approved
    // The notification metadata contains the locationId assigned to this club admin
    const approvalNotifications = await prisma.notification.findMany({
      where: {
        type: "admin_approval",
      },
      orderBy: { createdAt: "desc" },
    });

    // Find the notification where pendingUserId matches this user and userType is club_admin (not revoked)
    for (const notification of approvalNotifications) {
      if (notification.metadata) {
        const metadata = notification.metadata as any;
        if (metadata.revokedAt) continue;
        const metadataPendingUserId =
          metadata.pendingUserId?.toString() || metadata.pendingUserId;
        const currentUserId = user.id?.toString() || user.id;

        if (
          metadataPendingUserId &&
          currentUserId &&
          metadataPendingUserId === currentUserId &&
          metadata.userType === "club_admin" &&
          metadata.locationId
        ) {
          return metadata.locationId?.toString() || metadata.locationId;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting club admin location:", error);
    return null;
  }
}

/**
 * Verify that a booking belongs to the club admin's assigned location
 */
export async function canAccessBooking(bookingId: string): Promise<boolean> {
  const locationId = await getClubAdminLocationId();
  if (!locationId) return false;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { locationId: true },
    });

    return booking?.locationId === locationId;
  } catch (error) {
    console.error("Error checking booking access:", error);
    return false;
  }
}
