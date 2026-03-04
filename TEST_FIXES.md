# 🔧 Test Runner Fixes

## Issue

All tests are failing because login authentication is not working. The test runner is getting 500 errors when trying to authenticate.

## Root Cause

NextAuth doesn't expose a simple programmatic login endpoint. The `/api/auth/callback/credentials` endpoint expects specific form data and cookie handling.

## Solution

The login function has been updated to:

1. Use proper form data format (URLSearchParams)
2. Handle NextAuth cookie names correctly
3. Follow redirects if needed
4. Better error handling

## Next Steps

### Option 1: Test with Browser Session (Recommended for Manual Testing)

1. Start dev server: `npm run dev`
2. Manually login via browser at `http://localhost:3000/login`
3. Copy the session cookie from browser DevTools
4. Use that cookie in tests

### Option 2: Create Test Auth Endpoint (Recommended for Automated Testing)

Create a test-only authentication endpoint that bypasses NextAuth for testing:

```typescript
// src/app/api/test-auth/route.ts (DEV ONLY)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signIn } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const { email, password } = await request.json();

  // Verify credentials
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Create session manually (simplified for testing)
  // This is a workaround - in production, use proper NextAuth flow

  return NextResponse.json({
    success: true,
    userId: user.id,
    email: user.email,
    role: user.role,
  });
}
```

### Option 3: Use NextAuth Test Utilities

Install and use NextAuth test utilities if available, or create a mock session.

## Current Status

The login function has been updated but may still need adjustments based on your NextAuth configuration. Test the login manually first to verify the cookie format.

## Testing the Fix

1. Run: `npm test`
2. Check if login succeeds (look for cookie extraction)
3. If still failing, check server logs for authentication errors
4. Verify database has seeded users with correct passwords
