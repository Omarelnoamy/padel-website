import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizePhone,
  phonesMatch,
  generateOtp,
  checkOtpRateLimit,
  createOtpRecord,
} from "@/lib/otp-password-reset";

/**
 * POST /api/auth/forgot-password/send-otp
 * Request a 6-digit OTP for password reset (Method 2 - step 1).
 * Generic response so we don't reveal if the phone is registered.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobile = body?.mobile ?? body?.phone;

    if (typeof mobile !== "string" || !mobile.trim()) {
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(mobile.trim());
    if (normalized.length < 8) {
      return NextResponse.json(
        { error: "Please enter a valid mobile number" },
        { status: 400 }
      );
    }

    const rateLimit = await checkOtpRateLimit(normalized);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const usersWithPhone = await prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true },
    });
    const user = usersWithPhone.find(
      (u) => u.phone && phonesMatch(mobile.trim(), u.phone)
    ) ?? null;

    if (!user || !user.phone) {
      return NextResponse.json({
        success: true,
        message:
          "If this number is registered, you will receive a verification code shortly.",
      });
    }

    const code = generateOtp();
    const phoneForStorage = normalizePhone(user.phone);
    await createOtpRecord(phoneForStorage, user.id, code);

    if (process.env.SMS_PROVIDER_URL || process.env.TWILIO_ACCOUNT_SID) {
      try {
        await sendSms(user.phone, code);
      } catch (smsErr) {
        console.error("SMS send failed:", smsErr);
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("--- [DEV] PASSWORD RESET OTP ---");
        console.log("Phone:", user.phone, "| Code:", code);
        console.log("--- Copy the 6-digit code above ---");
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If this number is registered, you will receive a verification code shortly.",
      expiresInMinutes: 5,
    });
  } catch (e) {
    console.error("Send OTP error:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

async function sendSms(to: string, code: string): Promise<void> {
  const body =
    process.env.SMS_PASSWORD_RESET_MESSAGE?.replace("{{code}}", code) ??
    `Your password reset code is: ${code}. Valid for 5 minutes.`;
  const url = process.env.SMS_PROVIDER_URL;
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) throw new Error("SMS provider error");
    return;
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) throw new Error("TWILIO_PHONE_NUMBER not set");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const form = new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    });
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Twilio error");
    }
  }
}
