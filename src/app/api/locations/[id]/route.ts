import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { requireApprovedUser } from "@/lib/rbac";

/**
 * PATCH /api/locations/[id]
 * Update an existing location
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

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: locationId } = await params;
    const body = await request.json();
    const {
      name,
      address,
      image,
      ownerId,
      cancellationHours,
      instagram,
      facebook,
      tiktok,
      googleMapsUrl,
      instapayPhone,
      openingTime,
      closingTime,
    } = body;

    // Check if location exists
    const existingLocation = (await prisma.location.findUnique({
      where: { id: locationId },
    })) as any;

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Check if user is club owner trying to update their own location
    const isClubOwner =
      (session.user as any)?.role === "club_owner" ||
      ((session.user as any)?.role === "admin" &&
        (session.user as any)?.adminType === "club_owner");

    // Check if user is admin (super admin or other admin types)
    const isAdmin = (session.user as any)?.role === "admin";

    // Helper: validate time in HH:MM 24-hour format
    const isValidTime = (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      return timeRegex.test(value);
    };

    // Club owners can only update cancellationHours for their own locations
    if (isClubOwner && existingLocation.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only update your own locations" },
        { status: 403 }
      );
    }

    // If not admin and not club owner, deny access
    if (!isAdmin && !isClubOwner) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or Club Owner access required" },
        { status: 403 }
      );
    }

    // If ownerId is provided, verify the user exists and is a club owner
    if (ownerId !== undefined) {
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
    }

    // Update location
    // Club owners can only update cancellationHours, admins can update everything
    const updateData: any = {};

    if (isClubOwner) {
      // Club owners can update cancellationHours, instapayPhone, and operating hours
      if (cancellationHours !== undefined) {
        if (
          typeof cancellationHours !== "number" ||
          cancellationHours < 0 ||
          cancellationHours > 24
        ) {
          return NextResponse.json(
            { error: "Cancellation hours must be a number between 0 and 24" },
            { status: 400 }
          );
        }
        updateData.cancellationHours = cancellationHours;
      }
      if (instapayPhone !== undefined) {
        updateData.instapayPhone = instapayPhone || null;
      }
      if (openingTime !== undefined) {
        if (
          openingTime !== null &&
          openingTime !== "" &&
          !isValidTime(openingTime)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid opening time format. Use HH:MM in 24-hour format, e.g. 09:00",
            },
            { status: 400 }
          );
        }
        updateData.openingTime = openingTime || null;
      }
      if (closingTime !== undefined) {
        if (
          closingTime !== null &&
          closingTime !== "" &&
          !isValidTime(closingTime)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid closing time format. Use HH:MM in 24-hour format, e.g. 05:00",
            },
            { status: 400 }
          );
        }
        updateData.closingTime = closingTime || null;
      }
      // If club owner provided neither field, return error
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          {
            error:
              "Club owners can only update cancellation hours, operating hours, or InstaPay phone number",
          },
          { status: 400 }
        );
      }
    } else {
      // Admins can update everything
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (image !== undefined) updateData.image = image || null;
      if (ownerId !== undefined) updateData.ownerId = ownerId || null;
      if (instagram !== undefined) updateData.instagram = instagram || null;
      if (facebook !== undefined) updateData.facebook = facebook || null;
      if (tiktok !== undefined) updateData.tiktok = tiktok || null;
      if (googleMapsUrl !== undefined)
        updateData.googleMapsUrl = googleMapsUrl || null;
      if (instapayPhone !== undefined)
        updateData.instapayPhone = instapayPhone || null;
      if (openingTime !== undefined) {
        if (
          openingTime !== null &&
          openingTime !== "" &&
          !isValidTime(openingTime)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid opening time format. Use HH:MM in 24-hour format, e.g. 09:00",
            },
            { status: 400 }
          );
        }
        updateData.openingTime = openingTime || null;
      }
      if (closingTime !== undefined) {
        if (
          closingTime !== null &&
          closingTime !== "" &&
          !isValidTime(closingTime)
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid closing time format. Use HH:MM in 24-hour format, e.g. 05:00",
            },
            { status: 400 }
          );
        }
        updateData.closingTime = closingTime || null;
      }
      if (cancellationHours !== undefined) {
        if (
          typeof cancellationHours !== "number" ||
          cancellationHours < 0 ||
          cancellationHours > 24
        ) {
          return NextResponse.json(
            { error: "Cancellation hours must be a number between 0 and 24" },
            { status: 400 }
          );
        }
        updateData.cancellationHours = cancellationHours;
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    console.log("Updating location with data:", updateData);
    console.log("Location ID:", locationId);

    const updated = await prisma.location.update({
      where: { id: locationId },
      data: updateData,
    });

    // Fetch related data separately if needed
    const locationWithRelations = await (prisma.location.findUnique as any)({
      where: { id: locationId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        courts: {
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json(locationWithRelations || updated, { status: 200 });
  } catch (error: any) {
    console.error("Error updating location:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      {
        error: "Failed to update location",
        details: error?.message || "Unknown error",
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
