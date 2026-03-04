# PadelPro - Step-by-Step Implementation Guide

## 🎯 Quick Start: What to Build First

### **Priority 1: Backend Infrastructure** (Critical)

#### Step 1: Install Dependencies

```bash
cd /Users/epnu/Desktop/padel-website
npm install prisma @prisma/client bcryptjs
npm install -D @types/bcryptjs
npm install next-auth@beta
npm install zod
npm install @hookform/resolvers react-hook-form
```

#### Step 2: Initialize Prisma

```bash
npx prisma init
```

#### Step 3: Create Database Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  phone         String?
  password      String
  role          String    @default("user") // user, admin, coach
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookings      Booking[]
  coachingSessions CoachingSession[]
  teams         Team[]
}

model Location {
  id          String   @id @default(cuid())
  name        String
  address     String
  image       String?
  createdAt   DateTime @default(now())

  courts      Court[]
  bookings    Booking[]
}

model Court {
  id          String    @id @default(cuid())
  name        String
  type        String
  pricePerHour Int
  locationId  String
  location    Location  @relation(fields: [locationId], references: [id])

  bookings    Booking[]
}

model Booking {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  locationId  String
  location    Location @relation(fields: [locationId], references: [id])
  courtId     String
  court       Court    @relation(fields: [courtId], references: [id])

  date        DateTime
  startTime   String
  endTime     String
  status      String   @default("pending") // pending, confirmed, cancelled
  totalPrice  Int
  createdAt   DateTime @default(now())

  payment     Payment?
}

model Coach {
  id            String   @id @default(cuid())
  name          String
  specialization String
  experience    String
  bio           String?
  pricePerHour  Int
  image         String?
  availability   String?

  sessions      CoachingSession[]
}

model CoachingSession {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  coachId     String
  coach       Coach    @relation(fields: [coachId], references: [id])

  date        DateTime
  startTime   String
  endTime     String
  status      String   @default("pending")
  totalPrice  Int
  createdAt   DateTime @default(now())

  payment     Payment?
}

model Tournament {
  id              String   @id @default(cuid())
  name            String
  startDate       DateTime
  endDate         DateTime
  status          String   @default("upcoming") // upcoming, registration_open, in_progress, completed
  category        String
  maxParticipants Int
  prize           String
  registrationFee Int

  teams           Team[]
  matches         Match[]
}

model Team {
  id              String   @id @default(cuid())
  tournamentId    String
  tournament      Tournament @relation(fields: [tournamentId], references: [id])
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  player1         String
  player2         String
  totalPoints     Int      @default(0)
  seed            Int?
  qualified       Boolean  @default(false)

  matchesAsTeam1  Match[]  @relation("Team1Matches")
  matchesAsTeam2  Match[]  @relation("Team2Matches")
}

model Match {
  id              String   @id @default(cuid())
  tournamentId    String
  tournament      Tournament @relation(fields: [tournamentId], references: [id])

  team1Id         String?
  team1           Team?     @relation("Team1Matches", fields: [team1Id], references: [id])
  team2Id         String?
  team2           Team?     @relation("Team2Matches", fields: [team2Id], references: [id])

  winnerId        String?
  winner          Team?     @relation(fields: [winnerId], references: [id])

  round           String   // quarterfinals, semifinals, final
  status          String   @default("scheduled")
  score           String?
}

model Payment {
  id            String   @id @default(cuid())
  bookingId     String?  @unique
  booking       Booking? @relation(fields: [bookingId], references: [id])
  sessionId     String?  @unique
  coachingSession CoachingSession? @relation(fields: [sessionId], references: [id])

  amount        Int
  status        String   // pending, completed, failed
  method        String   // stripe, cash
  stripeId      String?

  createdAt     DateTime @default(now())
}

model Player {
  id            String   @id @default(cuid())
  name          String
  points        Int      @default(0)
  rank          Int
  category      String?
  location      String
  wins          Int      @default(0)
  losses        Int      @default(0)
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String   // booking, payment, tournament
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

#### Step 4: Create .env file

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/padel_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
RESEND_API_KEY="re_..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
```

#### Step 5: Create Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### **Priority 2: Authentication** (Critical)

#### Step 1: Create Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (
          !user ||
          !(await bcrypt.compare(credentials.password, user.password))
        ) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
};
```

#### Step 2: Create Login Page

Create `src/app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to PadelPro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-600">{error}</div>}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="text-green-600">
              Register
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Step 3: Protect Routes

Create `src/middleware.ts`:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/booking/:path*",
    "/coaching/:path*",
  ],
};
```

---

### **Priority 3: API Routes** (Critical)

#### Step 1: Create Booking API

Create `src/app/api/bookings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    include: { court: true, location: true },
  });

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  // Validate availability
  const existing = await prisma.booking.findFirst({
    where: {
      courtId: data.courtId,
      date: data.date,
      startTime: data.startTime,
      status: { not: "cancelled" },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Slot not available" }, { status: 400 });
  }

  const booking = await prisma.booking.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  return NextResponse.json(booking);
}
```

#### Step 2: Create Availability API

Create `src/app/api/availability/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locationId = searchParams.get("locationId");
  const date = searchParams.get("date");

  if (!locationId || !date) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Get all bookings for this date
  const bookings = await prisma.booking.findMany({
    where: {
      locationId,
      date: new Date(date),
      status: { not: "cancelled" },
    },
    select: {
      courtId: true,
      startTime: true,
      endTime: true,
    },
  });

  // Get all courts
  const courts = await prisma.court.findMany({
    where: { locationId },
  });

  // Generate time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 21; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    courts.forEach((court) => {
      const isBooked = bookings.some(
        (b) => b.courtId === court.id && b.startTime <= time && b.endTime > time
      );

      timeSlots.push({
        courtId: court.id,
        courtName: court.name,
        time,
        available: !isBooked,
      });
    });
  }

  return NextResponse.json(timeSlots);
}
```

#### Step 3: Create Prisma Client Singleton

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

### **Priority 4: Connect Booking Page to Database**

Update `src/app/booking/page.tsx` to fetch real data:

```typescript
// Add at top
import { useEffect, useState } from "react";

// Replace mock locations with:
const [locations, setLocations] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/locations")
    .then((res) => res.json())
    .then((data) => setLocations(data))
    .then(() => setLoading(false));
}, []);
```

---

## 🚀 Deployment Steps

### **Option 1: Vercel (Recommended)**

1. Push code to GitHub
2. Go to vercel.com
3. Import your repository
4. Add environment variables
5. Deploy

### **Option 2: Railway**

1. Install Railway CLI: `npm i -g @railway/cli`
2. Run: `railway login`
3. Run: `railway init`
4. Add PostgreSQL service
5. Deploy: `railway up`

---

## 📋 Implementation Checklist

### Week 1

- [ ] Set up database
- [ ] Install all dependencies
- [ ] Create database schema
- [ ] Run migrations
- [ ] Implement authentication

### Week 2

- [ ] Create all API routes
- [ ] Connect booking page to database
- [ ] Add real-time availability
- [ ] Test booking flow

### Week 3

- [ ] Integrate payment (Stripe)
- [ ] Add email notifications
- [ ] Create user profile page
- [ ] Add booking history

### Week 4

- [ ] Enhance admin dashboard
- [ ] Add reports and analytics
- [ ] Implement tournament management
- [ ] Add SEO optimization

### Week 5

- [ ] Add testing
- [ ] Fix bugs
- [ ] Deploy to production
- [ ] Monitor and optimize

---

## 🎯 Quick Wins (Do These First)

1. **Add Footer Component** to all pages
2. **Improve Metadata** in `layout.tsx`
3. **Add Loading States** everywhere
4. **Add Error Boundaries**
5. **Optimize Images** using next/image
6. **Add 404 Page**
7. **Add Sitemap**
8. **Add robots.txt**

Let me know which part you'd like me to implement first!
