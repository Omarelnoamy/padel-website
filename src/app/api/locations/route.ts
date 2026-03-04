import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";
import { getAccessibleLocationIds } from "@/lib/rbac";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    // Get accessible location IDs (owned for club owners, assigned for moderators)
    const accessibleLocationIds = await getAccessibleLocationIds();

    // Debug logging
    const user = session?.user as any;
    const isModerator = user?.role === "admin" && user?.adminType === "moderator";
    if (isModerator) {
      console.log(`[Locations API] Moderator ${user?.id} - Accessible location IDs:`, accessibleLocationIds);
    }

    const where: any = {};
    
    // If user has accessible locations, filter by them
    // If empty array or super admin, show all locations
    if (accessibleLocationIds.length > 0) {
      where.id = {
        in: accessibleLocationIds,
      };
    } else {
      // For super admin or users without assignments, check if they're club owner
      const isClubOwner =
        user?.role === "club_owner" ||
        (user?.role === "admin" && user?.adminType === "club_owner");
      
      // If club owner but no accessible IDs (edge case), filter by ownerId
      if (isClubOwner && user?.id) {
        where.ownerId = user.id;
      }
      // Otherwise, if no accessible IDs and not club owner (e.g., moderator without assignments),
      // the where clause will be empty, returning no locations (correct behavior)
      
      if (isModerator && accessibleLocationIds.length === 0) {
        console.log(`[Locations API] Moderator ${user?.id} has no accessible locations - no assignments found`);
      }
    }

    const locations = await (prisma.location.findMany as any)({
      where,
      include: {
        courts: {
          orderBy: { name: "asc" },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const {
      name,
      address,
      image,
      ownerId,
      instagram,
      facebook,
      tiktok,
      googleMapsUrl,
    } = body;
    if (!name || !address) {
      return NextResponse.json(
        { error: "name and address are required" },
        { status: 400 }
      );
    }

    // If ownerId is provided, verify the user exists and is a club owner
    if (ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { role: true, adminType: true },
      });

      if (!owner) {
        return NextResponse.json(
          { error: "Owner user not found" },
          { status: 404 }
        );
      }

      const isClubOwner =
        owner.role === "club_owner" ||
        (owner.role === "admin" && owner.adminType === "club_owner");

      if (!isClubOwner) {
        return NextResponse.json(
          { error: "Owner must be a club owner" },
          { status: 400 }
        );
      }
    }

    const created = await (prisma.location.create as any)({
      data: {
        name,
        address,
        image: image || null,
        ownerId: ownerId || null,
        instagram: instagram || null,
        facebook: facebook || null,
        tiktok: tiktok || null,
        googleMapsUrl: googleMapsUrl || null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
