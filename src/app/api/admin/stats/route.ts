import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; role?: string; adminType?: string };
    } | null;

    if (
      !session?.user ||
      session.user.role !== "admin" ||
      session.user.adminType !== "super_admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalUsers,
      totalBookings,
      totalLocations,
      totalCourts,
      pendingAdmins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.location.count(),
      prisma.court.count(),
      prisma.user.count({
        where: {
          role: "admin",
          isApproved: false,
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalBookings,
      totalLocations,
      totalCourts,
      pendingAdmins,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
