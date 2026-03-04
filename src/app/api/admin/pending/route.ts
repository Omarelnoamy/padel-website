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

    const pendingAdmins = await prisma.user.findMany({
      where: {
        OR: [
          { role: "admin", isApproved: false },
          { role: "club_owner", isApproved: false },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        adminType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pendingAdmins);
  } catch (error) {
    console.error("Error fetching pending admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending admins" },
      { status: 500 }
    );
  }
}
