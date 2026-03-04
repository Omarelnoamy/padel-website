# 👥 User Roles & Types - Implementation Plan

## 🎯 Overview

Your system will have:

- **Guests** - No sign-in required, limited access
- **Players** - Signed in, have profiles with reservations, rankings, photos
- **Admins** - 4 different types, each with custom admin pages

---

## 📋 Phase 1: Database Schema Updates

### Step 1.1: Update User Model

Add to `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  phone         String?
  password      String
  role          String    @default("player") // guest, player, admin
  adminType     String?   // null, club_owner, timing_organizer, tournament_organizer, coach
  profilePhoto  String?   // URL to uploaded photo
  bio           String?   // Player bio/description
  isRanked      Boolean   @default(false)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookings      Booking[]
  coachingSessions CoachingSession[]
  teams         Team[]
  notifications Notification[]

  @@index([role])
  @@index([adminType])
}
```

### Step 1.2: Run Migration

```bash
npx prisma migrate dev --name add_user_roles_and_types
npx prisma generate
```

---

## 📋 Phase 2: Update Registration Flow

### Step 2.1: Update Registration Page

**Changes needed:**

1. Add step to choose: "Player" or "Admin"
2. If "Admin" selected, show dropdown:
   - Club Owner
   - Timing Organizer
   - Tournament Organizer
   - Coach
3. Save `role` and `adminType` in database

**File to update:** `src/app/register/page.tsx`

### Step 2.2: Update Registration API

**Changes needed:**

1. Accept `role` and `adminType` in request
2. Validate adminType if role is admin
3. Set defaults appropriately

**File to update:** `src/app/api/register/route.ts`

---

## 📋 Phase 3: Guest Access (No Sign-In Required)

### Step 3.1: Make Booking Available to Guests

**Update:** `src/app/booking/page.tsx`

- Remove authentication requirement
- Allow guests to browse locations/courts
- Show "Sign in to book" message
- Or allow booking as guest with email only

### Step 3.2: Update Middleware

**Update:** `src/middleware.ts`

- Don't require auth for:
  - Home page
  - Booking page (view only)
  - Tournaments (view only)
  - Point system (view only)
- Require auth for:
  - Profile page
  - Booking submission
  - Admin pages

---

## 📋 Phase 4: Player Profile System

### Step 4.1: Create Profile Page

**New file:** `src/app/profile/page.tsx`

**Features:**

1. **Profile Header:**

   - Profile photo (upload/change)
   - Name, email, phone
   - Rank badge (if ranked)
   - Edit profile button

2. **Tabs/ Sections:**
   - **Overview** - Basic info, bio, profile photo
   - **Reservations** - Past and upcoming bookings
   - **Rankings** - Current rank, points, category
   - **Settings** - Update info, change password

### Step 4.2: Profile Photo Upload

**New API route:** `src/app/api/profile/upload-photo/route.ts`

- Handle image upload
- Save to public folder or cloud storage
- Update user's profilePhoto field

### Step 4.3: Past Reservations Component

**Display:**

- Booking history with dates
- Courts booked
- Total spent
- Filter by date range

---

## 📋 Phase 5: Admin System

### Step 5.1: Create Base Admin Layout

**New file:** `src/app/admin/layout.tsx`

- Check if user is admin
- Redirect if not admin
- Show admin navigation

### Step 5.2: Admin Type Detection

**Create:** `src/lib/admin-types.ts`

```typescript
export type AdminType =
  | "club_owner"
  | "timing_organizer"
  | "tournament_organizer"
  | "coach";

export function getAdminPagePath(adminType: AdminType | null): string {
  switch (adminType) {
    case "club_owner":
      return "/admin/club-owner";
    case "timing_organizer":
      return "/admin/timing-organizer";
    case "tournament_organizer":
      return "/admin/tournament-organizer";
    case "coach":
      return "/admin/coach";
    default:
      return "/admin";
  }
}
```

### Step 5.3: Create Admin Pages

**Club Owner Admin:** `src/app/admin/club-owner/page.tsx`

- Manage locations/courts
- Set pricing
- View all bookings
- Revenue reports
- Block time slots

**Timing Organizer Admin:** `src/app/admin/timing-organizer/page.tsx`

- Manage court schedules
- View bookings calendar
- Handle booking conflicts
- Set availability rules

**Tournament Organizer Admin:** `src/app/admin/tournament-organizer/page.tsx`

- Create/edit tournaments
- Manage brackets
- Handle registrations
- Update scores/results

**Coach Admin:** `src/app/admin/coach/page.tsx`

- Manage coaching sessions
- View student bookings
- Set availability
- Manage profile/rates

### Step 5.4: Update Main Admin Page

**Update:** `src/app/admin/page.tsx`

- Detect admin type
- Redirect to appropriate admin page
- Or show dashboard with all options

---

## 📋 Phase 6: Navigation Updates

### Step 6.1: Update Navbar

**Changes:**

- Guests: Show "Login" and "Register" buttons
- Players: Show name + "Profile" + "Logout"
- Admins: Show name + "Admin" + "Profile" + "Logout"
- Remove "Admin" button for non-admins

**File:** `src/components/Navbar.tsx`

### Step 6.2: Add Profile Link

Add profile navigation in Navbar for logged-in users

---

## 📋 Phase 7: Protected Routes

### Step 7.1: Update Middleware

**Create/Update:** `src/middleware.ts`

```typescript
// Protect admin routes based on admin type
if (pathname.startsWith("/admin")) {
  // Check session
  // Check if user is admin
  // Check if adminType matches route
}
```

---

## 📋 Implementation Order (Recommended)

### Week 1: Foundation

1. ✅ Update database schema
2. ✅ Update registration with role selection
3. ✅ Update API to save roles

### Week 2: Guest Access

4. ✅ Remove auth requirement for viewing
5. ✅ Add "Sign in to book" prompts
6. ✅ Update middleware

### Week 3: Player Profile

7. ✅ Create profile page
8. ✅ Add reservations history
9. ✅ Add profile photo upload
10. ✅ Show rankings in profile

### Week 4: Admin System

11. ✅ Create base admin layout
12. ✅ Create 4 admin pages
13. ✅ Add admin-specific features
14. ✅ Test all admin types

---

## 📁 Files to Create/Update

### New Files:

- `src/app/profile/page.tsx` - Player profile
- `src/app/api/profile/upload-photo/route.ts` - Photo upload
- `src/app/admin/club-owner/page.tsx` - Club owner admin
- `src/app/admin/timing-organizer/page.tsx` - Timing organizer admin
- `src/app/admin/tournament-organizer/page.tsx` - Tournament admin
- `src/app/admin/coach/page.tsx` - Coach admin
- `src/app/admin/layout.tsx` - Admin layout
- `src/lib/admin-types.ts` - Admin type utilities
- `src/components/ProfilePhotoUpload.tsx` - Photo upload component

### Files to Update:

- `prisma/schema.prisma` - Add role fields
- `src/app/register/page.tsx` - Add role selection
- `src/app/api/register/route.ts` - Handle roles
- `src/components/Navbar.tsx` - Show profile/admin links
- `src/middleware.ts` - Update route protection
- `src/app/booking/page.tsx` - Allow guest viewing

---

## 🎯 Detailed Feature Breakdown

### Guest Features:

- ✅ Browse locations
- ✅ View court availability
- ✅ View tournaments
- ✅ View rankings
- ❌ Can't book (must sign in)
- ❌ Can't see profile
- ❌ No admin access

### Player Features:

- ✅ Everything guests can do
- ✅ Book courts
- ✅ Book coaching sessions
- ✅ View own profile
- ✅ View own reservations
- ✅ Upload profile photo
- ✅ See own rankings
- ❌ No admin access

### Admin Features (All Types):

- ✅ Everything players can do
- ✅ Access to admin dashboard
- ✅ Different features based on type

---

## 🔐 Security Considerations

1. **Middleware Protection:**

   - Verify admin type matches admin route
   - Prevent players from accessing admin pages
   - Prevent wrong admin type from accessing other admin pages

2. **API Route Protection:**

   - Check role in API routes
   - Validate adminType for admin operations

3. **Data Access:**
   - Players only see their own data
   - Admins see data based on their type

---

## 🚀 Ready to Start?

**I recommend starting with Phase 1** (Database updates) as that's the foundation.

**Tell me which phase you want to start with, or say "start from phase 1" and I'll begin implementing!**
