import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  canCreateFixedBooking,
  canViewFixedBookings,
  getAccessibleLocationIds,
} from "@/lib/rbac";
import {
  checkFixedBookingOverlap,
  getDayOfWeek,
} from "@/lib/fixed-bookings";

/**
 * GET /api/fixed-bookings
 * Get all fixed bookings with optional filters
 * Query params:
 * - courtId: Filter by court
 * - locationId: Filter by location
 * - userId: Filter by user
 * - status: Filter by status (ACTIVE, PAUSED, CANCELED)
 */
export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // All authenticated users can view fixed bookings
    if (!(await canViewFixedBookings())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get("courtId");
    const locationId = searchParams.get("locationId");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") as
      | "ACTIVE"
      | "PAUSED"
      | "CANCELED"
      | null;

    // Build where clause
    const where: any = {};

    if (courtId) {
      where.courtId = courtId;
    }

    if (locationId) {
      where.locationId = locationId;
    } else {
      // For moderators, filter by accessible locations
      const user = session.user as any;
      const isModerator =
        user.role === "admin" && user.adminType === "moderator";

      if (isModerator) {
        const accessibleLocationIds = await getAccessibleLocationIds();
        if (accessibleLocationIds.length > 0) {
          where.locationId = { in: accessibleLocationIds };
        } else {
          // No accessible locations, return empty
          return NextResponse.json([]);
        }
      }
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const fixedBookings = await prisma.fixedBooking.findMany({
      where,
      include: {
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    return NextResponse.json(fixedBookings);
  } catch (error) {
    console.error("Error fetching fixed bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixed bookings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fixed-bookings
 * Create a new fixed booking
 * Auth: Club Owner or Moderator
 */
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    if (!(await canCreateFixedBooking())) {
      return NextResponse.json(
        { error: "Unauthorized - Club Owner or Moderator access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      courtId,
      userId, // Optional: null if for owner/moderator themselves
      dayOfWeek,
      startTime,
      endTime,
      startDate,
      endDate, // Optional: null for infinite
      notes,
      category, // Optional: defaults to "regular"
    } = body;

    // Validation
    if (!courtId || dayOfWeek === undefined || !startTime || !endTime || !startDate) {
      return NextResponse.json(
        {
          error:
            "courtId, dayOfWeek, startTime, endTime, and startDate are required",
        },
        { status: 400 }
      );
    }

    // Validate dayOfWeek (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "startTime and endTime must be in HH:MM format" },
        { status: 400 }
      );
    }

    // Validate time range (handle overnight bookings like 22:00 to 00:00)
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight bookings (e.g., 22:00 to 00:00)
    // If endTime is less than startTime, it's an overnight booking
    const isOvernight = endMinutes < startMinutes;
    const endMinutesFinal = isOvernight ? endMinutes + 1440 : endMinutes; // Add 24 hours for overnight

    // Validate that endTime is after startTime (accounting for overnight)
    if (endMinutesFinal <= startMinutes) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    // Validate minimum duration (at least 1 hour)
    const durationMinutes = endMinutesFinal - startMinutes;
    if (durationMinutes < 60) {
      return NextResponse.json(
        { error: "Booking duration must be at least 1 hour" },
        { status: 400 }
      );
    }

    // Validate category
    const bookingCategory = category || "regular";
    const allowedCategories = ["regular", "academy", "tournament"];
    if (!allowedCategories.includes(bookingCategory)) {
      return NextResponse.json(
        { error: "Invalid category. Must be regular, academy, or tournament" },
        { status: 400 }
      );
    }

    // Get court and location
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { location: true },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Check moderator permissions (can only create for assigned locations)
    const user = session.user as any;
    const isModerator =
      user.role === "admin" && user.adminType === "moderator";

    if (isModerator) {
      const accessibleLocationIds = await getAccessibleLocationIds();
      if (!accessibleLocationIds.includes(court.locationId)) {
        return NextResponse.json(
          {
            error:
              "Unauthorized - Moderator can only create fixed bookings for assigned locations",
          },
          { status: 403 }
        );
      }
    }

    // Check for overlapping fixed bookings
    const overlap = await checkFixedBookingOverlap(
      courtId,
      dayOfWeek,
      startTime,
      endTime,
      new Date(startDate),
      endDate ? new Date(endDate) : null
    );

    if (overlap) {
      return NextResponse.json(
        {
          error:
            "A fixed booking already exists for this court, day, and time slot. Please choose a different time or court.",
        },
        { status: 400 }
      );
    }

    // Create fixed booking
    const fixedBooking = await prisma.fixedBooking.create({
      data: {
        courtId,
        locationId: court.locationId,
        userId: userId || null,
        createdById: session.user.id,
        category: bookingCategory,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: "ACTIVE",
        notes: notes || null,
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(fixedBooking, { status: 201 });
  } catch (error: any) {
    console.error("Error creating fixed booking:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A fixed booking already exists for this court, day, and time slot",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create fixed booking" },
      { status: 500 }
    );
  }
}
