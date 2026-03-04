# Create Tables Manually in Supabase

Since connection pooling has issues, let's create the tables directly!

## Steps:

### 1. Go to Supabase SQL Editor

Visit: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/sql/new

### 2. Copy and paste this SQL script:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create User table
CREATE TABLE "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Location table
CREATE TABLE "Location" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  image TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Court table
CREATE TABLE "Court" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  "pricePerHour" INTEGER NOT NULL,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE CASCADE
);

-- Create Booking table
CREATE TABLE "Booking" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "locationId" TEXT NOT NULL REFERENCES "Location"(id) ON DELETE CASCADE,
  "courtId" TEXT NOT NULL REFERENCES "Court"(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "totalPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Booking_locationId_date_startTime_idx" ON "Booking"("locationId", date, "startTime");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- Create Coach table
CREATE TABLE "Coach" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  experience TEXT NOT NULL,
  bio TEXT,
  "pricePerHour" INTEGER NOT NULL,
  image TEXT,
  availability TEXT,
  rating DOUBLE PRECISION,
  achievements TEXT[]
);

-- Create CoachingSession table
CREATE TABLE "CoachingSession" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "coachId" TEXT NOT NULL REFERENCES "Coach"(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "totalPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "CoachingSession_userId_idx" ON "CoachingSession"("userId");

-- Create Tournament table
CREATE TABLE "Tournament" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  category TEXT NOT NULL,
  "maxParticipants" INTEGER NOT NULL,
  prize TEXT NOT NULL,
  "registrationFee" INTEGER NOT NULL,
  description TEXT,
  highlights TEXT[]
);

-- Create Team table
CREATE TABLE "Team" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId" TEXT NOT NULL REFERENCES "Tournament"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "player1" TEXT NOT NULL,
  "player2" TEXT NOT NULL,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  seed INTEGER,
  qualified BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX "Team_tournamentId_idx" ON "Team"("tournamentId");

-- Create Match table
CREATE TABLE "Match" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId" TEXT NOT NULL REFERENCES "Tournament"(id) ON DELETE CASCADE,
  "team1Id" TEXT REFERENCES "Team"(id),
  "team2Id" TEXT REFERENCES "Team"(id),
  "winnerId" TEXT REFERENCES "Team"(id),
  round TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  score TEXT
);

CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- Create Payment table
CREATE TABLE "Payment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "bookingId" TEXT UNIQUE REFERENCES "Booking"(id) ON DELETE CASCADE,
  "sessionId" TEXT UNIQUE REFERENCES "CoachingSession"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  method TEXT NOT NULL,
  "stripeId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Player table
CREATE TABLE "Player" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  category TEXT,
  location TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "Player_points_idx" ON "Player"(points);
CREATE INDEX "Player_category_idx" ON "Player"(category);

-- Create Notification table
CREATE TABLE "Notification" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", read);
```

### 3. Click "Run" in Supabase SQL Editor

### 4. Wait for completion

You should see: "Success. No rows returned"

### 5. Verify tables were created

Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/editor

You should see all 12 tables!

## ✅ Done!

Now your database has all the tables. You can:

1. Test registration at http://localhost:3000/register
2. Add locations/courts through Supabase dashboard
3. Start using your app!
