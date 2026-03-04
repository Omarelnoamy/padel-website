import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubOwner, getOwnedLocationIds } from "@/lib/club-owner-auth";
import {
  canViewAllBookings,
  canCreateBookings,
  isModerator,
  getCurrentUser,
  getOwnedLocationIds as getRBACOwnedLocationIds,
  getAssignedLocationIds,
  getAccessibleLocationIds,
  canAccessLocation,
  requireApprovedUser,
} from "@/lib/rbac";

/**
 * GET /api/club-owner/bookings
 * Get all bookings for locations owned by the club owner
 */
export async function GET(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can view all bookings (club owner, owner partner, moderator, or super admin)
    const canView = await canViewAllBookings();
    if (!canView) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get accessible location IDs (owned for club owners, assigned for moderators)
    // Moderators can only access locations assigned to them by Super Admin
    const accessibleLocationIds = await getAccessibleLocationIds();

    if (accessibleLocationIds.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const courtId = searchParams.get("courtId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    // Validate locationId if provided
    if (locationId) {
      // Validate format (alphanumeric, dashes, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(locationId)) {
        return NextResponse.json(
          { error: "Invalid locationId format" },
          { status: 400 }
        );
      }
      // Ensure locationId is accessible (owned or assigned)
      if (!accessibleLocationIds.includes(locationId)) {
        return NextResponse.json(
          { error: "You don't have access to this location" },
          { status: 403 }
        );
      }
    }

    // Validate courtId if provided
    if (courtId && !/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      locationId: {
        in: accessibleLocationIds,
      },
    };

    if (locationId && accessibleLocationIds.includes(locationId)) {
      where.locationId = locationId;
    }

    if (courtId) {
      where.courtId = courtId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const bookings = await (prisma as any).booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            adminType: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerHour: true,
          },
        },
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error("Error fetching club owner bookings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch bookings" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}

/**
 * POST /api/club-owner/bookings
 * Create a manual booking (club owner can bypass restrictions)
 */
export async function POST(request: NextRequest) {
  try {
    // Require approved user
    await requireApprovedUser().catch(() => {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    });

    // Check if user can create bookings (not owner partner - read-only)
    const canCreate = await canCreateBookings();
    if (!canCreate) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = await requireClubOwner().catch(async () => {
      // If not club owner, check if moderator
      if (await isModerator()) {
        const user = await getCurrentUser();
        return user?.id || null;
      }
      return null;
    });

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get accessible location IDs (owned for club owners, assigned for moderators)
    const accessibleLocationIds = await getAccessibleLocationIds();

    if (accessibleLocationIds.length === 0) {
      return NextResponse.json(
        { error: "No accessible locations. Please contact Super Admin to assign locations." },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      locationId,
      courtId,
      userId: bookingUserId,
      date,
      startTime,
      endTime,
      status = "confirmed",
      category = "regular", // regular, academy, tournament
    } = data;

    // Validate required fields
    if (!locationId || !courtId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate input formats
    if (!/^[a-zA-Z0-9_-]+$/.test(locationId)) {
      return NextResponse.json(
        { error: "Invalid locationId format" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(courtId)) {
      return NextResponse.json(
        { error: "Invalid courtId format" },
        { status: 400 }
      );
    }

    // Validate category
    if (!["regular", "academy", "tournament"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Must be: regular, academy, or tournament" },
        { status: 400 }
      );
    }

    // Validate location access (owned or assigned)
    if (!accessibleLocationIds.includes(locationId)) {
      return NextResponse.json(
        { error: "You don't have access to this location" },
        { status: 403 }
      );
    }

    // Verify court belongs to location
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { location: true },
    });

    if (!court || court.locationId !== locationId) {
      return NextResponse.json(
        { error: "Court not found in this location" },
        { status: 404 }
      );
    }

    // Calculate price
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    const hours =
      endHour > startHour ? endHour - startHour : 24 - startHour + endHour;
    const totalPrice = court.pricePerHour * hours;

    // Create booking
    const booking = await (prisma as any).booking.create({
      data: {
        userId: bookingUserId || userId, // Use provided user or club owner
        locationId,
        courtId,
        date: new Date(date),
        startTime,
        endTime,
        status,
        totalPrice,
        category, // regular, academy, or tournament
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: true,
        court: true,
      },
    });

    // Auto-create financial transaction for booking revenue
    if (status === "confirmed") {
      // Use booking date with time set to start of day to match date filter logic
      const bookingDate = new Date(date);
      bookingDate.setHours(0, 0, 0, 0);

      await (prisma as any).financialTransaction.create({
        data: {
          locationId,
          courtId,
          amount: totalPrice,
          type: "income",
          source: "booking",
          description: `Booking revenue: ${court.name} - ${date} ${startTime}-${endTime}`,
          transactionDate: bookingDate,
          createdById: userId,
        },
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating club owner booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
