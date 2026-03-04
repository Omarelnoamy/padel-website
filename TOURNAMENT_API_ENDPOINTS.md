# Tournament System - API Endpoints Structure

## 📍 Base Paths

- Organizer APIs: `/api/organizers/*`
- Rank Categories: `/api/rank-categories/*`
- Tournaments: `/api/tournaments/*`
- Registrations: `/api/registrations/*`
- Partner Requests: `/api/partner-requests/*`
- Payments: `/api/payments/*`
- Matches: `/api/matches/*`

---

## 🔐 Organizer Management

### `POST /api/organizers/apply`
Apply to become a Tournament Organizer.

**Auth:** Authenticated user  
**Body:** None (uses session user)

**Response:**
```json
{
  "success": true,
  "organizerProfile": {
    "id": "string",
    "userId": "string",
    "isApproved": false,
    "createdAt": "datetime"
  }
}
```

**Errors:**
- `ALREADY_APPLIED` - User already has an organizer profile
- `ALREADY_APPROVED` - User is already an approved organizer

---

### `GET /api/organizers/pending`
Get pending organizer applications.

**Auth:** Super Admin only

**Response:**
```json
{
  "organizers": [
    {
      "id": "string",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "phone": "string"
      },
      "createdAt": "datetime"
    }
  ]
}
```

---

### `POST /api/organizers/:id/approve`
Approve organizer application.

**Auth:** Super Admin only

**Response:**
```json
{
  "success": true,
  "organizerProfile": {
    "id": "string",
    "isApproved": true,
    "approvedAt": "datetime",
    "approvedBy": { "id", "name" }
  }
}
```

**Side Effects:**
- Creates notification to organizer
- Sets `isApproved = true`

---

### `POST /api/organizers/:id/reject`
Reject organizer application.

**Auth:** Super Admin only

**Body:**
```json
{
  "reason": "string"
}
```

**Response:**
```json
{
  "success": true,
  "organizerProfile": {
    "id": "string",
    "isApproved": false,
    "rejectedAt": "datetime",
    "rejectionReason": "string"
  }
}
```

---

### `GET /api/organizers/me`
Get current user's organizer profile.

**Auth:** Authenticated user

**Response:**
```json
{
  "organizerProfile": {
    "id": "string",
    "isApproved": true,
    "approvedAt": "datetime",
    "tournamentsCount": 5,
    "rankCategoriesCount": 3
  } | null
}
```

---

## 🏆 Rank Categories

### `POST /api/rank-categories`
Create a rank category.

**Auth:** Approved Tournament Organizer

**Body:**
```json
{
  "name": "Beginner",
  "minPoints": 0,
  "maxPoints": 300,
  "description": "Optional description"
}
```

**Validation:**
- `name` required, unique per organizer
- `minPoints >= 0`
- `maxPoints > minPoints`
- No overlap with existing categories (enforced in application logic)

**Response:**
```json
{
  "success": true,
  "rankCategory": {
    "id": "string",
    "name": "Beginner",
    "minPoints": 0,
    "maxPoints": 300,
    "organizerId": "string"
  }
}
```

---

### `GET /api/rank-categories`
Get rank categories for current organizer.

**Auth:** Approved Tournament Organizer

**Response:**
```json
{
  "categories": [
    {
      "id": "string",
      "name": "Beginner",
      "minPoints": 0,
      "maxPoints": 300,
      "description": "string",
      "tournamentsCount": 2
    }
  ]
}
```

---

### `PATCH /api/rank-categories/:id`
Update rank category.

**Auth:** Approved Tournament Organizer (own categories only)

**Body:**
```json
{
  "name": "Beginner",
  "minPoints": 0,
  "maxPoints": 350,
  "description": "Updated description"
}
```

**Validation:**
- Cannot update if used in active tournaments (REGISTRATION_OPEN or above)

---

### `DELETE /api/rank-categories/:id`
Delete rank category.

**Auth:** Approved Tournament Organizer (own categories only)

**Validation:**
- Cannot delete if used in any tournaments

**Response:**
```json
{
  "success": true
}
```

---

## 🎾 Tournament Management

### `POST /api/tournaments`
Create tournament (DRAFT status).

**Auth:** Approved Tournament Organizer

**Body:**
```json
{
  "name": "Summer Championship",
  "tournamentSystem": "knockout",
  "tournamentLevel": "Intermediate",
  "rankCategoryId": "string",
  "locationId": "string",
  "registrationStartDate": "2024-06-01T00:00:00Z",
  "registrationDeadline": "2024-06-15T23:59:59Z",
  "startDate": "2024-06-20T00:00:00Z",
  "endDate": "2024-06-25T23:59:59Z",
  "registrationPrice": 500,
  "prizes": "First: 5000 EGP, Second: 3000 EGP",
  "maxTeams": 16,
  "termsAndConditions": "Full terms text...",
  "description": "Optional description"
}
```

**Validation:**
- `name` required
- `tournamentSystem` must be one of: "groups", "league", "knockout"
- `rankCategoryId` must belong to organizer
- `registrationDeadline` must be before `startDate`
- `maxTeams` must be > 0

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "string",
    "name": "Summer Championship",
    "status": "DRAFT",
    "organizerId": "string",
    ...
  }
}
```

---

### `GET /api/tournaments`
List tournaments (filtered by role).

**Auth:** Optional

**Query Params:**
- `status` - Filter by status (comma-separated)
- `organizerId` - Filter by organizer
- `locationId` - Filter by location
- `public` - If true, only show REGISTRATION_OPEN and above
- `limit` - Pagination limit
- `offset` - Pagination offset

**Response (Public):**
```json
{
  "tournaments": [
    {
      "id": "string",
      "name": "Summer Championship",
      "status": "REGISTRATION_OPEN",
      "location": {
        "id": "string",
        "name": "Padel Up",
        "address": "Alnouras Resort"
      },
      "startDate": "2024-06-20T00:00:00Z",
      "tournamentLevel": "Intermediate",
      "registrationPrice": 500,
      "registrationStartDate": "2024-06-01T00:00:00Z",
      "registrationDeadline": "2024-06-15T23:59:59Z"
      // maxTeams hidden
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

**Response (Organizer/Admin):**
```json
{
  "tournaments": [
    {
      // ... all fields including:
      "maxTeams": 16,
      "registeredTeamsCount": 8,
      "internalNotes": "string"
    }
  ]
}
```

---

### `GET /api/tournaments/:id`
Get tournament details.

**Auth:** Optional (different data based on role)

**Response (Public):**
```json
{
  "id": "string",
  "name": "Summer Championship",
  "tournamentSystem": "knockout",
  "registrationPrice": 500,
  "prizes": "First: 5000 EGP",
  "registrationStartDate": "2024-06-01T00:00:00Z",
  "registrationDeadline": "2024-06-15T23:59:59Z",
  "startDate": "2024-06-20T00:00:00Z",
  "tournamentLevel": "Intermediate",
  "termsAndConditions": "Full terms...",
  "location": {
    "name": "Padel Up",
    "address": "Alnouras Resort"
  },
  "status": "REGISTRATION_OPEN",
  "organizer": {
    "name": "string"
  }
  // maxTeams, registeredTeamsCount, internalNotes hidden
}
```

**Response (Organizer/Admin):**
```json
{
  // ... all fields including:
  "maxTeams": 16,
  "registeredTeamsCount": 8,
  "internalNotes": "string",
  "clubApprovedAt": "datetime",
  "adminApprovedAt": "datetime"
}
```

---

### `PATCH /api/tournaments/:id`
Update tournament (only if DRAFT or rejected).

**Auth:** Tournament Organizer (own tournaments only)

**Body:** Same as POST (all fields optional)

**Validation:**
- Cannot update if status is REGISTRATION_OPEN or above
- Cannot change `rankCategoryId` if used in registrations

---

### `POST /api/tournaments/:id/request-club-approval`
Request club approval (moves to WAITING_FOR_CLUB_APPROVAL).

**Auth:** Tournament Organizer (own tournaments only)

**Body:**
```json
{
  "locationId": "string"
}
```

**Validation:**
- Tournament must be in DRAFT status
- Location must exist and have a club owner

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "WAITING_FOR_CLUB_APPROVAL",
    "locationId": "string"
  }
}
```

**Side Effects:**
- Creates notification to club owner
- Sets `status = WAITING_FOR_CLUB_APPROVAL`

---

### `POST /api/tournaments/:id/club-approve`
Approve tournament (Club Owner).

**Auth:** Club Owner (for their location)

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "WAITING_FOR_ADMIN_APPROVAL",
    "clubApprovedAt": "datetime",
    "clubApprovedBy": { "id", "name" }
  }
}
```

**Side Effects:**
- Creates notification to organizer
- Sets `status = WAITING_FOR_ADMIN_APPROVAL`
- Sets `clubApprovedAt` and `clubApprovedById`

---

### `POST /api/tournaments/:id/club-reject`
Reject tournament (Club Owner).

**Auth:** Club Owner (for their location)

**Body:**
```json
{
  "reason": "string"
}
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "DRAFT",
    "clubRejectedAt": "datetime",
    "clubRejectionReason": "string"
  }
}
```

**Side Effects:**
- Creates notification to organizer
- Sets `status = DRAFT` (allows editing and resubmission)

---

### `POST /api/tournaments/:id/admin-approve`
Approve tournament (Super Admin) - Sets status to REGISTRATION_OPEN.

**Auth:** Super Admin only

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "REGISTRATION_OPEN",
    "adminApprovedAt": "datetime",
    "adminApprovedBy": { "id", "name" }
  }
}
```

**Side Effects:**
- Creates notification to organizer
- Sets `status = REGISTRATION_OPEN`
- Sets `adminApprovedAt` and `adminApprovedById`

---

### `POST /api/tournaments/:id/admin-reject`
Reject tournament (Super Admin).

**Auth:** Super Admin only

**Body:**
```json
{
  "reason": "string"
}
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "DRAFT",
    "adminRejectedAt": "datetime",
    "adminRejectionReason": "string"
  }
}
```

---

### `POST /api/tournaments/:id/close-registration`
Close registration (sets status to REGISTRATION_CLOSED).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "REGISTRATION_CLOSED"
  }
}
```

---

### `POST /api/tournaments/:id/start`
Start tournament (sets status to ONGOING).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "ONGOING"
  }
}
```

---

### `POST /api/tournaments/:id/finish`
Finish tournament (sets status to FINISHED).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "FINISHED"
  }
}
```

---

## 📝 Tournament Registration

### `GET /api/tournaments/:id/eligibility`
Check if current user is eligible.

**Auth:** Authenticated user

**Response:**
```json
{
  "isEligible": true,
  "playerPoints": 450,
  "playerCategory": "Intermediate",
  "tournamentLevel": "Intermediate",
  "rankCategory": {
    "minPoints": 301,
    "maxPoints": 700
  },
  "message": "You are eligible to register"
}
```

**Response (Not Eligible):**
```json
{
  "isEligible": false,
  "playerPoints": 150,
  "playerCategory": "Beginner",
  "tournamentLevel": "Intermediate",
  "rankCategory": {
    "minPoints": 301,
    "maxPoints": 700
  },
  "reason": "POINTS_MISMATCH",
  "message": "Your points (150) do not match tournament level (301-700)"
}
```

**Response (No Points):**
```json
{
  "isEligible": false,
  "playerPoints": null,
  "reason": "NO_POINTS",
  "message": "You don't have points yet. Please contact the organizer to assign points."
}
```

---

### `POST /api/tournaments/:id/register`
Register for tournament.

**Auth:** Authenticated user

**Body:**
```json
{
  "partnerPhone": "string (optional)",
  "partnerName": "string (optional)",
  "needsPartner": false,
  "paymentMethod": "instapay",
  "paymentProof": "string (optional - URL)",
  "paymentReference": "string (optional - reference number)",
  "termsAccepted": true
}
```

**Validation:**
- User must be eligible (check eligibility first)
- Terms must be accepted
- If `needsPartner = false`, either `partnerPhone` or `partnerName` required
- If `needsPartner = true`, partner will be matched later
- Payment method required
- Payment proof/reference required for non-cash methods

**Response:**
```json
{
  "success": true,
  "registration": {
    "id": "string",
    "status": "PENDING",
    "isEligible": true,
    "needsPartner": false,
    "teamId": "string (if partner confirmed)",
    "message": "Registration submitted. Awaiting approval."
  }
}
```

**Errors:**
- `NOT_ELIGIBLE` - Player points don't match tournament level
- `NO_POINTS` - Player has no points (requires organizer assignment)
- `ALREADY_REGISTERED` - Player already registered
- `REGISTRATION_CLOSED` - Past registration deadline or status not REGISTRATION_OPEN
- `TERMS_NOT_ACCEPTED` - Terms must be accepted
- `PARTNER_NOT_FOUND` - Partner phone/name not found
- `PARTNER_NOT_ELIGIBLE` - Partner not eligible for tournament
- `PARTNER_ALREADY_REGISTERED` - Partner already registered

---

### `GET /api/tournaments/:id/registrations`
Get tournament registrations.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Query Params:**
- `status` - Filter by registration status
- `limit`, `offset` - Pagination

**Response:**
```json
{
  "registrations": [
    {
      "id": "string",
      "player": {
        "id": "string",
        "name": "string",
        "email": "string",
        "phone": "string"
      },
      "partner": {
        "id": "string",
        "name": "string",
        "email": "string",
        "phone": "string"
      } | null,
      "status": "PENDING",
      "paymentStatus": "pending",
      "playerPoints": 450,
      "partnerPoints": 520,
      "needsPartner": false,
      "createdAt": "datetime"
    }
  ],
  "total": 10
}
```

---

### `POST /api/registrations/:id/approve`
Approve registration.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Response:**
```json
{
  "success": true,
  "registration": {
    "id": "string",
    "status": "APPROVED",
    "approvedAt": "datetime"
  }
}
```

**Side Effects:**
- Creates notification to player
- If partner confirmed, creates Team record
- Approves payment if payment exists

---

### `POST /api/registrations/:id/reject`
Reject registration.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Body:**
```json
{
  "reason": "string"
}
```

**Response:**
```json
{
  "success": true,
  "registration": {
    "id": "string",
    "status": "REJECTED",
    "rejectedAt": "datetime",
    "rejectionReason": "string"
  }
}
```

---

## 👥 Partner System

### `GET /api/tournaments/:id/partner-pool`
Get available players in partner pool.

**Auth:** Authenticated user

**Response:**
```json
{
  "players": [
    {
      "userId": "string",
      "name": "string",
      "phone": "string",
      "points": 450,
      "category": "Intermediate",
      "hasRequested": false // If current user already requested this player
    }
  ]
}
```

**Logic:**
- Returns players who:
  - Are eligible for tournament
  - Have `needsPartner = true` in their registration
  - Are not already in a team
  - Are not the current user

---

### `POST /api/partner-requests`
Request a partner.

**Auth:** Authenticated user

**Body:**
```json
{
  "tournamentId": "string",
  "requestedPartnerId": "string (optional)",
  "requestedPartnerPhone": "string (optional)"
}
```

**Validation:**
- User must have a registration with `needsPartner = true`
- If `requestedPartnerId` provided, validate partner exists and is eligible
- If `requestedPartnerPhone` provided, find partner by phone
- Cannot request if already have active request

**Response:**
```json
{
  "success": true,
  "partnerRequest": {
    "id": "string",
    "status": "PENDING",
    "requestedPartner": {
      "id": "string",
      "name": "string",
      "phone": "string"
    } | null
  }
}
```

**Side Effects:**
- Creates notification to requested partner (if specific partner)
- If no specific partner, adds to partner pool

---

### `POST /api/partner-requests/:id/accept`
Accept partner request.

**Auth:** Requested partner

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "string",
    "player1": {
      "id": "string",
      "name": "string"
    },
    "player2": {
      "id": "string",
      "name": "string"
    },
    "tournamentId": "string"
  }
}
```

**Side Effects:**
- Creates Team record
- Links both registrations to team
- Updates both registrations: `needsPartner = false`, `teamId = team.id`
- Creates notifications to both players
- Sets partner request status to ACCEPTED

---

### `POST /api/partner-requests/:id/reject`
Reject partner request.

**Auth:** Requested partner

**Response:**
```json
{
  "success": true,
  "partnerRequest": {
    "id": "string",
    "status": "REJECTED"
  }
}
```

**Side Effects:**
- Creates notification to requester

---

### `POST /api/partner-requests/:id/cancel`
Cancel partner request.

**Auth:** Requester

**Response:**
```json
{
  "success": true,
  "partnerRequest": {
    "id": "string",
    "status": "CANCELLED"
  }
}
```

---

### `POST /api/partner-requests/:id/organizer-mediate`
Organizer mediates partner matching (force match two players).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Body:**
```json
{
  "requesterId": "string",
  "partnerId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "string",
    "player1": { ... },
    "player2": { ... }
  }
}
```

---

## 💳 Payment Management

### `POST /api/payments/registration/:registrationId`
Create payment for registration.

**Auth:** Authenticated user (own registration)

**Body:**
```json
{
  "method": "instapay",
  "paymentProof": "string (URL)",
  "paymentReference": "string"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "amount": 500,
    "status": "pending",
    "method": "instapay"
  }
}
```

---

### `POST /api/payments/:id/approve`
Approve payment.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "status": "approved",
    "approvedAt": "datetime"
  }
}
```

**Side Effects:**
- Updates registration `paymentApprovedAt`
- Creates notification to player

---

### `POST /api/payments/:id/reject`
Reject payment.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Body:**
```json
{
  "reason": "string"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "string",
    "status": "rejected",
    "rejectedAt": "datetime",
    "rejectionReason": "string"
  }
}
```

---

## 🎯 Draw & Match Management

### `POST /api/tournaments/:id/publish-draw`
Publish tournament draw.

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Body:**
```json
{
  "matches": [
    {
      "team1Id": "string",
      "team2Id": "string",
      "round": "groups",
      "courtId": "string",
      "date": "2024-06-20T10:00:00Z",
      "startTime": "10:00",
      "endTime": "11:30"
    }
  ]
}
```

**Validation:**
- Tournament must be REGISTRATION_CLOSED or ONGOING
- All teams must be from approved registrations
- Court must exist and be available

**Response:**
```json
{
  "success": true,
  "matchesCreated": 8,
  "notificationsSent": 16
}
```

**Side Effects:**
- Creates Match records
- Sends notifications to all registered players
- Sends match details to teams in first round

---

### `GET /api/tournaments/:id/matches`
Get tournament matches.

**Auth:** Optional

**Query Params:**
- `round` - Filter by round
- `teamId` - Filter by team

**Response:**
```json
{
  "matches": [
    {
      "id": "string",
      "round": "groups",
      "team1": {
        "id": "string",
        "player1": {
          "id": "string",
          "name": "string"
        },
        "player2": {
          "id": "string",
          "name": "string"
        }
      },
      "team2": {
        "id": "string",
        "player1": { ... },
        "player2": { ... }
      },
      "court": {
        "id": "string",
        "name": "string",
        "location": {
          "name": "string",
          "address": "string"
        }
      },
      "date": "2024-06-20T10:00:00Z",
      "startTime": "10:00",
      "endTime": "11:30",
      "status": "scheduled",
      "score": "6-4, 6-2",
      "winner": {
        "id": "string",
        "player1": { ... },
        "player2": { ... }
      } | null
    }
  ]
}
```

---

### `PATCH /api/matches/:id`
Update match (score, status, etc.).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

**Body:**
```json
{
  "score": "6-4, 6-2",
  "status": "completed",
  "winnerId": "string",
  "notes": "string"
}
```

**Response:**
```json
{
  "success": true,
  "match": {
    "id": "string",
    "score": "6-4, 6-2",
    "status": "completed",
    "winner": { ... }
  }
}
```

**Side Effects:**
- If match completed, advances winner to next round (if applicable)
- Creates notifications to both teams

---

## 🔔 Notification Types

All notifications are created automatically by the system:

1. `organizer_approved` - When organizer application approved
2. `organizer_rejected` - When organizer application rejected
3. `tournament_club_approval_requested` - When tournament requests club approval
4. `tournament_club_approved` - When club approves tournament
5. `tournament_club_rejected` - When club rejects tournament
6. `tournament_admin_approved` - When admin approves tournament (status → REGISTRATION_OPEN)
7. `tournament_admin_rejected` - When admin rejects tournament
8. `registration_approved` - When registration approved
9. `registration_rejected` - When registration rejected
10. `partner_request` - When partner request received
11. `partner_accepted` - When partner request accepted
12. `partner_rejected` - When partner request rejected
13. `draw_published` - When tournament draw published
14. `match_assigned` - When match assigned (with court and time)
15. `payment_approved` - When payment approved
16. `payment_rejected` - When payment rejected

---

## 🚨 Error Codes

- `NOT_ELIGIBLE` - Player not eligible for tournament
- `NO_POINTS` - Player has no points
- `ALREADY_REGISTERED` - Player already registered
- `REGISTRATION_CLOSED` - Registration closed
- `TERMS_NOT_ACCEPTED` - Terms not accepted
- `PARTNER_NOT_FOUND` - Partner not found
- `PARTNER_NOT_ELIGIBLE` - Partner not eligible
- `PARTNER_ALREADY_REGISTERED` - Partner already registered
- `UNAUTHORIZED` - Not authorized for this action
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Validation failed
- `INVALID_STATUS` - Invalid status transition

---

This API structure provides complete tournament management with proper authorization, validation, and notification handling.
