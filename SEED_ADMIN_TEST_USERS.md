# Test admin users for UI testing

The seed creates one test user per admin type so you can open every admin page and test the UI.

## Run the seed

```bash
npx prisma db seed
```

**Password for all test users:** `password123`

---

## Test users (admin types)

| Role / Type            | Email                         | Where they land after login |
|------------------------|-------------------------------|-----------------------------|
| **Super Admin**        | `superadmin@test.com`         | `/admin/super-admin`        |
| **Club Owner A**       | `clubownera@test.com`         | `/admin/club-owner`         |
| **Club Owner B**       | `clubownerb@test.com`         | Pending approval            |
| **Owner Partner**      | `ownerpartner@test.com`       | `/admin` (read-only)       |
| **Moderator**          | `moderator@test.com`          | `/admin/club-owner` (Location A) |
| **Club Admin**         | `clubadmin@test.com`          | `/admin/club-admin` (Location A) |
| **Tournament Organizer** | `tournamentorganizer@test.com` | `/admin/tournament-organizer` |
| **Coach Admin**        | `coachadmin@test.com`         | `/admin` (coach_admin)     |
| **Timing Organizer**   | `timingorganizer@test.com`    | `/admin` (timing_organizer) |
| **Regular User**       | `user@test.com`               | No admin access             |

Moderator is assigned to **Location A**; Club Admin is linked to **Location A** via their approval notification. Tournament Organizer has an approved **OrganizerProfile** so the tournament organizer dashboard works.
