import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Find organizer profile for this user
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tournaments: true,
            rankCategories: true,
          },
        },
      },
    });

    if (!organizerProfile) {
      return NextResponse.json(
        { organizerProfile: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      organizerProfile: {
        id: organizerProfile.id,
        userId: organizerProfile.userId,
        isApproved: organizerProfile.isApproved,
        approvedAt: organizerProfile.approvedAt,
        rejectedAt: organizerProfile.rejectedAt,
        rejectionReason: organizerProfile.rejectionReason,
        createdAt: organizerProfile.createdAt,
        user: organizerProfile.user,
        approvedBy: organizerProfile.approvedBy,
        tournamentsCount: organizerProfile._count.tournaments,
        rankCategoriesCount: organizerProfile._count.rankCategories,
      },
    });
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
