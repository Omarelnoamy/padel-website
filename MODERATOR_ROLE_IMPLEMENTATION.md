# 👮 Moderator Role Implementation - Technical Summary

## Overview

This document provides a comprehensive summary of the Moderator role implementation in the PadelPro system. The Moderator role represents "Club Managers" who handle daily operations with controlled permissions, separate from Club Owners (full control) and Regular Users.

---

## 🎯 Role Definition

**Moderator**:
- **Role**: `admin`
- **Admin Type**: `moderator`
- **Purpose**: Manage daily operations for assigned locations
- **Key Difference**: Cannot access financial ownership data, cannot hard delete records, cannot manage locations

---

## ✅ Completed Implementation

### 1. Database Schema

**File**: `prisma/schema.prisma`

**Added Models**:
- `LocationAssignment`: Links moderators to specific locations
  ```prisma
  model LocationAssignment {
    id          String   @id @default(cuid())
    userId      String   // Moderator's user ID
    locationId  String   // Assigned location ID
    assignedAt  DateTime @default(now())
    assignedById String? // Super Admin who assigned (optional, for audit)
    user        User     @relation("AssignedModerator", fields: [userId], references: [id], onDelete: Cascade)
    location    Location @relation("AssignedLocation", fields: [locationId], references: [id], onDelete: Cascade)

    @@unique([userId, locationId])
    @@index([userId])
    @@index([locationId])
  }
  ```

**Updated Relations**:
- Added `assignedLocations` relation to `User` model
- Added `moderatorAssignments` relation to `Location` model

**Migration Required**:
```bash
npx prisma migrate dev --name add_location_assignment
```

---

### 2. RBAC Permission System

**File**: `src/lib/rbac.ts`

**New Functions**:
- `getAssignedLocationIds()`: Returns location IDs assigned to current moderator
- `getAccessibleLocationIds()`: Returns all accessible locations (owned + assigned)
- `canHardDelete()`: Moderators return `false` - they cannot hard delete
- `canViewOperationalData()`: Moderators return `true` - they can view operational data
- `canApproveTransactions()`: Moderators return `false` - they cannot approve financial transactions

**Updated Functions**:
- `canViewFinancials()`: Moderators explicitly return `false` - they cannot view financial data
- `canAccessLocation()`: Now uses `getAccessibleLocationIds()` instead of only `getOwnedLocationIds()`

**Permission Matrix**:

| Permission | Club Owner | Moderator | Super Admin |
|------------|-----------|-----------|-------------|
| View Bookings | ✅ Owned | ✅ Assigned | ✅ All |
| Create Bookings | ✅ Owned | ✅ Assigned | ✅ All |
| Cancel Bookings | ✅ Owned | ✅ Assigned | ✅ All |
| Hard Delete | ✅ Owned | ❌ | ✅ All |
| View Financials | ✅ Owned | ❌ | ✅ All |
| Manage Transactions | ✅ Owned | ❌ | ✅ All |
| Approve Transactions | ✅ Owned | ❌ | ✅ All |
| Manage Locations | ✅ Owned | ❌ | ✅ All |

---

### 3. API Routes - Bookings

**File**: `src/app/api/club-owner/bookings/route.ts`

**Changes**:
- **GET**: Now uses `getAccessibleLocationIds()` instead of `getOwnedLocationIds()`
- **POST**: Validates location access using accessible location IDs
- **Location Filtering**: Uses accessible locations for all queries

**Key Updates**:
```typescript
// Before: Only club owners could see bookings
const ownedLocationIds = await getOwnedLocationIds();

// After: Club owners and moderators can see bookings
const accessibleLocationIds = await getAccessibleLocationIds();
```

---

### 4. API Routes - Booking Deletion

**File**: `src/app/api/club-owner/bookings/[id]/route.ts`

**Changes**:
- **DELETE**: Added `canHardDelete()` check
- **Error Message**: Moderators get clear message: "Moderators cannot delete bookings. Please use cancel instead."
- **Access Check**: Uses `canAccessLocation()` instead of `isLocationOwner()`

**Security**:
- Moderators can cancel bookings (soft delete via status change)
- Moderators cannot hard delete bookings from database
- Clear error messages guide users

---

### 5. API Routes - Transactions

**File**: `src/app/api/club-owner/transactions/route.ts`

**Changes**:
- **GET**: Explicitly blocks moderators from viewing financial transactions
- **Location Filtering**: Uses `getAccessibleLocationIds()` for owner partners
- **Error Message**: Moderators get: "Moderators cannot view financial transactions"

**Security**:
- Early return if moderator attempts to access
- Financial data completely inaccessible to moderators

---

## 🔨 Remaining Tasks

### 6. Financial Summary API
**File**: `src/app/api/club-owner/financials/summary/route.ts`

**Required**:
- Add moderator check at start of GET handler
- Block moderators from accessing financial summary
- Use `getAccessibleLocationIds()` for location filtering

### 7. Location Assignment API (NEW)
**File**: `src/app/api/admin/moderators/[userId]/locations/route.ts`

**Required Endpoints**:
- **GET**: Get assigned locations for a moderator
- **POST**: Assign location to moderator (Super Admin only)
- **DELETE**: Unassign location from moderator (Super Admin only)

### 8. Location Fetching API
**File**: `src/app/api/locations/route.ts`

**Required**:
- Update GET to return assigned locations for moderators
- Use `getAccessibleLocationIds()` to filter locations

### 9. Club Owner Dashboard UI
**File**: `src/app/admin/club-owner/page.tsx`

**Required**:
- Hide "Transactions" tab for moderators
- Hide financial summary section
- Hide financial charts
- Show informational message about operational-only access
- Conditionally render based on `isModerator` check

### 10. Super Admin Dashboard UI
**File**: `src/app/admin/super-admin/page.tsx`

**Required**:
- Add "Manage Moderators" section
- Add UI to assign/unassign locations
- Show list of moderators with their assigned locations
- Allow bulk operations

---

## 🔐 Security Implementation

### Permission Checks Pattern

**API Routes**:
```typescript
// 1. Check specific permission
if (await isModerator()) {
  return NextResponse.json(
    { error: "Moderators cannot perform this action" },
    { status: 403 }
  );
}

// 2. Get accessible locations
const accessibleIds = await getAccessibleLocationIds();
if (accessibleIds.length === 0) {
  return NextResponse.json({ data: [] });
}

// 3. Validate location access
if (!accessibleIds.includes(locationId)) {
  return NextResponse.json(
    { error: "You don't have access to this location" },
    { status: 403 }
  );
}
```

**UI Components**:
```typescript
const user = session?.user as any;
const isModerator = user?.role === "admin" && user?.adminType === "moderator";

{!isModerator && (
  <Tab value="transactions">
    <TabTrigger>Transactions</TabTrigger>
  </Tab>
)}
```

---

## 📋 Testing Checklist

### Basic Functionality
- [ ] Moderator can login
- [ ] Moderator can access Club Owner Dashboard
- [ ] Moderator sees assigned locations only
- [ ] Moderator can view bookings for assigned locations
- [ ] Moderator can create bookings for assigned locations
- [ ] Moderator can cancel bookings (soft delete)
- [ ] Moderator cannot hard delete bookings
- [ ] Moderator cannot view financial transactions
- [ ] Moderator cannot view financial summary
- [ ] Moderator cannot approve transaction requests

### Location Assignment
- [ ] Super Admin can assign locations to moderators
- [ ] Super Admin can unassign locations from moderators
- [ ] Moderator immediately sees newly assigned locations
- [ ] Moderator loses access to unassigned locations

### Security
- [ ] Moderator cannot access locations they're not assigned to
- [ ] Moderator cannot bypass financial API restrictions
- [ ] Moderator cannot hard delete even with direct API calls
- [ ] Permission checks work correctly in all scenarios

---

## 🚀 Deployment Steps

1. **Run Migration**:
   ```bash
   npx prisma migrate dev --name add_location_assignment
   npx prisma generate
   ```

2. **Update Remaining APIs**:
   - Financial summary API
   - Location fetching API

3. **Create Location Assignment API**:
   - New route for Super Admin
   - Assignment/unassignment endpoints

4. **Update UI**:
   - Hide financial features for moderators
   - Add moderator management UI for Super Admin

5. **Test**:
   - Create test moderator account
   - Assign locations
   - Test all scenarios in checklist

6. **Deploy**:
   - Review all changes
   - Deploy to staging
   - Test in staging environment
   - Deploy to production

---

## 📝 Code Examples

### Getting Assigned Locations
```typescript
import { getAssignedLocationIds } from "@/lib/rbac";

const assignedIds = await getAssignedLocationIds();
// Returns: ["loc1", "loc2"] for assigned locations
// Returns: [] if no locations assigned
```

### Checking Moderator Access
```typescript
import { canViewFinancials, canHardDelete } from "@/lib/rbac";

const canView = await canViewFinancials();
// Returns: false for moderators

const canDelete = await canHardDelete();
// Returns: false for moderators
```

### Validating Location Access
```typescript
import { canAccessLocation } from "@/lib/rbac";

const hasAccess = await canAccessLocation(locationId);
// Returns: true if location is owned (club owner) or assigned (moderator)
// Returns: false otherwise
```

---

## 🔍 Troubleshooting

### Moderator Sees No Locations
**Issue**: Moderator has no assigned locations
**Solution**: Super Admin must assign locations via location assignment API

### Moderator Can Access All Locations
**Issue**: `getAccessibleLocationIds()` returns all locations
**Solution**: Check that `getAssignedLocationIds()` is being called for moderators, not `getOwnedLocationIds()`

### Financial Data Still Accessible
**Issue**: UI not properly hiding financial tabs
**Solution**: Add `isModerator` checks in UI components

### Hard Delete Still Works
**Issue**: API not checking `canHardDelete()`
**Solution**: Add `canHardDelete()` check in DELETE handlers

---

## 📚 Related Documentation

- `MODERATOR_TESTING_GUIDE.md` - How to test moderator functionality
- `CLUB_OWNER_VS_MODERATOR.md` - Differences between roles
- `MODERATOR_IMPLEMENTATION_SUMMARY.md` - Implementation status

---

## ✨ Summary

The Moderator role implementation provides:
- ✅ Fine-grained permissions (operational vs financial)
- ✅ Location-based access control via assignments
- ✅ Security boundaries (no financial access, no hard deletes)
- ✅ Scalable architecture for future role additions
- ✅ Clear separation from Club Owners and Regular Users

**Status**: Core implementation complete (RBAC, Booking APIs, Transaction APIs)
**Next**: Location Assignment APIs, UI Updates, Testing

---

**Last Updated**: Based on current codebase analysis
**Implementation Version**: 1.0
