# 👮 Moderator Role Implementation Summary

## ✅ Completed Components

### 1. Database Schema (`prisma/schema.prisma`)
- ✅ Added `LocationAssignment` model for moderator location assignments
- ✅ Added relations in `User` and `Location` models
- **Next Step**: Run migration
  ```bash
  npx prisma migrate dev --name add_location_assignment
  ```

### 2. RBAC Permissions (`src/lib/rbac.ts`)
- ✅ Added `getAssignedLocationIds()` - Get locations assigned to moderators
- ✅ Added `getAccessibleLocationIds()` - Get all accessible locations (owned + assigned)
- ✅ Added `canHardDelete()` - Moderators cannot hard delete
- ✅ Added `canViewOperationalData()` - Moderators can view operational data
- ✅ Added `canApproveTransactions()` - Moderators cannot approve financial transactions
- ✅ Updated `canViewFinancials()` - Moderators cannot view financial data
- ✅ Updated `canAccessLocation()` - Uses accessible location IDs

### 3. API Routes - Bookings (`src/app/api/club-owner/bookings/route.ts`)
- ✅ GET: Updated to use `getAccessibleLocationIds()` instead of `getOwnedLocationIds()`
- ✅ POST: Updated to check accessible locations
- ✅ Updated location validation to use accessible locations

### 4. API Routes - Booking Deletion (`src/app/api/club-owner/bookings/[id]/route.ts`)
- ✅ DELETE: Added `canHardDelete()` check to prevent moderators from hard deleting
- ✅ Updated to use `canAccessLocation()` instead of `isLocationOwner()`

---

## 🔨 Remaining Implementation Tasks

### 5. API Routes - Transactions (`src/app/api/club-owner/transactions/route.ts`)
**Required Updates:**
- Update GET to use `getAccessibleLocationIds()` instead of empty array for moderators
- Ensure moderators cannot view financial transactions (use `canViewFinancials()`)
- Remove transaction creation for moderators (use `canManageFinancialTransactions()`)

**Current Issue**: Moderators get empty array, but should not see financials at all.

### 6. API Routes - Financial Summary (`src/app/api/club-owner/financials/summary/route.ts`)
**Required Updates:**
- Check `canViewFinancials()` - Moderators should be blocked
- If they somehow access, use `getAccessibleLocationIds()` for location filtering

### 7. API Routes - Location Assignment (NEW)
**Create**: `src/app/api/admin/moderators/[userId]/locations/route.ts`
```typescript
// GET: Get assigned locations for a moderator
// POST: Assign location to moderator
// DELETE: Unassign location from moderator
```

### 8. UI - Club Owner Dashboard (`src/app/admin/club-owner/page.tsx`)
**Required Updates:**
- Hide "Transactions" tab for moderators
- Hide financial summary section for moderators
- Hide "Update Summary" button for moderators
- Hide financial charts for moderators
- Show message: "Moderators can view operational data only. Financial data requires Club Owner or Super Admin access."

### 9. UI - Super Admin Dashboard (`src/app/admin/super-admin/page.tsx`)
**Required Updates:**
- Add "Manage Moderators" section
- Add UI to assign/unassign locations to moderators
- Show list of moderators with their assigned locations
- Allow bulk location assignment

### 10. Location Fetching (`src/app/api/locations/route.ts`)
**Required Updates:**
- Update GET to return assigned locations for moderators
- Use `getAccessibleLocationIds()` to filter locations

---

## 🔐 Permission Matrix

| Action | Club Owner | Moderator | Super Admin |
|--------|-----------|-----------|-------------|
| **View Bookings** | ✅ Owned | ✅ Assigned | ✅ All |
| **Create Bookings** | ✅ Owned | ✅ Assigned | ✅ All |
| **Cancel Bookings** | ✅ Owned | ✅ Assigned | ✅ All |
| **Hard Delete Bookings** | ✅ Owned | ❌ | ✅ All |
| **View Financial Transactions** | ✅ Owned | ❌ | ✅ All |
| **Manage Financial Transactions** | ✅ Owned | ❌ | ✅ All |
| **View Financial Summary** | ✅ Owned | ❌ | ✅ All |
| **Approve Transaction Requests** | ✅ Owned | ❌ | ✅ All |
| **Manage Locations** | ✅ Owned | ❌ | ✅ All |
| **Assign Locations to Moderators** | ❌ | ❌ | ✅ |

---

## 📋 Implementation Checklist

- [x] Database schema with LocationAssignment
- [x] RBAC permission functions
- [x] Booking API routes updated
- [ ] Transaction API routes updated
- [ ] Financial summary API routes updated
- [ ] Location assignment API routes (NEW)
- [ ] Club Owner Dashboard UI updated
- [ ] Super Admin Dashboard UI updated
- [ ] Location fetching API updated
- [ ] Migration created and run
- [ ] Test cases written
- [ ] Documentation updated

---

## 🚀 Next Steps

1. **Run Migration**:
   ```bash
   npx prisma migrate dev --name add_location_assignment
   ```

2. **Update Transaction APIs** to respect moderator permissions

3. **Create Location Assignment API** for Super Admin

4. **Update UI** to hide financial features for moderators

5. **Test** the complete flow:
   - Create moderator
   - Assign locations via Super Admin
   - Login as moderator
   - Verify can see bookings but not financials
   - Verify cannot hard delete
   - Verify cannot manage locations

---

## 🧪 Testing Scenarios

### Test 1: Moderator Access
1. Create moderator account
2. Assign locations via Super Admin
3. Login as moderator
4. ✅ Should see assigned locations only
5. ✅ Should see bookings for assigned locations
6. ❌ Should NOT see financial transactions
7. ❌ Should NOT see financial summary
8. ✅ Can create bookings for assigned locations
9. ✅ Can cancel bookings (soft delete)
10. ❌ Cannot hard delete bookings

### Test 2: Location Assignment
1. Login as Super Admin
2. Navigate to "Manage Moderators"
3. Select a moderator
4. Assign locations
5. ✅ Moderator should immediately see assigned locations
6. Unassign a location
7. ✅ Moderator should no longer see that location

### Test 3: Permission Boundaries
1. Login as moderator
2. Try to access `/api/club-owner/transactions` → ❌ Should fail
3. Try to access `/api/club-owner/financials/summary` → ❌ Should fail
4. Try to DELETE a booking → ❌ Should fail
5. Try to approve a transaction request → ❌ Should fail

---

## 📝 Code Patterns

### Checking Permissions in API Routes
```typescript
// Check if can view financials
const canView = await canViewFinancials();
if (!canView) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// Get accessible locations
const accessibleIds = await getAccessibleLocationIds();
if (accessibleIds.length === 0) {
  return NextResponse.json({ bookings: [] });
}

// Check if can hard delete
const canDelete = await canHardDelete();
if (!canDelete) {
  return NextResponse.json(
    { error: "Moderators cannot delete. Please use cancel instead." },
    { status: 403 }
  );
}
```

### Checking Permissions in UI
```typescript
const user = session?.user as any;
const isModerator = user?.role === "admin" && user?.adminType === "moderator";
const canViewFinancials = !isModerator; // Moderators cannot view

// Conditional rendering
{canViewFinancials && (
  <Tab value="transactions">
    <TabTrigger>Transactions</TabTrigger>
  </Tab>
)}
```

---

## 🔒 Security Considerations

1. **Location Assignment**: Only Super Admin can assign locations
2. **Financial Data**: Moderators completely blocked from financial APIs
3. **Hard Deletes**: Moderators can only soft delete (cancel bookings)
4. **Permission Checks**: All APIs check permissions before operations
5. **Empty Arrays**: When no locations assigned, return empty data (not error)

---

## 📚 Related Files

- `prisma/schema.prisma` - Database schema
- `src/lib/rbac.ts` - Permission functions
- `src/app/api/club-owner/bookings/route.ts` - Booking management
- `src/app/api/club-owner/bookings/[id]/route.ts` - Booking operations
- `src/app/api/club-owner/transactions/route.ts` - Financial transactions
- `src/app/admin/club-owner/page.tsx` - Club Owner Dashboard
- `src/app/admin/super-admin/page.tsx` - Super Admin Dashboard

---

**Status**: Phase 1 Complete (RBAC & Booking APIs)
**Next Phase**: Transaction APIs, Location Assignment APIs, UI Updates
