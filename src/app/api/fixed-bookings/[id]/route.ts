import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  canEditFixedBooking,
  canDeleteFixedBooking,
} from "@/lib/rbac";
import { checkFixedBookingOverlap } from "@/lib/fixed-bookings";

/**
 * GET /api/fixed-bookings/[id]
 * Get a single fixed booking by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string };
    } | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const fixedBooking = await prisma.fixedBooking.findUnique({
      where: { id },
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

    if (!fixedBooking) {
      return NextResponse.json(
        { error: "Fixed booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(fixedBooking);
  } catch (error) {
    console.error("Error fetching fixed booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch fixed booking" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/fixed-bookings/[id]
 * Update a fixed booking
 * Auth: Club Owner (all) or Moderator (own only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing fixed booking
    const existing = await prisma.fixedBooking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fixed booking not found" },
        { status: 404 }
      );
    }

    // Check permission
    if (!(await canEditFixedBooking(existing.createdById))) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You can only edit fixed bookings you created",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      courtId,
      userId,
      dayOfWeek,
      startTime,
      endTime,
      startDate,
      endDate,
      status,
      category,
      notes,
    } = body;

    // Build update data
    const updateData: any = {};

    if (courtId !== undefined) {
      // Validate court exists
      const court = await prisma.court.findUnique({
        where: { id: courtId },
      });
      if (!court) {
        return NextResponse.json(
          { error: "Court not found" },
          { status: 404 }
        );
      }
      updateData.courtId = courtId;
      updateData.locationId = court.locationId;
    }

    if (userId !== undefined) {
      updateData.userId = userId || null;
    }

    if (dayOfWeek !== undefined) {
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: "dayOfWeek must be between 0 and 6" },
          { status: 400 }
        );
      }
      updateData.dayOfWeek = parseInt(dayOfWeek);
    }

    if (startTime !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime)) {
        return NextResponse.json(
          { error: "startTime must be in HH:MM format" },
          { status: 400 }
        );
      }
      updateData.startTime = startTime;
    }

    if (endTime !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(endTime)) {
        return NextResponse.json(
          { error: "endTime must be in HH:MM format" },
          { status: 400 }
        );
      }
      updateData.endTime = endTime;
    }

    // Validate time range if both times are provided (handle overnight bookings)
    if (updateData.startTime && updateData.endTime) {
      const [startHour, startMin] = updateData.startTime.split(":").map(Number);
      const [endHour, endMin] = updateData.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight bookings (e.g., 22:00 to 00:00)
      const isOvernight = endMinutes < startMinutes;
      const endMinutesFinal = isOvernight ? endMinutes + 1440 : endMinutes; // Add 24 hours for overnight

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
    }

    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    if (status !== undefined) {
      if (!["ACTIVE", "PAUSED", "CANCELED"].includes(status)) {
        return NextResponse.json(
          { error: "status must be ACTIVE, PAUSED, or CANCELED" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (category !== undefined) {
      const allowedCategories = ["regular", "academy", "tournament"];
      if (!allowedCategories.includes(category)) {
        return NextResponse.json(
          {
            error:
              "Invalid category. Must be regular, academy, or tournament",
          },
          { status: 400 }
        );
      }
      updateData.category = category;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Check for overlaps if time/day/court changed
    const finalCourtId = updateData.courtId || existing.courtId;
    const finalDayOfWeek = updateData.dayOfWeek ?? existing.dayOfWeek;
    const finalStartTime = updateData.startTime || existing.startTime;
    const finalEndTime = updateData.endTime || existing.endTime;
    const finalStartDate = updateData.startDate
      ? new Date(updateData.startDate)
      : existing.startDate;
    const finalEndDate = updateData.endDate !== undefined
      ? (updateData.endDate ? new Date(updateData.endDate) : null)
      : existing.endDate;

    // Only check overlap if relevant fields changed
    if (
      updateData.courtId ||
      updateData.dayOfWeek !== undefined ||
      updateData.startTime ||
      updateData.endTime ||
      updateData.startDate ||
      updateData.endDate !== undefined
    ) {
      const overlap = await checkFixedBookingOverlap(
        finalCourtId,
        finalDayOfWeek,
        finalStartTime,
        finalEndTime,
        finalStartDate,
        finalEndDate,
        id // Exclude current booking
      );

      if (overlap) {
        return NextResponse.json(
          {
            error:
              "A fixed booking already exists for this court, day, and time slot",
          },
          { status: 400 }
        );
      }
    }

    // Update fixed booking
    const updated = await prisma.fixedBooking.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating fixed booking:", error);
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
      { error: "Failed to update fixed booking" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fixed-bookings/[id]
 * Delete (soft delete) a fixed booking
 * Sets status to CANCELED
 * Auth: Club Owner (all) or Moderator (own only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get existing fixed booking
    const existing = await prisma.fixedBooking.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Fixed booking not found" },
        { status: 404 }
      );
    }

    // Check permission
    if (!(await canDeleteFixedBooking(existing.createdById))) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You can only delete fixed bookings you created",
        },
        { status: 403 }
      );
    }

    // Soft delete: set status to CANCELED
    const deleted = await prisma.fixedBooking.update({
      where: { id },
      data: { status: "CANCELED" },
    });

    return NextResponse.json({ success: true, fixedBooking: deleted });
  } catch (error) {
    console.error("Error deleting fixed booking:", error);
    return NextResponse.json(
      { error: "Failed to delete fixed booking" },
      { status: 500 }
    );
  }
}
