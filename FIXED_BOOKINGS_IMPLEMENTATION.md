# Fixed Bookings Implementation

## Overview

Fixed bookings are recurring weekly reservations that automatically block time slots. They are created by Club Owners or Moderators for themselves or specific users.

**Key Design Principles:**
- Fixed bookings do NOT create individual Booking records
- They block slots in real-time when checking availability
- One fixed booking per court per dayOfWeek per time slot (with date range validation)
- Status-based: ACTIVE (blocks), PAUSED (doesn't block), CANCELED (soft delete)

---

## Database Schema

### FixedBooking Model

```prisma
model FixedBooking {
  id          String    @id @default(cuid())
  courtId     String
  locationId  String
  userId      String?   // null if for owner/moderator themselves
  createdById String    // Club Owner or Moderator who created
  dayOfWeek   Int       // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime   String    // Format: "HH:MM"
  endTime     String    // Format: "HH:MM"
  startDate   DateTime  // When blocking starts
  endDate     DateTime? // When blocking ends (null = infinite)
  status      String    @default("ACTIVE") // ACTIVE | PAUSED | CANCELED
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  court       Court     @relation(...)
  location    Location  @relation(...)
  user        User?     @relation("FixedBookingUser", ...)
  createdBy   User      @relation("FixedBookingCreator", ...)

  // Indexes
  @@index([courtId, dayOfWeek, status])
  @@index([locationId, status])
  @@index([userId, status])
  @@index([createdById])
  @@index([status, startDate, endDate])
}
```

---

## API Endpoints

### POST /api/fixed-bookings
**Auth:** Club Owner or Moderator

**Request Body:**
```json
{
  "courtId": "court-id",
  "userId": "user-id" | null,
  "dayOfWeek": 0-6,
  "startTime": "10:00",
  "endTime": "12:00",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z" | null,
  "notes": "Optional notes"
}
```

**Validations:**
- Checks for overlapping fixed bookings
- Validates time format (HH:MM)
- Validates dayOfWeek (0-6)
- Moderators can only create for assigned locations

### GET /api/fixed-bookings
**Auth:** All authenticated users

**Query Params:**
- `courtId`: Filter by court
- `locationId`: Filter by location
- `userId`: Filter by user
- `status`: Filter by status (ACTIVE, PAUSED, CANCELED)

**Response:** Array of fixed bookings with relations

### PATCH /api/fixed-bookings/[id]
**Auth:** Club Owner (all) or Moderator (own only)

**Request Body:** Partial update (any fields)

**Validations:**
- Checks for overlaps if time/day/court changed
- Validates status (ACTIVE, PAUSED, CANCELED)
- Permission check: Moderators can only edit their own

### DELETE /api/fixed-bookings/[id]
**Auth:** Club Owner (all) or Moderator (own only)

**Action:** Soft delete (sets status to CANCELED)

---

## Conflict Detection

### Helper Functions (`src/lib/fixed-bookings.ts`)

1. **`timeRangesOverlap(start1, end1, start2, end2)`**
   - Checks if two time ranges overlap
   - Handles same-day ranges only

2. **`isDateInRange(date, startDate, endDate)`**
   - Checks if a date falls within a fixed booking's active period
   - Handles null endDate (infinite)

3. **`checkFixedBookingConflict(courtId, date, startTime, endTime)`**
   - Checks if a booking slot conflicts with any ACTIVE fixed bookings
   - Used in normal booking creation

4. **`checkFixedBookingOverlap(courtId, dayOfWeek, startTime, endTime, startDate, endDate, excludeId?)`**
   - Checks if a new/updated fixed booking would overlap with existing ones
   - Used in fixed booking creation/update

5. **`getFixedBookingsForDate(courtId, date)`**
   - Gets all fixed bookings that block a specific date
   - Used in availability endpoint

---

## Integration Points

### 1. Normal Booking Creation (`/api/bookings` POST)
- Checks for fixed booking conflicts BEFORE checking regular bookings
- Returns error if slot is blocked by fixed booking

### 2. Availability Endpoint (`/api/availability` GET)
- Fetches fixed bookings for each court on the requested date
- Marks slots as unavailable with reason "reserved"
- Fixed bookings take priority over regular bookings

### 3. Booking UI
- Slots blocked by fixed bookings show as unavailable
- Reason: "reserved" (different from "booked")
- Users see: "Reserved by club" message

---

## Permissions (RBAC)

### `canCreateFixedBooking()`
- ✅ Club Owners
- ✅ Moderators
- ❌ All others

### `canEditFixedBooking(createdById)`
- ✅ Club Owners (all)
- ✅ Moderators (own only)
- ❌ All others

### `canDeleteFixedBooking(createdById)`
- ✅ Club Owners (all)
- ✅ Moderators (own only)
- ❌ All others

### `canViewFixedBookings()`
- ✅ All authenticated users

---

## Status Management

- **ACTIVE**: Blocks slots, appears in conflict checks
- **PAUSED**: Does NOT block slots, can be resumed
- **CANCELED**: Soft delete, does NOT block slots

---

## Edge Cases Handled

1. **Overlapping Date Ranges**: Fixed bookings with different date ranges can coexist if they don't overlap
2. **Infinite Duration**: `endDate = null` means booking never expires
3. **Daylight Saving**: Time comparisons use minutes, not hours
4. **Overnight Bookings**: Handled in availability checks
5. **Paused Bookings**: Immediately free up slots when paused
6. **Moderator Restrictions**: Can only create/edit for assigned locations

---

## Database Migration

Run migration to create FixedBooking table:

```bash
npx prisma migrate dev --name add_fixed_bookings
npx prisma generate
```

---

## Next Steps (UI Implementation)

1. **Admin Panel - Fixed Bookings Section**
   - List all fixed bookings
   - Create new fixed booking form
   - Edit/Delete actions
   - Weekly calendar view showing blocked slots

2. **User View**
   - Show blocked slots in booking calendar
   - Display "Reserved by club" message
   - Prevent selection of reserved slots

3. **Moderator View**
   - Same as admin but filtered by assigned locations
   - Can only edit own fixed bookings

---

## Testing Checklist

- [ ] Create fixed booking for Monday 10:00-12:00
- [ ] Verify slot is blocked in availability
- [ ] Try to create normal booking in blocked slot (should fail)
- [ ] Pause fixed booking (slot should become available)
- [ ] Resume fixed booking (slot should be blocked again)
- [ ] Test moderator permissions (assigned locations only)
- [ ] Test date range boundaries (startDate, endDate)
- [ ] Test infinite duration (endDate = null)
- [ ] Test overlapping time ranges (should be rejected)
- [ ] Test different dayOfWeek values (0-6)

---

## Performance Considerations

- Indexes on `[courtId, dayOfWeek, status]` for fast conflict checks
- Indexes on `[locationId, status]` for filtering
- No pre-generation of booking rows (real-time blocking)
- Efficient date range queries with indexes

---

## Security Notes

- All endpoints require authentication
- Permission checks at API level
- Moderators restricted to assigned locations
- Soft deletes (status = CANCELED) preserve audit trail
