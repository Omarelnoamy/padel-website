# Step-by-Step Guide: Convert User to Player

This guide shows you **exactly** how to convert an existing user into a player in your system.

---

## Method 1: User Accepts Match Notification (Easiest) ⭐

**Use this when:** User registered and received a "player_match" notification.

### Steps:

1. **User logs in** to their account
2. **User checks notifications** (usually in navbar or notifications page)
3. **User finds notification** titled "Is this you?"
   - Message: "We found '[Name]' with [X] points in Port Said rankings..."
4. **User clicks "Accept" or "Yes, use X points"**
5. **Done!** ✅
   - Player record is automatically created
   - Player is linked to user's account
   - Points are imported from point system

**Result:** User is now a player with points and rank.

---

## Method 2: Create Player for User via Admin Panel (Manual)

**Use this when:** User doesn't have a notification, or you want to manually create a player for them.

### Option A: Create Player and Link via Database (Quick)

#### Steps:

1. **Get the User's ID:**
   - Go to your database (Prisma Studio or Supabase dashboard)
   - Find the user's email
   - Copy their `id` (e.g., `clx123abc456`)

2. **Create Player via Admin Panel:**
   - Go to `/admin/players` (as Super Admin or Club Owner)
   - Fill out the form:
     - **Player Name:** Enter user's name (must match exactly)
     - **Points:** Enter points (or leave empty to match from point system)
     - **Category:** (Optional)
     - **Location:** Enter location (e.g., "Port Said")
   - Click **"Create Player"**

3. **Link Player to User (Database Update):**
   
   **Using Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   - Navigate to `Player` table
   - Find the player you just created
   - Click to edit
   - In the `userId` field, paste the user's ID
   - Save

   **OR Using SQL (Supabase Dashboard):**
   ```sql
   UPDATE "Player" 
   SET "userId" = 'USER_ID_HERE' 
   WHERE "name" = 'Player Name';
   ```

4. **Verify:**
   - Check that `Player.userId` = User's ID
   - User should now see their player profile

**Result:** User is now linked to a player record.

---

### Option B: Create Notification for User (Recommended)

**Use this when:** You want the user to confirm the match themselves (better UX).

#### Steps:

1. **Create a notification manually in database:**

   **Using Prisma Studio:**
   ```bash
   npx prisma studio
   ```
   - Go to `Notification` table
   - Click "Add record"
   - Fill in:
     - `userId`: User's ID
     - `title`: "Is this you?"
     - `message`: "We found '[Player Name]' with [X] points in Port Said rankings. Confirm if this is you to import the points."
     - `type`: "player_match"
     - `read`: false
     - `metadata`: 
       ```json
       {
         "candidateName": "User's Name",
         "matchedName": "Player Name from Point System",
         "matchedPoints": 150,
         "similarity": 100
       }
       ```
   - Save

2. **User logs in** and sees the notification

3. **User clicks "Accept"** in the notification

4. **Done!** ✅ Player is created and linked automatically

**Result:** User confirms and becomes a player.

---

## Method 3: Using API Endpoint (For Developers)

**Use this when:** You want to automate the process or create a custom admin tool.

### Create a Link API Endpoint:

Create a new file: `src/app/api/players/link/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    
    // Only admins can link players
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, playerId, playerName, points, location } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has a player
    const existingPlayer = await prisma.player.findUnique({
      where: { userId: userId },
    });

    if (existingPlayer) {
      return NextResponse.json(
        { error: "User already has a player" },
        { status: 400 }
      );
    }

    let player;

    if (playerId) {
      // Link to existing player
      const targetPlayer = await prisma.player.findUnique({
        where: { id: playerId },
      });

      if (!targetPlayer) {
        return NextResponse.json(
          { error: "Player not found" },
          { status: 404 }
        );
      }

      if (targetPlayer.userId) {
        return NextResponse.json(
          { error: "Player already linked to another user" },
          { status: 400 }
        );
      }

      // Link existing player to user
      player = await prisma.player.update({
        where: { id: playerId },
        data: { userId: userId },
      });
    } else {
      // Create new player for user
      if (!playerName || !location) {
        return NextResponse.json(
          { error: "playerName and location are required when creating new player" },
          { status: 400 }
        );
      }

      const maxRank = await prisma.player.findFirst({
        orderBy: { rank: "desc" },
        select: { rank: true },
      });

      player = await prisma.player.create({
        data: {
          userId: userId,
          name: playerName,
          points: points || 0,
          rank: (maxRank?.rank || 0) + 1,
          category: null,
          location: location,
          wins: 0,
          losses: 0,
        },
      });
    }

    return NextResponse.json({ success: true, player });
  } catch (error: any) {
    console.error("Error linking player:", error);
    return NextResponse.json(
      { error: "Failed to link player" },
      { status: 500 }
    );
  }
}
```

### Usage:

**Link existing player to user:**
```bash
POST /api/players/link
{
  "userId": "user-id-here",
  "playerId": "player-id-here"
}
```

**Create new player for user:**
```bash
POST /api/players/link
{
  "userId": "user-id-here",
  "playerName": "Player Name",
  "points": 150,
  "location": "Port Said"
}
```

---

## Method 4: Direct Database Update (Fastest, but Manual)

**Use this when:** You need to quickly link a user to an existing player.

### Steps:

1. **Open Prisma Studio:**
   ```bash
   npx prisma studio
   ```

2. **Find the Player:**
   - Go to `Player` table
   - Find the player you want to link
   - Note the player's `id` or `name`

3. **Get User's ID:**
   - Go to `User` table
   - Find the user by email
   - Copy their `id`

4. **Update Player:**
   - Go back to `Player` table
   - Click on the player
   - Edit the `userId` field
   - Paste the user's ID
   - Save

5. **Verify:**
   - Check that `Player.userId` matches `User.id`
   - User should now be linked to player

**Result:** User is instantly linked to player.

---

## Quick Reference: Which Method to Use?

| Scenario | Best Method |
|----------|------------|
| User has notification | **Method 1** - User accepts notification |
| User registered, no notification | **Method 2B** - Create notification, user accepts |
| Admin wants to quickly link | **Method 4** - Direct database update |
| Need to automate/script | **Method 3** - Create API endpoint |
| Create new player for user | **Method 2A** or **Method 3** |

---

## Verification Checklist

After converting a user to a player, verify:

- [ ] `Player.userId` = `User.id` (they are linked)
- [ ] User can see their player profile (if UI exists)
- [ ] Player has points and rank
- [ ] Player record exists in database
- [ ] No errors in console/logs

---

## Troubleshooting

### Error: "Player already linked to another user"
- **Solution:** The player's `userId` field is already set. Either:
  - Use a different player
  - Unlink the existing user first (set `userId` to null)
  - Create a new player for this user

### Error: "User already has a player"
- **Solution:** The user already has a player linked. Check `Player` table where `userId` = user's ID.

### Player created but not linked
- **Solution:** Make sure `Player.userId` is set to the user's ID, not null.

### User can't see their player profile
- **Solution:** 
  - Verify `Player.userId` = `User.id`
  - Check if UI code queries `user.player` correctly
  - Clear browser cache and refresh

---

## Summary

**Easiest way:** User accepts a "player_match" notification (Method 1)

**Manual way:** Admin creates player, then updates `Player.userId` in database (Method 2A or 4)

**Best UX:** Create notification for user, let them confirm (Method 2B)

**For automation:** Create API endpoint (Method 3)

**The key:** Set `Player.userId` = `User.id` to link them together! ✅
