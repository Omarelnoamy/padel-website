# How Users Become Players - Complete Guide

## Overview

In your system, **Users** and **Players** are **separate entities** that can be linked together. A User can exist without being a Player, and a Player can exist without being linked to a User.

---

## Database Relationship

### Schema Structure:

```prisma
model User {
  id        String   @id
  email     String   @unique
  name      String?
  // ... other fields
  player    Player?  // Optional: One user can have one player
}

model Player {
  id       String  @id
  name     String  @unique
  points   Int
  rank     Int
  userId   String? @unique  // Optional: Links to a User
  user     User?   @relation(fields: [userId], references: [id])
}
```

**Key Points:**
- `userId` in Player is **optional** - a Player can exist without a User
- `player` in User is **optional** - a User can exist without a Player
- When linked: `Player.userId` = `User.id`

---

## How Users Become Players

There are **3 ways** a User can become linked to a Player:

---

### **Method 1: Automatic Matching During Registration** ⭐ Most Common

**When it happens:**
- User registers a new account (regular user, not admin)
- System automatically checks if their name matches someone in the point system

**Process:**

1. **User registers** with name (e.g., "Ahmed Mohamed")
   ```
   POST /api/register
   {
     email: "ahmed@example.com",
     name: "Ahmed Mohamed",
     password: "..."
   }
   ```

2. **System checks for match** in point system
   - Uses `findMatchingPlayer()` function
   - Compares user's name with existing players
   - Calculates similarity score (0-1)

3. **If match found** (similarity ≥ 70%):
   - Creates a notification for the user:
     ```
     Title: "Is this you?"
     Message: "We found 'Ahmed Mohamed' with 150 points in Port Said rankings. 
               Confirm if this is you to import the points."
     Type: "player_match"
     ```

4. **User sees notification** and can:
   - **Accept:** Creates Player record linked to their User account
   - **Reject:** Dismisses the match (can create player manually later)

5. **If user accepts:**
   - Player record is created with:
     - `userId` = User's ID (links them together)
     - `name` = Matched name from point system
     - `points` = Points from point system
     - `rank` = Next available rank
     - `location` = "Port Said" (default)

**Code Location:**
- Registration: `src/app/api/register/route.ts` (lines 92-119)
- Confirmation: `src/app/api/players/confirm/route.ts` (lines 47-81)

---

### **Method 2: Manual Player Creation by Admin** (NOT Linked to User)

**When it happens:**
- Admin goes to "Manage Players" page (`/admin/players`)
- Admin fills out the "Create New Player" form
- Admin clicks "Create Player"

**Process:**

1. **Admin creates player** via form:
   ```
   POST /api/players
   {
     name: "Ahmed Mohamed",
     points: 150,
     category: "Intermediate",
     location: "Port Said"
   }
   ```

2. **Player record created:**
   - `userId` = **null** (NOT linked to any user)
   - `name` = Name from form
   - `points` = Points from form (or matched from point system)
   - `rank` = Next available rank

3. **Result:**
   - Player exists in database
   - Player is **NOT linked to any User**
   - This is a **standalone player record**

**Important:** This method creates a Player that is **NOT connected to a User account**. It's just a player record in the rankings system.

**Code Location:**
- Form: `src/components/PlayerCreationForm.tsx`
- API: `src/app/api/players/route.ts` (POST method)

---

### **Method 3: User Confirms Match from Notification**

**When it happens:**
- User receives a "player_match" notification (from Method 1)
- User clicks to view notification
- User clicks "Yes, use X points" or "Accept"

**Process:**

1. **User receives notification** (from registration match)

2. **User clicks "Accept"** in notification:
   ```
   POST /api/players/confirm
   {
     notificationId: "...",
     accept: true
   }
   ```

3. **System checks:**
   - Does this user already have a Player? (`Player.userId === user.id`)
   - If yes: Updates existing Player
   - If no: Creates new Player

4. **Player created/updated:**
   - `userId` = Current user's ID ✅ **LINKED**
   - `name` = Matched name
   - `points` = Points from point system
   - `rank` = Next available rank

5. **Result:**
   - User is now linked to a Player
   - User can see their points and rank
   - User's bookings can be associated with their player profile

**Code Location:**
- `src/app/api/players/confirm/route.ts` (lines 47-81)

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  System checks point │
            │  system for match    │
            └──────────┬───────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
    Match Found                  No Match
    (≥70% similarity)            Found
         │                           │
         ▼                           │
┌──────────────────┐                │
│ Create           │                │
│ Notification     │                │
│ "Is this you?"   │                │
└────────┬─────────┘                │
         │                           │
         ▼                           │
┌──────────────────┐                │
│ User sees        │                │
│ notification     │                │
└────────┬─────────┘                │
         │                           │
    ┌────┴────┐                      │
    │         │                      │
    ▼         ▼                      │
 Accept    Reject                    │
    │         │                      │
    │         └──────────────────────┘
    │                                 │
    ▼                                 ▼
┌──────────────────┐         ┌──────────────────┐
│ Create Player    │         │ User remains     │
│ with userId      │         │ without Player   │
│ (LINKED) ✅      │         │ (can create      │
└──────────────────┘         │ manually later)  │
                             └──────────────────┘
```

---

## Key Differences

### **Player Created by Admin (Method 2):**
- ❌ `userId` = null (NOT linked to User)
- ✅ Exists in rankings
- ✅ Can have points, rank, wins, losses
- ❌ Cannot login or make bookings (no User account)
- **Use case:** Creating player records for people who don't have accounts

### **Player Created from User Match (Methods 1 & 3):**
- ✅ `userId` = User's ID (LINKED to User)
- ✅ Exists in rankings
- ✅ Can have points, rank, wins, losses
- ✅ Can login and make bookings (has User account)
- ✅ User can see their player profile
- **Use case:** Converting registered users into ranked players

---

## Current State in Your System

### **Scenario 1: User with Player**
```
User {
  id: "user123",
  email: "ahmed@example.com",
  name: "Ahmed Mohamed"
}

Player {
  id: "player456",
  name: "Ahmed Mohamed",
  userId: "user123",  ← LINKED
  points: 150,
  rank: 5
}
```
**Result:** User can see their points, rank, and player profile.

### **Scenario 2: User without Player**
```
User {
  id: "user123",
  email: "ahmed@example.com",
  name: "Ahmed Mohamed"
}

Player: null  ← No player record
```
**Result:** User can make bookings but has no ranking/points.

### **Scenario 3: Player without User**
```
User: null  ← No user account

Player {
  id: "player456",
  name: "Ahmed Mohamed",
  userId: null,  ← NOT LINKED
  points: 150,
  rank: 5
}
```
**Result:** Player exists in rankings but cannot login or make bookings.

---

## How to Link an Existing User to an Existing Player

**Currently, there's no direct UI for this**, but it can be done:

### **Option A: Database Update (Manual)**
```sql
UPDATE "Player" 
SET "userId" = 'user-id-here' 
WHERE "name" = 'Player Name';
```

### **Option B: Create API Endpoint (Recommended)**
You could create an endpoint like:
```
POST /api/players/link
{
  userId: "user123",
  playerId: "player456"
}
```

This would:
1. Check if user already has a player
2. Check if player already has a user
3. Link them together
4. Update points/rank if needed

---

## Summary

**A User becomes a Player when:**

1. ✅ **During registration:** System finds a name match and user accepts
2. ✅ **From notification:** User accepts a "player_match" notification
3. ❌ **Admin creates player:** This creates a standalone player (NOT linked to user)

**The key is the `userId` field:**
- If `Player.userId` is set → User and Player are linked ✅
- If `Player.userId` is null → Player is standalone (not linked to any user) ❌

**To check if a user is a player:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { player: true }
});

if (user.player) {
  // User is linked to a player
  console.log("Player points:", user.player.points);
} else {
  // User is not a player yet
  console.log("User has no player record");
}
```
