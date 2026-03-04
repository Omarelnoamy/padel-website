# 👥 User Types & Roles Summary

## Overview

The PadelPro system uses a **role-based access control (RBAC)** system with two main fields:

- **`role`**: Main user role (`user`, `admin`, or `club_owner`)
- **`adminType`**: Sub-type for admins (only used when `role === "admin"`)
- **`isApproved`**: Approval status (required for admins and club owners)

---

## 📋 User Types

### 1. **Regular User / Player** (`role: "user"`)

- **Default role** for all new registrations
- **Auto-approved** (`isApproved: true`)
- **Permissions:**
  - ✅ Book courts (with restrictions: max 2 hours per day, must be consecutive slots)
  - ✅ View own bookings
  - ✅ Cancel own bookings (subject to location's cancellation policy, typically 4 hours in advance)
  - ✅ View locations and courts
  - ✅ Access "My Bookings" page
  - ❌ Cannot access admin features
  - ❌ Cannot book more than 2 hours per day
  - ❌ Cannot book non-consecutive slots

---

### 2. **Club Owner** (`role: "club_owner"`)

- **Special role** for location owners
- **Requires approval** from Super Admin (`isApproved: false` initially)
- **Permissions:**
  - ✅ **Full ownership** of one or more locations
  - ✅ **Financial management:**
    - View all bookings for owned locations
    - Track booking revenue automatically
    - Add manual income/expense transactions
    - View financial summaries (income, expenses, net profit)
    - View financial charts (monthly trends, revenue by category, profit by location)
  - ✅ **Booking management:**
    - Create/modify/cancel bookings without restrictions
    - No booking duration limits
    - Can book at any time (no 4-hour advance rule)
    - Can cancel bookings at any time
    - Can set booking categories (Regular, Academy, Tournament)
  - ✅ **Location management:**
    - Set cancellation policy per location (default: 4 hours)
    - View all bookings grouped by date and status
  - ✅ **All regular user permissions**
  - ❌ Cannot approve other admins/club owners
  - ❌ Cannot manage locations they don't own

**Note:** Club owners can also be stored as `role: "admin"` with `adminType: "club_owner"` (legacy support)

---

### 3. **Admin** (`role: "admin"`)

- **Requires approval** from Super Admin (`isApproved: false` initially)
- **Has sub-types** defined by `adminType`:

#### 3.1. **Super Admin** (`role: "admin"`, `adminType: "super_admin"`)

- **Highest level** of access
- **Permissions:**
  - ✅ **User management:**
    - Approve/reject admin and club owner registrations
    - View pending approval requests
    - View all users
  - ✅ **Location management:**
    - Create/edit/delete locations
    - Assign club owners to locations
    - Upload location images
    - Manage all locations (not limited to owned locations)
  - ✅ **Court management:**
    - Create/edit/delete courts for any location
  - ✅ **Booking management:**
    - View all bookings across all locations
    - Create/modify/cancel any booking
    - No restrictions on booking duration or timing
  - ✅ **All regular user permissions**
  - ✅ **All club owner permissions** (for any location)

#### 3.2. **Club Owner (Admin Type)** (`role: "admin"`, `adminType: "club_owner"`)

- **Same as Club Owner role** but stored as admin type
- Used for legacy support and consistency
- Has same permissions as `role: "club_owner"`

#### 3.3. **Timing Organizer** (`role: "admin"`, `adminType: "timing_organizer"`)

- **Planned feature** (not fully implemented yet)
- Intended for managing court schedules and timing

#### 3.4. **Tournament Organizer** (`role: "admin"`, `adminType: "tournament_organizer"`)

- **Planned feature** (not fully implemented yet)
- Intended for managing tournaments

#### 3.5. **Coach Admin** (`role: "admin"`, `adminType: "coach_admin"`)

- **Planned feature** (not fully implemented yet)
- Intended for managing coaching sessions

---

## 🔐 Approval System

### Approval Required:

- ✅ **Club Owners** (`role: "club_owner"` or `role: "admin"` with `adminType: "club_owner"`)
- ✅ **All Admins** (`role: "admin"`)

### Auto-Approved:

- ✅ **Regular Users** (`role: "user"`)

### Approval Process:

1. User registers with admin/club owner role
2. `isApproved` is set to `false`
3. Notification is sent to all Super Admins
4. Super Admin reviews and approves/rejects via Super Admin Dashboard
5. Upon approval, `isApproved` is set to `true`
6. User can now access admin features

---

## 🎯 Key Differences

| Feature                  | Regular User     | Club Owner           | Super Admin        |
| ------------------------ | ---------------- | -------------------- | ------------------ |
| **Book Courts**          | ✅ (2hr max/day) | ✅ (unlimited)       | ✅ (unlimited)     |
| **Cancel Bookings**      | ✅ (4hr rule)    | ✅ (anytime)         | ✅ (anytime)       |
| **View Own Bookings**    | ✅               | ✅                   | ✅                 |
| **View All Bookings**    | ❌               | ✅ (owned locations) | ✅ (all locations) |
| **Financial Management** | ❌               | ✅ (owned locations) | ✅ (all locations) |
| **Location Management**  | ❌               | ✅ (owned locations) | ✅ (all locations) |
| **Approve Admins**       | ❌               | ❌                   | ✅                 |
| **Booking Categories**   | ❌               | ✅                   | ✅                 |

---

## 📝 Registration Flow

1. **User selects account type:**

   - Player (Regular User)
   - Admin (with adminType selection)
   - Club Owner

2. **If Admin/Club Owner:**

   - Requires approval
   - Notification sent to Super Admins
   - User must wait for approval

3. **If Regular User:**
   - Auto-approved
   - Can use system immediately

---

## 🔍 How to Identify User Type in Code

```typescript
// Check if user is regular user
const isRegularUser = user.role === "user";

// Check if user is club owner
const isClubOwner =
  user.role === "club_owner" ||
  (user.role === "admin" && user.adminType === "club_owner");

// Check if user is super admin
const isSuperAdmin = user.role === "admin" && user.adminType === "super_admin";

// Check if user is any admin
const isAdmin = user.role === "admin";

// Check if user is approved
const isApproved = user.isApproved === true;
```

---

## 📊 Database Schema

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  phone       String?
  password    String
  role        String   @default("user")  // "user", "admin", "club_owner"
  adminType   String?                    // "super_admin", "club_owner", "timing_organizer", "tournament_organizer", "coach_admin"
  isApproved  Boolean  @default(true)    // false for admins/club owners until approved
  // ... other fields
}
```

---

## 🚀 Future Admin Types (Planned)

- **Timing Organizer**: Manage court schedules
- **Tournament Organizer**: Manage tournaments
- **Coach Admin**: Manage coaching sessions

These are defined in the schema but not fully implemented yet.
