# 👥 Club Owner vs Moderator: Key Differences

This document explains the differences between **Club Owner** and **Moderator** roles in the PadelPro system.

---

## 📊 Quick Comparison Table

| Feature | Club Owner | Moderator |
|---------|-----------|-----------|
| **Role** | `role: "club_owner"` or `role: "admin"` with `adminType: "club_owner"` | `role: "admin"` with `adminType: "moderator"` |
| **Location Ownership** | ✅ Has owned locations (`ownerId` in Location table) | ❌ No owned locations (currently empty) |
| **Location Access** | ✅ Only sees locations they **own** | ⚠️ Currently sees **no locations** (needs assignment system) |
| **Booking Management** | ✅ Can manage bookings for **owned locations only** | ⚠️ Currently can't see bookings (needs assignment) |
| **Financial Access** | ✅ Can view transactions for **owned locations only** | ⚠️ Currently can't see transactions (needs assignment) |
| **Dashboard Access** | ✅ Club Owner Dashboard | ✅ Club Owner Dashboard (same UI) |
| **Permissions** | ✅ Full control over owned locations | ✅ Same permissions, but needs location assignment |

---

## 🔑 Key Differences Explained

### 1. **Location Ownership**

#### Club Owner
- **Has actual ownership** in the database
- Locations have `ownerId` field pointing to the club owner's user ID
- Example:
  ```prisma
  model Location {
    id       String @id
    name     String
    ownerId  String  // Points to club owner's User.id
    owner    User    @relation(fields: [ownerId], references: [id])
  }
  ```
- **Owned Location IDs** are retrieved by:
  ```typescript
  const locations = await prisma.location.findMany({
    where: { ownerId: user.id }
  });
  const ownedLocationIds = locations.map(loc => loc.id);
  ```

#### Moderator
- **Does NOT own locations** in the database
- No `ownerId` relationship
- **Currently**, `ownedLocationIds` returns **empty array** `[]`
- **Intended** to have a location assignment system (not yet implemented)
- Code comment in API:
  ```typescript
  // TODO: Implement location assignment system
  // For now, return empty to prevent access to all locations
  ownedLocationIds = [];
  ```

---

### 2. **Location Access**

#### Club Owner
- **Can only see locations they own**
- Filtered automatically by `ownerId`:
  ```typescript
  // GET /api/locations
  if (isClubOwner && user?.id) {
    where.ownerId = user.id;  // Only their locations
  }
  ```

#### Moderator
- **Currently sees NO locations** (because `ownedLocationIds = []`)
- **Intended behavior**: Should see locations assigned to them (once assignment system is implemented)
- **Current limitation**: All queries filter by `ownedLocationIds`, which is empty for moderators

---

### 3. **Booking Management**

#### Club Owner
- **Can view/create/cancel bookings** for owned locations only
- API filters bookings by `ownedLocationIds`:
  ```typescript
  // GET /api/club-owner/bookings
  where: {
    locationId: {
      in: ownedLocationIds  // Only owned locations
    }
  }
  ```

#### Moderator
- **Same permissions** as club owner (can create/cancel bookings)
- **But currently sees NO bookings** (because `ownedLocationIds = []`)
- Once location assignment is implemented, should work for assigned locations

---

### 4. **Financial Management**

#### Club Owner
- **Can view transactions** for owned locations only
- API filters by `ownedLocationIds`:
  ```typescript
  // GET /api/club-owner/transactions
  where: {
    locationId: {
      in: ownedLocationIds  // Only owned locations
    }
  }
  ```

#### Moderator
- **Same permissions** as club owner (can view/manage transactions)
- **But currently sees NO transactions** (because `ownedLocationIds = []`)
- Once location assignment is implemented, should work for assigned locations

---

### 5. **Dashboard UI**

Both roles see the **exact same dashboard** (`/admin/club-owner`):
- Same tabs: Overview, Bookings, Transactions, Locations
- Same features and UI components
- The only difference is the **page title**:
  - Club Owner: "Club Owner Dashboard"
  - Moderator: "Moderator Dashboard"

---

### 6. **Permissions Summary**

Both roles have **identical permissions** for:
- ✅ Creating bookings (no restrictions)
- ✅ Canceling bookings (no restrictions)
- ✅ Setting booking categories (Regular, Academy, Tournament)
- ✅ Viewing financial summaries
- ✅ Viewing charts and statistics
- ✅ Editing phone number (for locations)

The **only difference** is **which locations** they can access:
- **Club Owner**: Locations they **own** (via `ownerId`)
- **Moderator**: Locations they are **assigned to** (via future assignment system)

---

## 🚧 Current Implementation Status

### What Works Now

✅ **Club Owner**:
- Fully functional
- Can manage all features for owned locations
- Database relationships work correctly

⚠️ **Moderator**:
- **Dashboard access works** (can log in and see UI)
- **All features are available** (same permissions as club owner)
- **But currently sees NO data** because:
  - `ownedLocationIds = []` (empty array)
  - All queries filter by `ownedLocationIds`
  - Result: Empty bookings, empty transactions, empty locations

### What's Missing for Moderator

❌ **Location Assignment System**:
- Need a way to assign locations to moderators
- Could be a new database table:
  ```prisma
  model LocationAssignment {
    id         String @id @default(cuid())
    userId     String  // Moderator's user ID
    locationId String
    assignedAt DateTime @default(now())
    
    user       User     @relation(fields: [userId], references: [id])
    location   Location @relation(fields: [locationId], references: [id])
    
    @@unique([userId, locationId])
  }
  ```

❌ **API Updates**:
- Update `getOwnedLocationIds()` to also check `LocationAssignment` table for moderators
- Currently returns empty array for moderators as a security measure

---

## 🔍 Code References

### Club Owner Location Access

```typescript
// src/lib/club-owner-auth.ts
export async function getOwnedLocationIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const isOwner = await isClubOwner();
  if (!isOwner) return [];

  const locations = await prisma.location.findMany({
    where: { ownerId: userId }  // Only locations owned by this user
  });

  return locations.map((loc) => loc.id);
}
```

### Moderator Location Access (Current Limitation)

```typescript
// src/app/api/club-owner/bookings/route.ts
const isMod = await isModerator();

if (isOwnerPartner || isMod) {
  // TODO: Implement location assignment system
  // For now, return empty to prevent access to all locations
  ownedLocationIds = [];  // ⚠️ Empty array = no access
}
```

---

## 💡 Intended Use Cases

### Club Owner
- **Business owners** who physically own/operate padel locations
- They **own** the locations in the business sense
- Database reflects this ownership via `ownerId` field
- **Example**: "Padel Up" location is owned by user "John Doe"

### Moderator
- **Staff members** or **managers** who work at locations
- They **don't own** the locations but should have access to manage them
- Need to be **assigned** to specific locations by Super Admin or Club Owner
- **Example**: Moderator "Jane Smith" is assigned to manage "Padel Up" and "La Cancha" locations

---

## 🎯 Summary

### Current State

| Aspect | Club Owner | Moderator |
|--------|-----------|-----------|
| **Database Ownership** | ✅ Has `ownerId` in Location | ❌ No ownership |
| **Location Assignment** | ✅ Via `ownerId` field | ❌ Not implemented yet |
| **Access to Data** | ✅ Full access to owned locations | ❌ No access (empty array) |
| **Permissions** | ✅ Full permissions | ✅ Same permissions |
| **Dashboard** | ✅ Works perfectly | ⚠️ Works but shows no data |

### Key Takeaway

**Club Owner** = Business owner who owns locations → Has access via `ownerId`

**Moderator** = Staff/manager who should be assigned to locations → Currently has no access because assignment system doesn't exist yet

Both roles have **identical permissions**, but differ in **how they get access to locations**:
- Club Owner: Via **ownership** (`ownerId`)
- Moderator: Via **assignment** (future feature, not yet implemented)

---

## 🛠️ To Make Moderator Fully Functional

1. **Create Location Assignment System**:
   - Add `LocationAssignment` table to Prisma schema
   - Create API endpoints to assign/unassign locations to moderators
   - Add UI in Super Admin dashboard to manage assignments

2. **Update `getOwnedLocationIds()` Function**:
   - For moderators, also check `LocationAssignment` table
   - Return assigned location IDs instead of empty array

3. **Test**:
   - Assign locations to moderator
   - Verify moderator can see bookings/transactions for assigned locations
   - Verify moderator cannot see other locations

---

## 📝 Example Scenario

### Scenario: Two Locations, One Club Owner, One Moderator

**Locations:**
- Location A (owned by Club Owner)
- Location B (owned by Club Owner)

**Users:**
- Club Owner: "John Doe"
- Moderator: "Jane Smith"

**Current Behavior:**
- Club Owner sees: Location A and Location B (owns both)
- Moderator sees: Nothing (no assignments)

**Intended Behavior (after assignment system):**
- Club Owner sees: Location A and Location B (owns both)
- Moderator sees: Location A only (assigned by Super Admin)

**Both have same permissions**, but access different locations.

---

## 🔐 Security Note

The current implementation (returning empty array for moderators) is a **security measure** to prevent moderators from accessing **all locations** until the assignment system is implemented. This prevents unauthorized access while the feature is being developed.

---

## 📚 Related Files

- `src/lib/rbac.ts` - Role-based access control functions
- `src/lib/club-owner-auth.ts` - Club owner authentication/authorization
- `src/app/api/club-owner/bookings/route.ts` - Booking API (shows location filtering)
- `src/app/api/club-owner/transactions/route.ts` - Transactions API (shows location filtering)
- `src/app/admin/club-owner/page.tsx` - Club Owner Dashboard UI
- `prisma/schema.prisma` - Database schema

---

**Last Updated**: Based on current codebase analysis
