/**
 * TEST-ONLY Authentication Endpoint
 *
 * This endpoint is for automated testing only.
 * It bypasses NextAuth to create test sessions directly.
 *
 * ⚠️ DO NOT USE IN PRODUCTION
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  try {
    // Double-check we're in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not available in production" },
        { status: 403 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create a JWT token (similar to NextAuth)
    const secret = process.env.NEXTAUTH_SECRET || "test-secret";
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        adminType: (user as any).adminType || null,
        userType: (user as any).userType || null,
        isApproved: (user as any).isApproved ?? true,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Create session cookie
    const cookieName =
      (process.env.NODE_ENV as string) === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        adminType: (user as any).adminType || null,
        userType: (user as any).userType || null,
        isApproved: (user as any).isApproved ?? true,
      },
    });

    // Set the session cookie
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Test auth error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
