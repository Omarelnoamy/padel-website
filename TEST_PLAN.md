# 🧪 Comprehensive Test Plan - Padel Booking System

## Test Environment Setup

**Database:** Development (PostgreSQL via Supabase)  
**Reset Method:** `prisma migrate reset --force`  
**Seed Data:** Automated via `prisma/seed.ts`

---

## 📋 Test Matrix

| Test ID  | Category       | Feature                  | Role            | Expected Result                  | Status |
| -------- | -------------- | ------------------------ | --------------- | -------------------------------- | ------ |
| AUTH-001 | Authentication | Login                    | All roles       | Success                          | ⏳     |
| AUTH-002 | Authentication | Unapproved access        | Club Owner B    | 401/403                          | ⏳     |
| AUTH-003 | Authentication | Approved access          | Club Owner A    | Success                          | ⏳     |
| RBAC-001 | RBAC           | Super Admin full access  | super_admin     | All endpoints accessible         | ⏳     |
| RBAC-002 | RBAC           | Owner Partner read-only  | owner_partner   | Read: ✅, Write: ❌              | ⏳     |
| RBAC-003 | RBAC           | Moderator booking access | moderator       | Can book, cannot manage finances | ⏳     |
| RBAC-004 | RBAC           | Club Admin booking       | club_admin      | Unlimited booking                | ⏳     |
| RBAC-005 | RBAC           | Regular user limits      | user            | 2-hour daily limit               | ⏳     |
| BOOK-001 | Booking        | Valid booking            | regular_user    | Success                          | ⏳     |
| BOOK-002 | Booking        | Overlapping booking      | regular_user    | 400 Conflict                     | ⏳     |
| BOOK-003 | Booking        | Race condition           | concurrent      | No double booking                | ⏳     |
| BOOK-004 | Booking        | Daily limit              | regular_user    | Blocked after 2 hours            | ⏳     |
| BOOK-005 | Booking        | Overnight booking        | regular_user    | Success                          | ⏳     |
| BOOK-006 | Booking        | Cancellation 4h rule     | regular_user    | Blocked if < 4h                  | ⏳     |
| BOOK-007 | Booking        | Admin cancellation       | admin           | No restrictions                  | ⏳     |
| BOOK-008 | Booking        | Duplicate cancellation   | any             | Only one negative transaction    | ⏳     |
| FIN-001  | Financial      | Booking revenue          | club_owner      | Auto-created                     | ⏳     |
| FIN-002  | Financial      | Manual income            | club_owner      | Success                          | ⏳     |
| FIN-003  | Financial      | Manual expense           | club_owner      | Success                          | ⏳     |
| FIN-004  | Financial      | Owner Partner read       | owner_partner   | Can view, cannot create          | ⏳     |
| FIN-005  | Financial      | Moderator blocked        | moderator       | Cannot access finances           | ⏳     |
| FIN-006  | Financial      | Summary totals           | club_owner      | Accurate                         | ⏳     |
| FIN-007  | Financial      | Monthly charts           | club_owner      | Correct aggregation              | ⏳     |
| LOC-001  | Location       | Owner access             | club_owner      | Only owned locations             | ⏳     |
| LOC-002  | Location       | Cross-location access    | club_owner      | 403 Forbidden                    | ⏳     |
| LOC-003  | Location       | Admin full access        | super_admin     | All locations                    | ⏳     |
| VAL-001  | Validation     | XSS in description       | any             | Sanitized                        | ⏳     |
| VAL-002  | Validation     | Invalid locationId       | any             | 400 Bad Request                  | ⏳     |
| VAL-003  | Validation     | Invalid date format      | any             | 400 Bad Request                  | ⏳     |
| VAL-004  | Validation     | Negative price           | any             | 400 Bad Request                  | ⏳     |
| VAL-005  | Validation     | Oversized payload        | any             | 400/413                          | ⏳     |
| ERR-001  | Error Handling | 401 Unauthenticated      | unauthenticated | Correct status                   | ⏳     |
| ERR-002  | Error Handling | 403 Unauthorized         | wrong_role      | Correct status                   | ⏳     |
| ERR-003  | Error Handling | Generic errors           | any             | No sensitive leaks               | ⏳     |

---

## 🔍 Detailed Test Cases

### 1️⃣ Authentication & Approval

#### AUTH-001: Unapproved User Access Block

**Setup:** Login as `clubownerb@test.com` (unapproved)  
**Test:** Attempt to access `/api/club-owner/bookings`  
**Expected:** 401 Unauthorized or 403 Forbidden  
**Validation:** `isApproved === false` blocks access

#### AUTH-002: Approved User Access

**Setup:** Login as `clubownera@test.com` (approved)  
**Test:** Access `/api/club-owner/bookings`  
**Expected:** 200 OK with bookings  
**Validation:** `isApproved === true` allows access

#### AUTH-003: Regular User Auto-Approved

**Setup:** Login as `user@test.com`  
**Test:** Access `/api/bookings`  
**Expected:** 200 OK  
**Validation:** Regular users are always approved

---

### 2️⃣ Role-Based Access Control

#### RBAC-001: Owner Partner Read-Only

**Setup:** Login as `ownerpartner@test.com`  
**Tests:**

- GET `/api/club-owner/bookings` → ✅ 200 OK
- POST `/api/club-owner/bookings` → ❌ 403 Forbidden
- POST `/api/club-owner/transactions` → ❌ 403 Forbidden
- PATCH `/api/club-owner/bookings/{id}` → ❌ 403 Forbidden

#### RBAC-002: Moderator Booking Access

**Setup:** Login as `moderator@test.com`  
**Tests:**

- POST `/api/club-owner/bookings` → ✅ 200 OK
- GET `/api/club-owner/financials/summary` → ❌ 403 Forbidden (no financial access)
- POST `/api/club-owner/transactions` → ❌ 403 Forbidden

#### RBAC-003: Club Admin Unlimited Booking

**Setup:** Login as `clubadmin@test.com`  
**Tests:**

- Book 6 hours in one day → ✅ Success (no daily limit)
- Book non-consecutive slots → ✅ Success
- Cancel anytime → ✅ Success

#### RBAC-004: Regular User Limits

**Setup:** Login as `user@test.com`  
**Tests:**

- Book 1 hour → ✅ Success
- Book 2 hours total → ✅ Success
- Attempt 3rd hour → ❌ 400 Bad Request (daily limit)

---

### 3️⃣ Booking System

#### BOOK-001: Valid Booking Creation

**Setup:** Login as `user@test.com`  
**Test:** Create booking for tomorrow, 10:00-11:00  
**Expected:** 200 OK, booking created  
**Validation:**

- Booking exists in database
- Status is "confirmed"
- Total price calculated correctly

#### BOOK-002: Overlapping Booking Prevention

**Setup:** Existing booking 10:00-12:00  
**Test:** Attempt to book 11:00-13:00  
**Expected:** 400 Bad Request  
**Validation:** Error message indicates conflict

#### BOOK-003: Race Condition Prevention

**Setup:** Two concurrent requests for same slot  
**Test:** Send both requests simultaneously  
**Expected:** Only one booking created  
**Validation:** Database transaction prevents double booking

#### BOOK-004: Overnight Booking

**Setup:** Login as `user@test.com`  
**Test:** Book 23:00-01:00 (next day)  
**Expected:** 200 OK  
**Validation:** Overlap detection handles overnight correctly

#### BOOK-005: Cancellation 4-Hour Rule

**Setup:** Booking at 14:00, current time 11:00  
**Test:** Attempt to cancel  
**Expected:** ✅ Success (3 hours before)  
**Test 2:** Current time 11:30  
**Expected:** ❌ 400 Bad Request (2.5 hours before, < 4h)

#### BOOK-006: Duplicate Cancellation Transaction

**Setup:** Cancel a booking  
**Test:** Cancel same booking again (if status check fails)  
**Expected:** Only one negative transaction created  
**Validation:** Check for existing negative transaction before creating

---

### 4️⃣ Financial Transactions

#### FIN-001: Booking Revenue Auto-Creation

**Setup:** Create new booking as club owner  
**Test:** Check financial transactions  
**Expected:** Income transaction auto-created  
**Validation:** Amount matches booking totalPrice

#### FIN-002: Manual Income Creation

**Setup:** Login as `clubownera@test.com`  
**Test:** POST `/api/club-owner/transactions` with type="income"  
**Expected:** 200 OK, transaction created  
**Validation:** Transaction appears in GET response

#### FIN-003: Owner Partner Read-Only

**Setup:** Login as `ownerpartner@test.com`  
**Test:** GET `/api/club-owner/transactions` → ✅  
**Test:** POST `/api/club-owner/transactions` → ❌ 403

#### FIN-004: Financial Summary Accuracy

**Setup:** Multiple bookings and transactions  
**Test:** GET `/api/club-owner/financials/summary`  
**Expected:** Totals match sum of transactions  
**Validation:**

- Income = confirmed bookings only
- Expenses = manual expenses only
- Net = Income - Expenses

---

### 5️⃣ Location Access Control

#### LOC-001: Owner Access to Owned Locations

**Setup:** Login as `clubownera@test.com` (owns Location A)  
**Test:** GET `/api/club-owner/bookings?locationId={locationA_id}`  
**Expected:** ✅ 200 OK  
**Test:** GET `/api/club-owner/bookings?locationId={locationB_id}`  
**Expected:** ❌ 403 Forbidden

#### LOC-002: Owner Partner Location Restriction

**Setup:** Login as `ownerpartner@test.com`  
**Test:** GET `/api/club-owner/bookings`  
**Expected:** Empty array (no location assignment)  
**Validation:** Cannot access all locations

---

### 6️⃣ Input Validation & Security

#### VAL-001: XSS Prevention

**Setup:** POST transaction with description: `<script>alert('xss')</script>`  
**Expected:** Description sanitized, script removed  
**Validation:** No script tags in stored description

#### VAL-002: Invalid ID Format

**Setup:** GET `/api/club-owner/bookings?locationId=../../etc/passwd`  
**Expected:** 400 Bad Request  
**Validation:** Only alphanumeric, dashes, underscores allowed

#### VAL-003: Invalid Date Format

**Setup:** POST booking with date="invalid-date"  
**Expected:** 400 Bad Request  
**Validation:** Must be YYYY-MM-DD format

#### VAL-004: Negative Price

**Setup:** POST transaction with amount=-100  
**Expected:** 400 Bad Request (for manual transactions)  
**Note:** Negative amounts allowed for cancellation transactions

---

### 7️⃣ Error Handling

#### ERR-001: Unauthenticated Access

**Setup:** No session  
**Test:** GET `/api/club-owner/bookings`  
**Expected:** 401 Unauthorized

#### ERR-002: Unauthorized Access

**Setup:** Login as `user@test.com`  
**Test:** GET `/api/club-owner/bookings`  
**Expected:** 403 Forbidden

#### ERR-003: Generic Error Messages

**Setup:** Attempt unauthorized action  
**Test:** Check error response  
**Expected:** Generic "Unauthorized" message  
**Validation:** No sensitive information leaked

---

## 🚀 Test Execution Script

See `test-runner.ts` for automated test execution.

---

## 📊 Test Results Summary

**Total Tests:** 33  
**Passed:** TBD  
**Failed:** TBD  
**Edge Cases Found:** TBD

---

## 🔧 Recommendations

1. **Location Assignment System:** Implement for `owner_partner` and `moderator` roles
2. **Rate Limiting:** Add to booking and transaction endpoints
3. **Audit Logging:** Track all sensitive operations
4. **Timezone Handling:** Standardize to UTC
5. **Input Sanitization:** Expand XSS prevention
