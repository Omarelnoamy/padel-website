import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import {
  validatePassword,
  validatePasswordMatch,
} from "@/lib/password-validation";

/**
 * POST /api/auth/change-password
 * Change password using current password (Method 1).
 * With session: uses logged-in user. Without session: requires email + current password.
 */
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string };
    } | null;

    const body = await request.json();
    const { email, currentPassword, newPassword, confirmPassword } = body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Current password, new password, and confirmation are required" },
        { status: 400 }
      );
    }

    let userId: string;

    if (session?.user?.id) {
      userId = session.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const currentValid = await bcrypt.compare(currentPassword, user.password);
      if (!currentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    } else {
      if (typeof email !== "string" || !email.trim()) {
        return NextResponse.json(
          { error: "Email is required when not signed in" },
          { status: 400 }
        );
      }
      const userByEmail = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, password: true },
      });
      if (!userByEmail) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      const currentValid = await bcrypt.compare(currentPassword, userByEmail.password);
      if (!currentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      userId = userByEmail.id;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
    if (!matchValidation.valid) {
      return NextResponse.json(
        { error: matchValidation.message },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
