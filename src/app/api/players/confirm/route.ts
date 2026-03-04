import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string };
    } | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, accept } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const metadata = notification.metadata as {
      candidateName?: string;
      matchedName?: string;
      matchedPoints?: number;
      similarity?: number;
    } | null;

    if (!metadata?.candidateName) {
      return NextResponse.json(
        { error: "Notification doesn't contain player match info" },
        { status: 400 }
      );
    }

    if (accept) {
      const nameToUse = metadata.matchedName || metadata.candidateName;
      const pointsToUse = metadata.matchedPoints ?? 0;

      const existingPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id },
      });

      const maxRank = await prisma.player.findFirst({
        orderBy: { rank: "desc" },
        select: { rank: true },
      });

      if (existingPlayer) {
        await prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            name: nameToUse,
            points: pointsToUse,
          },
        });
      } else {
        await prisma.player.create({
          data: {
            userId: session.user.id,
            name: nameToUse,
            points: pointsToUse,
            rank: (maxRank?.rank || 0) + 1,
            category: null,
            location: "Port Said",
            wins: 0,
            losses: 0,
          },
        });
      }
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        message: accept
          ? "Points imported from Port Said ranking."
          : "Match dismissed. You can update points manually later.",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming player match:", error);
    return NextResponse.json(
      { error: "Failed to confirm match" },
      { status: 500 }
    );
  }
}
