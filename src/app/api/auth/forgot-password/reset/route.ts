import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  findValidOtp,
  invalidateOtpsForPhone,
} from "@/lib/otp-password-reset";
import {
  validatePassword,
  validatePasswordMatch,
} from "@/lib/password-validation";

/**
 * POST /api/auth/forgot-password/reset
 * Reset password using OTP (Method 2 - step 2: verify OTP and set new password).
 * Body: mobile, code, newPassword, confirmPassword
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mobile,
      code,
      newPassword,
      confirmPassword,
    } = body;

    const mobileVal = mobile ?? body?.phone;
    if (typeof mobileVal !== "string" || !mobileVal.trim()) {
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 }
      );
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: "Please enter the 6-digit verification code" },
        { status: 400 }
      );
    }
    if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      return NextResponse.json(
        { error: "New password and confirmation are required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(mobileVal.trim());
    const otpResult = await findValidOtp(normalized, code.trim());

    if (!otpResult) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
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
      where: { id: otpResult.userId },
      data: { password: hashedPassword },
    });

    await invalidateOtpsForPhone(normalized);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
