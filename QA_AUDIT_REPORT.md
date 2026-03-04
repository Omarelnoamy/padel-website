# 🔍 QA Audit Report - Padel Booking & Financial Management System

**Date:** January 9, 2026  
**Auditor:** Senior QA Engineer  
**Scope:** Full system audit (Authentication, Authorization, Business Logic, Security, Data Integrity)

---

## 📊 Executive Summary

**Total Issues Found:** 25

- 🔴 **Critical:** 9 (Must fix before production)
- 🟡 **Medium:** 10 (Should fix soon)
- 🟢 **Minor:** 6 (Nice to have improvements)

**Overall Risk Level:** 🟡 **MEDIUM-HIGH**  
**Production Readiness:** ❌ **NOT READY** - Critical issues must be resolved

---

## 🔴 CRITICAL ISSUES

### 1. **Missing `isApproved` Check in API Routes**

**Severity:** 🔴 CRITICAL  
**Impact:** Unapproved users can access protected endpoints  
**Location:** Multiple API routes

**Issue:**
Most API routes check `role` and `adminType` but **do not verify `isApproved`**. An unapproved admin/club owner can access protected endpoints.

**Affected Files:**

- `src/app/api/bookings/route.ts` (POST)
- `src/app/api/bookings/[id]/cancel/route.ts`
- `src/app/api/club-owner/bookings/route.ts`
- `src/app/api/club-owner/financials/summary/route.ts`
- `src/app/api/club-owner/transactions/route.ts`
- `src/app/api/locations/[id]/route.ts`

**Reproduction:**

1. Register as `club_owner` (not approved)
2. Login
3. Access `/api/club-owner/bookings` → **Should fail but succeeds**

**Fix:**

```typescript
// In all API routes, add:
const user = session.user as any;
if (user.role === "admin" || user.role === "club_owner") {
  if (!user.isApproved) {
    return NextResponse.json(
      { error: "Account pending approval" },
      { status: 403 }
    );
  }
}
```

**Recommendation:** Use centralized RBAC functions that already check `isApproved`.

---

### 2. **Owner Partner & Moderator Location Access Bypass**

**Severity:** 🔴 CRITICAL  
**Impact:** Users can access financial data for locations they don't own  
**Location:** `src/app/api/club-owner/bookings/route.ts`, `src/app/api/club-owner/financials/summary/route.ts`

**Issue:**
`owner_partner` and `moderator` roles can access **any location** because `getRBACOwnedLocationIds()` returns empty array when user is not a club owner, but the code doesn't validate location ownership.

**Reproduction:**

1. Create user with `adminType: "owner_partner"`
2. Assign to Location A
3. Access `/api/club-owner/bookings?locationId=<LocationB_ID>` → **Should fail but succeeds**

**Fix:**

```typescript
// In GET /api/club-owner/bookings
const canView = await canViewAllBookings();
if (!canView) return 403;

// For owner_partner and moderator, they should only see locations they're assigned to
// Need to add a LocationAccess table or check if location.ownerId matches their assigned locations
// Currently, owner_partner/moderator have NO location restriction - this is a security hole
```

**Recommendation:** Implement location assignment system for `owner_partner` and `moderator` roles, or restrict them to locations where `ownerId` matches their assigned club owner.

---

### 3. **Missing Location Ownership Validation in Financial APIs**

**Severity:** 🔴 CRITICAL  
**Impact:** Users can view/modify financial data for locations they don't own  
**Location:** `src/app/api/club-owner/transactions/route.ts` (GET)

**Issue:**
The GET endpoint for transactions doesn't validate that `locationId` in query params belongs to owned locations before filtering.

**Reproduction:**

1. Login as Club Owner A (owns Location 1)
2. Access `/api/club-owner/transactions?locationId=<Location2_ID>` → **Should fail but may succeed**

**Fix:**

```typescript
// Line 46-48: Already checks if locationId is in ownedLocationIds
if (locationId && ownedLocationIds.includes(locationId)) {
  where.locationId = locationId;
}
// This is correct, but need to ensure ownedLocationIds is properly filtered
```

**Note:** The code appears correct, but `ownedLocationIds` might be empty for `owner_partner`/`moderator`, allowing access to all locations.

---

### 4. **Moderator Can Create Bookings Without Location Ownership Check**

**Severity:** 🔴 CRITICAL  
**Impact:** Moderator can create bookings for any location  
**Location:** `src/app/api/club-owner/bookings/route.ts` (POST)

**Issue:**
When moderator creates a booking, the code checks `ownedLocationIds` but for moderators, this array might be empty, and the check `if (!ownedLocationIds.includes(locationId))` might not work correctly.

**Reproduction:**

1. Login as Moderator
2. POST to `/api/club-owner/bookings` with `locationId` of location they don't have access to
3. **Should fail but may succeed**

**Fix:**

```typescript
// Line 180: Need to ensure moderators can only create bookings for their assigned locations
// Currently, if ownedLocationIds is empty, the check passes
if (!ownedLocationIds.includes(locationId)) {
  return NextResponse.json(
    { error: "You don't own this location" },
    { status: 403 }
  );
}
// If ownedLocationIds is empty, this check should still fail
```

---

### 5. **Transactions GET Endpoint Blocks Owner Partner & Moderator**

**Severity:** 🔴 CRITICAL  
**Impact:** Owner partner and moderator cannot view transactions (they should be able to)  
**Location:** `src/app/api/club-owner/transactions/route.ts` (GET)

**Issue:**
The GET endpoint calls `requireClubOwner()` (line 23) which throws an error for non-club-owners. This blocks `owner_partner` and `moderator` from viewing transactions, even though they should have read access.

**Reproduction:**

1. Login as `owner_partner`
2. GET `/api/club-owner/transactions` → **Fails with "Unauthorized: Club owner access required"**
3. Should succeed with read-only access

**Fix:**

```typescript
// Replace line 23-24 with:
const canView = await canViewFinancials();
if (!canView) {
  return NextResponse.json(
    { error: "Unauthorized - Access denied" },
    { status: 403 }
  );
}

let ownedLocationIds: string[] = [];
try {
  const userId = await requireClubOwner();
  ownedLocationIds = await getOwnedLocationIds();
} catch {
  // If not club owner, try to get from RBAC (for owner partner/moderator)
  ownedLocationIds = await getRBACOwnedLocationIds();
}
```

---

### 6. **Financial Transaction Creation Without Authorization Check**

**Severity:** 🔴 CRITICAL  
**Impact:** Unauthorized users can create financial transactions  
**Location:** `src/app/api/club-owner/transactions/route.ts` (POST)

**Issue:**
The POST endpoint calls `requireClubOwner()` (line 287) which will throw for non-club-owners, but the permission check `canManageFinancialTransactions()` is not called before that.

**Reproduction:**

1. Login as `owner_partner` (read-only)
2. POST to `/api/club-owner/transactions` → **Fails, but error handling might be inconsistent**

**Fix:**

```typescript
// Add permission check BEFORE requireClubOwner()
const canManage = await canManageFinancialTransactions();
if (!canManage) {
  return NextResponse.json(
    { error: "Unauthorized - Read-only access. Cannot create transactions." },
    { status: 403 }
  );
}
const userId = await requireClubOwner();
```

---

### 7. **Race Condition in Booking Creation**

**Severity:** 🔴 CRITICAL  
**Impact:** Double bookings possible under concurrent requests  
**Location:** `src/app/api/bookings/route.ts` (POST)

**Issue:**
The code checks for overlapping bookings (lines 229-251) and then creates the booking (line 256) without a database transaction. Two concurrent requests can both pass the overlap check and create conflicting bookings.

**Reproduction:**

1. Two users try to book the same slot simultaneously
2. Both requests pass overlap check
3. Both bookings are created → **Double booking**

**Fix:**

```typescript
// Wrap in Prisma transaction
await prisma.$transaction(async (tx) => {
  // Check overlaps
  const overlappingBookings = await tx.booking.findMany({...});
  if (overlappingBookings.length > 0) {
    throw new Error("Slot already booked");
  }
  // Create booking
  const booking = await tx.booking.create({...});
  return booking;
});
```

---

### 8. **Missing Input Validation - SQL Injection Risk**

**Severity:** 🔴 CRITICAL  
**Impact:** Potential SQL injection through query parameters  
**Location:** Multiple API routes

**Issue:**
Query parameters are used directly in Prisma queries without sanitization. While Prisma provides some protection, custom `where` clauses built from user input are risky.

**Affected:**

- `src/app/api/club-owner/bookings/route.ts` (locationId, courtId from query params)
- `src/app/api/club-owner/transactions/route.ts` (locationId, courtId)

**Fix:**

```typescript
// Validate and sanitize all query parameters
const locationId = searchParams.get("locationId");
if (locationId && !/^[a-zA-Z0-9_-]+$/.test(locationId)) {
  return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
}
```

---

### 9. **Cancellation Transaction Matching Logic Flaw**

**Severity:** 🔴 CRITICAL  
**Impact:** Duplicate negative transactions or missing cancellations  
**Location:** `src/app/api/bookings/[id]/cancel/route.ts`

**Issue:**
The code finds the "original transaction" using a fuzzy match (line 167-182) that can match wrong transactions or miss the correct one. However, the code doesn't check if a negative transaction already exists before creating one, which can lead to:

- Multiple negative transactions for one cancellation
- Missing negative transactions if matching fails

**Reproduction:**

1. Create booking (creates positive transaction)
2. Cancel booking (creates negative transaction)
3. Cancel again (if status check fails) → **Duplicate negative transaction**

**Fix:**

```typescript
// Check if negative transaction already exists
const existingNegative = await prisma.financialTransaction.findFirst({
  where: {
    locationId: booking.locationId,
    courtId: booking.courtId,
    type: "income",
    source: "booking",
    amount: -booking.totalPrice, // Negative amount
    transactionDate: bookingDate,
  },
});

if (!existingNegative) {
  // Only create if it doesn't exist
  await prisma.financialTransaction.create({...});
}
```

**Note:** The status check (line 44) should prevent double cancellation, but defensive programming is recommended.

---

## 🟡 MEDIUM ISSUES

### 10. **Daily Booking Limit Bypass via API**

**Severity:** 🟡 MEDIUM  
**Impact:** Users can bypass 2-hour daily limit by calling API directly  
**Location:** `src/app/api/bookings/route.ts` (POST)

**Issue:**
The daily limit check (lines 181-216) only runs for non-admin users, but the check uses `isAdmin` which is too broad. `club_admin` should also bypass, but the logic is inconsistent.

**Fix:**

```typescript
// Use hasUnrestrictedBooking consistently
if (!hasUnrestrictedBooking) {
  // Check daily limit
}
```

---

### 11. **Overnight Booking Overlap Detection Bug**

**Severity:** 🟡 MEDIUM  
**Impact:** Overlapping bookings possible for overnight slots  
**Location:** `src/app/api/bookings/route.ts` (POST, lines 238-250)

**Issue:**
The overlap detection doesn't handle overnight bookings correctly. A booking from 23:00-01:00 overlaps with 00:00-02:00, but the check might miss this.

**Fix:**

```typescript
// Handle overnight bookings in overlap check
const isOvernight = startHour > endHour;
if (isOvernight) {
  // Booking spans midnight
  // Check overlaps with both same-day and next-day bookings
}
```

---

### 12. **Missing Timezone Handling**

**Severity:** 🟡 MEDIUM  
**Impact:** Bookings can be created for wrong dates in different timezones  
**Location:** Multiple files

**Issue:**
Date parsing uses `new Date(date)` which is timezone-dependent. A user in a different timezone might book for a different day than intended.

**Fix:**

```typescript
// Use UTC dates consistently
const bookingDate = new Date(date + "T00:00:00Z");
// Or store dates as strings in YYYY-MM-DD format
```

---

### 13. **Moderator Can View All Locations (No Scoping)**

**Severity:** 🟡 MEDIUM  
**Impact:** Moderator sees bookings/financials for all locations, not just assigned ones  
**Location:** `src/app/api/club-owner/bookings/route.ts`, financial APIs

**Issue:**
Moderators should only see locations they're assigned to, but `getRBACOwnedLocationIds()` returns empty array, and the code doesn't filter by assignment.

**Fix:**
Add a `LocationAccess` or `UserLocationAssignment` table to track which locations moderators/owner_partners can access.

---

### 14. **Financial Summary Doesn't Account for Cancelled Bookings in Income**

**Severity:** 🟡 MEDIUM  
**Impact:** Income calculation might be incorrect if negative transactions aren't properly matched  
**Location:** `src/app/api/club-owner/financials/summary/route.ts`

**Issue:**
Income is calculated from confirmed bookings only (line 86), which is correct. However, if a booking is cancelled, the negative transaction might not be properly subtracted if the matching logic fails.

**Note:** The current approach (calculating from confirmed bookings) is actually correct and avoids this issue. This is more of a documentation concern.

---

### 15. **Missing Validation for Booking Category**

**Severity:** 🟡 MEDIUM  
**Impact:** Invalid categories can be stored  
**Location:** `src/app/api/bookings/route.ts` (POST)

**Issue:**
Category validation (lines 123-132) only runs if `canSetCategory` is true, but the category is always stored. A malicious user could send an invalid category.

**Fix:**

```typescript
// Always validate category, even if user can't set it
if (
  data.category &&
  !["regular", "academy", "tournament"].includes(data.category)
) {
  return NextResponse.json({ error: "Invalid category" }, { status: 400 });
}
```

---

### 16. **Error Messages Leak Information**

**Severity:** 🟡 MEDIUM  
**Impact:** Error messages reveal system internals  
**Location:** Multiple API routes

**Issue:**
Error messages like "You don't own this location" reveal that the location exists, which could be used for enumeration attacks.

**Fix:**

```typescript
// Use generic error messages
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
```

---

### 17. **Missing Rate Limiting**

**Severity:** 🟡 MEDIUM  
**Impact:** API endpoints vulnerable to abuse  
**Location:** All API routes

**Issue:**
No rate limiting on API endpoints. A malicious user could:

- Spam booking creation
- Flood the system with requests
- Cause DoS

**Fix:**
Implement rate limiting middleware (e.g., `@upstash/ratelimit`).

---

### 18. **Inconsistent Error Status Codes**

**Severity:** 🟡 MEDIUM  
**Impact:** Confusing error handling for clients  
**Location:** Multiple API routes

**Issue:**
Some routes return 401 for unauthenticated and 403 for unauthorized, but others return 401 for both.

**Fix:**
Standardize:

- 401: Not authenticated
- 403: Authenticated but not authorized
- 404: Resource not found

---

### 19. **Pending Admins Endpoint Missing Club Owner Role**

**Severity:** 🟡 MEDIUM  
**Impact:** Club owner registrations not shown in pending list  
**Location:** `src/app/api/admin/pending/route.ts`

**Issue:**
The pending admins query (line 20-24) only checks for `role: "admin"`, but `club_owner` role registrations are stored as `role: "club_owner"` and won't appear in the pending list.

**Reproduction:**

1. Register as `club_owner` (not approved)
2. Super admin checks `/api/admin/pending` → **Club owner not shown**

**Fix:**

```typescript
const pendingAdmins = await prisma.user.findMany({
  where: {
    OR: [
      { role: "admin", isApproved: false },
      { role: "club_owner", isApproved: false },
    ],
  },
  // ...
});
```

---

## 🟢 MINOR ISSUES

### 20. **Missing Input Sanitization for Description Fields**

**Severity:** 🟢 MINOR  
**Impact:** XSS risk if descriptions are rendered in UI  
**Location:** `src/app/api/club-owner/transactions/route.ts`

**Fix:**
Sanitize HTML in description fields before storing.

---

### 21. **No Audit Logging**

**Severity:** 🟢 MINOR  
**Impact:** Cannot track who made what changes  
**Location:** All write operations

**Fix:**
Add audit log table to track:

- Who created/modified/deleted records
- When changes were made
- What changed

---

### 22. **Missing Validation for Price Per Hour**

**Severity:** 🟢 MINOR  
**Impact:** Negative or zero prices possible  
**Location:** `src/app/api/courts/route.ts` (POST)

**Fix:**

```typescript
if (pricePerHour <= 0) {
  return NextResponse.json(
    { error: "Price must be greater than 0" },
    { status: 400 }
  );
}
```

---

### 23. **Inconsistent Date Format Handling**

**Severity:** 🟢 MINOR  
**Impact:** Date parsing might fail with different formats  
**Location:** Multiple files

**Fix:**
Use a consistent date format (ISO 8601) and validate input format.

---

### 24. **Missing Index on FinancialTransaction.transactionDate**

**Severity:** 🟢 MINOR  
**Impact:** Slow queries on date-filtered transactions  
**Location:** `prisma/schema.prisma`

**Fix:**
Already has index: `@@index([locationId, transactionDate])` - This is fine.

---

### 25. **No Soft Delete for Bookings**

**Severity:** 🟢 MINOR  
**Impact:** Deleted bookings are permanently lost  
**Location:** `src/app/api/club-owner/bookings/[id]/route.ts` (DELETE)

**Issue:**
Bookings are hard-deleted. Consider soft delete for audit trail.

**Fix:**
Add `deletedAt` field and filter deleted records in queries.

---

## ✅ POSITIVE FINDINGS

1. **Good:** RBAC utility functions are centralized in `src/lib/rbac.ts`
2. **Good:** Database schema has proper foreign keys and cascading deletes
3. **Good:** Financial calculations use confirmed bookings directly (more reliable)
4. **Good:** Cancellation logic handles overnight bookings
5. **Good:** Location ownership checks are present in most endpoints

---

## 📋 RECOMMENDATIONS

### Immediate Actions (Before Production)

1. ✅ Add `isApproved` checks to all protected API routes
2. ✅ Implement location assignment system for `owner_partner` and `moderator`
3. ✅ Add database transactions for booking creation
4. ✅ Fix cancellation transaction matching logic
5. ✅ Add input validation and sanitization
6. ✅ Implement rate limiting

### Short-term Improvements

1. Add comprehensive audit logging
2. Implement soft deletes for critical records
3. Add automated tests for all business rules
4. Standardize error messages and status codes
5. Add API documentation

### Long-term Enhancements

1. Implement event sourcing for financial transactions
2. Add real-time booking conflict detection
3. Implement caching for frequently accessed data
4. Add monitoring and alerting
5. Performance optimization for large datasets

---

## 🧪 TESTING RECOMMENDATIONS

### Unit Tests Needed

- Role permission checks
- Booking overlap detection
- Financial calculation logic
- Date/time handling (timezone, overnight)

### Integration Tests Needed

- Complete booking flow (create → cancel → verify financials)
- Concurrent booking creation
- Location access control
- Approval workflow

### E2E Tests Needed

- User registration → approval → access
- Booking creation with all role types
- Financial summary accuracy
- Cancellation flow

---

## 📊 Risk Matrix

| Issue                    | Likelihood | Impact | Risk Level  |
| ------------------------ | ---------- | ------ | ----------- |
| Unapproved user access   | High       | High   | 🔴 Critical |
| Location access bypass   | Medium     | High   | 🔴 Critical |
| Race condition bookings  | Medium     | High   | 🔴 Critical |
| Missing input validation | High       | Medium | 🟡 Medium   |
| Timezone issues          | Low        | Medium | 🟡 Medium   |

---

## 🎯 Conclusion

The system has a **solid foundation** with good RBAC structure and business logic, but **critical security and data integrity issues** must be addressed before production deployment.

**Priority:** Fix all 🔴 Critical issues, then address 🟡 Medium issues, and finally implement 🟢 Minor improvements.

**Estimated Fix Time:** 2-3 days for critical issues, 1 week for all issues.

---

**Report Generated:** January 9, 2026  
**Next Review:** After critical fixes are implemented
