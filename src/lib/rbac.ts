/**
 * Role-Based Access Control (RBAC) Utility
 * Centralized permission management for all user types
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export type UserRole = "user" | "admin" | "club_owner";
export type AdminType =
  | "super_admin"
  | "club_owner"
  | "owner_partner"
  | "moderator"
  | "timing_organizer"
  | "tournament_organizer"
  | "coach_admin";
export type UserType = "club_admin";

export interface UserSession {
  id: string;
  role: UserRole;
  adminType?: AdminType | null;
  userType?: UserType | null;
  isApproved: boolean;
}

/**
 * Get current user session with type safety
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as any;
  return {
    id: user.id,
    role: user.role as UserRole,
    adminType: user.adminType as AdminType | null,
    userType: user.userType as UserType | null,
    isApproved: user.isApproved ?? true,
  };
}

/**
 * Require user to be approved - throws error if not approved
 * Use this in API routes to enforce approval status
 */
export async function requireApprovedUser(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in");
  }

  // Regular users are always approved
  if (user.role === "user" && !user.userType) {
    return user;
  }

  // Admins and club owners must be approved
  if (
    (user.role === "admin" || user.role === "club_owner") &&
    !user.isApproved
  ) {
    throw new Error("Unauthorized: Account pending approval");
  }

  return user;
}

/**
 * Role Checkers
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return (
    user?.role === "admin" &&
    user.adminType === "super_admin" &&
    user.isApproved === true
  );
}

export async function isClubOwner(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return (
    (user.role === "club_owner" ||
      (user.role === "admin" && user.adminType === "club_owner")) &&
    user.isApproved === true
  );
}

export async function isOwnerPartner(): Promise<boolean> {
  const user = await getCurrentUser();
  return (
    user?.role === "admin" &&
    user.adminType === "owner_partner" &&
    user.isApproved === true
  );
}

export async function isModerator(): Promise<boolean> {
  const user = await getCurrentUser();
  return (
    user?.role === "admin" &&
    user.adminType === "moderator" &&
    user.isApproved === true
  );
}

export async function isClubAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "user" && user.userType === "club_admin";
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin" && user.isApproved === true;
}

/**
 * Permission Checkers - Read Access
 */

/**
 * Can view financial data (income, expenses, revenue)
 * Moderators CANNOT view financial data (operational data only)
 */
export async function canViewFinancials(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Moderators cannot view financial ownership data
  if (await isModerator()) return false;

  return (
    (await isClubOwner()) || (await isOwnerPartner()) || (await isSuperAdmin())
  );
}

export async function canViewAllBookings(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return (
    (await isClubOwner()) ||
    (await isOwnerPartner()) ||
    (await isModerator()) ||
    (await isSuperAdmin())
  );
}

export async function canViewExpenses(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Moderator cannot view expenses
  return (
    (await isClubOwner()) || (await isOwnerPartner()) || (await isSuperAdmin())
  );
}

/**
 * Permission Checkers - Write Access
 */
export async function canCreateBookings(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner partner is read-only
  if (await isOwnerPartner()) return false;

  return (
    (await isClubOwner()) ||
    (await isModerator()) ||
    (await isSuperAdmin()) ||
    (await isAdmin()) ||
    (await isClubAdmin())
  );
}

export async function canModifyBookings(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner partner is read-only
  if (await isOwnerPartner()) return false;

  return (
    (await isClubOwner()) || (await isModerator()) || (await isSuperAdmin())
  );
}

export async function canCancelBookings(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner partner is read-only
  if (await isOwnerPartner()) return false;

  return (
    (await isClubOwner()) ||
    (await isModerator()) ||
    (await isSuperAdmin()) ||
    (await isAdmin()) ||
    (await isClubAdmin())
  );
}

/**
 * Can manage financial transactions (create, edit, delete)
 * Moderators CANNOT manage financial transactions
 */
export async function canManageFinancialTransactions(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner partner and moderator cannot manage transactions
  if (await isOwnerPartner()) return false;
  if (await isModerator()) return false;

  return (await isClubOwner()) || (await isSuperAdmin());
}

/**
 * Can manage locations (create, edit, delete, assign moderators)
 * Moderators CANNOT manage locations (only Super Admin and Club Owners)
 */
export async function canManageLocations(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Only super admin and club owners can manage locations
  // Moderators cannot create/edit/delete locations
  return (await isSuperAdmin()) || (await isClubOwner());
}

/**
 * Can hard delete records (bookings, transactions, etc.)
 * Moderators CANNOT hard delete - they can only soft delete (cancel bookings)
 */
export async function canHardDelete(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Moderators cannot hard delete anything
  if (await isModerator()) return false;
  if (await isOwnerPartner()) return false; // Owner partner is read-only

  return (await isClubOwner()) || (await isSuperAdmin());
}

/**
 * Can view operational data (bookings, schedules, daily operations)
 * Moderators CAN view operational data for assigned locations
 */
export async function canViewOperationalData(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return (
    (await isClubOwner()) ||
    (await isModerator()) ||
    (await isOwnerPartner()) ||
    (await isSuperAdmin())
  );
}

/**
 * Can approve or reject transaction requests
 * Moderators CANNOT approve financial transactions (only Club Owners and Super Admin)
 */
export async function canApproveTransactions(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Moderators cannot approve financial transactions
  if (await isModerator()) return false;

  return (await isClubOwner()) || (await isSuperAdmin());
}

export async function canApproveUsers(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Only super admin can approve users
  return await isSuperAdmin();
}

export async function canSetBookingCategories(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner partner cannot set categories (read-only)
  if (await isOwnerPartner()) return false;

  return (
    (await isClubOwner()) || (await isModerator()) || (await isSuperAdmin())
  );
}

/**
 * Fixed Bookings Permissions
 */

/**
 * Can create fixed bookings
 * - Club Owners: Can create for any user or themselves
 * - Moderators: Can create only for assigned locations
 */
export async function canCreateFixedBooking(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return (await isClubOwner()) || (await isModerator());
}

/**
 * Can edit a specific fixed booking
 * - Club Owners: Can edit all fixed bookings
 * - Moderators: Can only edit their own fixed bookings (created by them)
 */
export async function canEditFixedBooking(
  createdById: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  if (await isClubOwner()) return true;
  if (await isModerator()) {
    // Moderators can only edit their own fixed bookings
    return user.id === createdById;
  }

  return false;
}

/**
 * Can delete a specific fixed booking
 * - Club Owners: Can delete all
 * - Moderators: Can only delete their own
 */
export async function canDeleteFixedBooking(
  createdById: string
): Promise<boolean> {
  return canEditFixedBooking(createdById);
}

/**
 * Can view fixed bookings
 * - All authenticated users can view (for seeing blocked slots)
 */
export async function canViewFixedBookings(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Booking Restrictions Checkers
 */
export async function hasUnrestrictedBooking(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Club admin, moderators, club owners, and admins have unrestricted booking
  return (
    (await isClubAdmin()) ||
    (await isModerator()) ||
    (await isClubOwner()) ||
    (await isAdmin())
  );
}

export async function hasDailyBookingLimit(): Promise<boolean> {
  // Regular users have daily limit, all others don't
  const user = await getCurrentUser();
  if (!user) return true; // Guests have limit

  return !(await hasUnrestrictedBooking());
}

export async function requiresConsecutiveSlots(): Promise<boolean> {
  // Regular users require consecutive slots, all others don't
  const user = await getCurrentUser();
  if (!user) return true; // Guests require consecutive

  return !(await hasUnrestrictedBooking());
}

/**
 * Get owned location IDs for current user (club owners only)
 */
export async function getOwnedLocationIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const isOwner = await isClubOwner();
  if (!isOwner) return [];

  const locations = await prisma.location.findMany({
    where: { ownerId: user.id } as any,
  });

  return locations.map((loc) => loc.id);
}

/**
 * Get assigned location IDs for moderators
 * Moderators can only access locations assigned to them by Super Admin
 */
export async function getAssignedLocationIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const isMod = await isModerator();
  if (!isMod) return [];

  try {
    // Use Prisma's locationAssignment model (generated after migration)
    const assignments = await (prisma as any).locationAssignment.findMany({
      where: { userId: user.id },
      select: { locationId: true },
    });

    const locationIds = assignments.map((assignment: { locationId: string }) => assignment.locationId);
    
    // Debug logging (can be removed in production)
    if (locationIds.length === 0) {
      console.log(`[RBAC] Moderator ${user.id} has no location assignments`);
    } else {
      console.log(`[RBAC] Moderator ${user.id} has ${locationIds.length} assigned location(s):`, locationIds);
    }
    
    return locationIds;
  } catch (error: any) {
    // If LocationAssignment table doesn't exist yet (during migration), return empty
    console.warn("LocationAssignment table not found or error:", error?.message || error);
    return [];
  }
}

/**
 * Get all accessible location IDs for current user
 * Combines owned locations (club owners) and assigned locations (moderators)
 */
export async function getAccessibleLocationIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  // Super admin can access all locations
  if (await isSuperAdmin()) {
    const allLocations = await prisma.location.findMany({
      select: { id: true },
    });
    return allLocations.map((loc) => loc.id);
  }

  // Club owners get owned locations
  const ownedIds = await getOwnedLocationIds();
  if (ownedIds.length > 0) return ownedIds;

  // Moderators get assigned locations
  const assignedIds = await getAssignedLocationIds();
  if (assignedIds.length > 0) return assignedIds;

  // Owner partner gets owned locations (same as club owner)
  if (await isOwnerPartner()) {
    return ownedIds;
  }

  return [];
}

/**
 * Check if user can access a specific location
 */
export async function canAccessLocation(locationId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admin can access all locations
  if (await isSuperAdmin()) return true;

  // Get all accessible location IDs (owned or assigned)
  const accessibleIds = await getAccessibleLocationIds();
  return accessibleIds.includes(locationId);
}

/**
 * Require specific permission - throws error if not authorized
 */
export async function requirePermission(
  permission: () => Promise<boolean>,
  errorMessage: string = "Unauthorized"
): Promise<void> {
  const hasPermission = await permission();
  if (!hasPermission) {
    throw new Error(errorMessage);
  }
}

/**
 * Get user's readable role name
 */
export async function getUserRoleName(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "Guest";

  if (await isSuperAdmin()) return "Super Admin";
  if (await isClubOwner()) return "Club Owner";
  if (await isOwnerPartner()) return "Owner (Partner)";
  if (await isModerator()) return "Moderator";
  if (await isClubAdmin()) return "Club Admin";
  if (user.role === "admin") return "Admin";
  return "Player";
}
