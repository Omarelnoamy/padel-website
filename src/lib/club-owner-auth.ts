import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

/**
 * Check if the current user is a club owner
 */
export async function isClubOwner(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const user = session.user as any;
  return (
    user.role === "club_owner" ||
    (user.role === "admin" && user.adminType === "club_owner")
  );
}

/**
 * Get the current user's ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as any;
  return user.id || null;
}

/**
 * Get all location IDs owned by the current club owner
 */
export async function getOwnedLocationIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const isOwner = await isClubOwner();
  if (!isOwner) return [];

  const locations = await prisma.location.findMany({
    where: { ownerId: userId } as any,
  });

  return locations.map((loc) => loc.id);
}

/**
 * Check if a location is owned by the current club owner
 */
export async function isLocationOwner(locationId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const location = (await prisma.location.findUnique({
    where: { id: locationId },
  })) as any;

  return location?.ownerId === userId;
}

/**
 * Check if a court belongs to an owned location
 */
export async function isCourtOwner(courtId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const court = (await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      location: true,
    },
  })) as any;

  return court?.location?.ownerId === userId;
}

/**
 * Require club owner authentication - throws error if not authorized
 */
export async function requireClubOwner(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized: Please sign in");
  }

  const isOwner = await isClubOwner();
  if (!isOwner) {
    throw new Error("Unauthorized: Club owner access required");
  }

  return userId;
}
