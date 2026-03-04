# Tournament Management System - Complete Design

## 📋 Overview
This document outlines the complete design for the tournament management system with multi-level approvals, partner matching, and comprehensive registration flow.

---

## 🗄️ Database Schema Design

### 1. OrganizerProfile
Stores tournament organizer-specific data and approval status.

```prisma
model OrganizerProfile {
  id            String        @id @default(cuid())
  userId        String        @unique
  isApproved    Boolean       @default(false)
  approvedById  String?       // Super Admin who approved
  approvedAt    DateTime?
  rejectedAt    DateTime?
  rejectionReason String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  approvedBy    User?         @relation("ApprovedOrganizers", fields: [approvedById], references: [id])
  rankCategories RankCategory[]
  tournaments   Tournament[]
  
  @@index([userId])
  @@index([isApproved])
}
```

### 2. RankCategory
Organizer-defined rank categories with point ranges.

```prisma
model RankCategory {
  id            String        @id @default(cuid())
  organizerId   String        // Organizer who created this category
  name          String        // e.g., "Beginner", "Intermediate", "Advanced"
  minPoints     Int           // Minimum points for this category
  maxPoints     Int           // Maximum points for this category
  description   String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  organizer     OrganizerProfile @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  tournaments   Tournament[]
  
  @@unique([organizerId, name]) // Each organizer can have unique category names
  @@index([organizerId])
  @@index([minPoints, maxPoints])
}
```

### 3. Tournament (Redesigned)
Complete tournament model with approval workflow.

```prisma
model Tournament {
  id                    String                @id @default(cuid())
  name                  String
  organizerId           String                // Tournament Organizer
  locationId            String?               // Selected location (requires club approval)
  
  // Tournament Details
  tournamentSystem      String                // "groups", "league", "knockout"
  tournamentLevel       String                // Linked to RankCategory name
  rankCategoryId       String?               // Reference to RankCategory
  
  // Dates
  registrationStartDate DateTime
  registrationDeadline  DateTime
  startDate             DateTime
  endDate               DateTime?
  
  // Pricing & Prizes
  registrationPrice     Int
  prizes                String               // JSON or text description
  maxTeams              Int?                 // ADMIN/ORGANIZER ONLY - hidden from public
  
  // Terms & Conditions
  termsAndConditions    String                // Mandatory acceptance
  
  // Status Lifecycle
  status                String                @default("DRAFT")
  // DRAFT | WAITING_FOR_CLUB_APPROVAL | WAITING_FOR_ADMIN_APPROVAL | 
  // REGISTRATION_OPEN | REGISTRATION_CLOSED | ONGOING | FINISHED
  
  // Approval Tracking
  clubApprovedById      String?              // Club Owner who approved
  clubApprovedAt        DateTime?
  clubRejectedAt        DateTime?
  clubRejectionReason   String?
  
  adminApprovedById     String?              // Super Admin who approved
  adminApprovedAt       DateTime?
  adminRejectedAt       DateTime?
  adminRejectionReason  String?
  
  // Metadata
  description           String?
  internalNotes         String?               // ORGANIZER/ADMIN ONLY
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  organizer             OrganizerProfile      @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  location              Location?             @relation(fields: [locationId], references: [id], onDelete: SetNull)
  rankCategory          RankCategory?         @relation(fields: [rankCategoryId], references: [id], onDelete: SetNull)
  clubApprovedBy        User?                @relation("ClubApprovedTournaments", fields: [clubApprovedById], references: [id])
  adminApprovedBy       User?                @relation("AdminApprovedTournaments", fields: [adminApprovedById], references: [id])
  registrations         TournamentRegistration[]
  teams                 Team[]
  matches               Match[]
  partnerRequests       PartnerRequest[]
  
  @@index([organizerId])
  @@index([locationId])
  @@index([status])
  @@index([rankCategoryId])
  @@index([registrationStartDate, registrationDeadline])
}
```

### 4. TournamentRegistration
Player registration with eligibility checks and payment tracking.

```prisma
model TournamentRegistration {
  id                    String                @id @default(cuid())
  tournamentId          String
  playerId              String                // User ID of registering player
  partnerId             String?               // Partner's User ID (if has partner)
  teamId                String?               // Final team ID (after partner confirmation)
  
  // Eligibility
  playerPoints          Int                   // Points at time of registration
  playerCategory        String?               // Category at time of registration
  isEligible            Boolean                @default(false)
  eligibilityCheckedAt  DateTime?
  
  // Registration Status
  status                String                @default("PENDING")
  // PENDING | APPROVED | REJECTED
  
  // Partner Status
  needsPartner          Boolean               @default(false)
  partnerRequestId      String?               // If player needs a partner
  
  // Payment
  paymentId             String?               @unique
  paymentMethod         String?               // "instapay", "cash", "payment_link"
  paymentProof          String?               // URL or reference
  paymentApprovedAt     DateTime?
  
  // Approval Tracking
  approvedById          String?               // Organizer who approved
  approvedAt            DateTime?
  rejectedById          String?
  rejectedAt            DateTime?
  rejectionReason       String?
  
  // Terms Acceptance
  termsAccepted         Boolean               @default(false)
  termsAcceptedAt       DateTime?
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  tournament            Tournament            @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  player                User                  @relation("PlayerRegistrations", fields: [playerId], references: [id], onDelete: Cascade)
  partner               User?                @relation("PartnerRegistrations", fields: [partnerId], references: [id], onDelete: SetNull)
  team                  Team?                 @relation(fields: [teamId], references: [id], onDelete: SetNull)
  partnerRequest        PartnerRequest?       @relation(fields: [partnerRequestId], references: [id], onDelete: SetNull)
  payment               Payment?              @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  approvedBy            User?                 @relation("ApprovedRegistrations", fields: [approvedById], references: [id])
  rejectedBy            User?                 @relation("RejectedRegistrations", fields: [rejectedById], references: [id])
  
  @@unique([tournamentId, playerId]) // Prevent duplicate registrations
  @@unique([tournamentId, partnerId]) // Prevent partner from registering twice
  @@index([tournamentId])
  @@index([playerId])
  @@index([status])
  @@index([teamId])
}
```

### 5. PartnerRequest
Partner matching system for players without partners.

```prisma
model PartnerRequest {
  id                    String                @id @default(cuid())
  tournamentId         String
  requesterId          String                // Player requesting a partner
  requestedPartnerId   String?               // Specific partner requested (optional)
  
  // Status
  status                String                @default("PENDING")
  // PENDING | ACCEPTED | REJECTED | CANCELLED
  
  // Auto-matching
  isAutoMatch           Boolean               @default(false) // If system matched eligible players
  
  // Confirmation
  acceptedAt            DateTime?
  rejectedAt            DateTime?
  cancelledAt           DateTime?
  
  // Organizer Mediation
  organizerMediated     Boolean               @default(false)
  organizerId           String?
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  tournament            Tournament            @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  requester             User                  @relation("PartnerRequests", fields: [requesterId], references: [id], onDelete: Cascade)
  requestedPartner      User?                 @relation("ReceivedPartnerRequests", fields: [requestedPartnerId], references: [id], onDelete: SetNull)
  organizer             User?                 @relation("MediatedPartnerRequests", fields: [organizerId], references: [id])
  registration          TournamentRegistration?
  
  @@index([tournamentId])
  @@index([requesterId])
  @@index([status])
  @@unique([tournamentId, requesterId]) // One active request per tournament
}
```

### 6. Team (Updated)
Enhanced team model for tournament teams.

```prisma
model Team {
  id              String     @id @default(cuid())
  tournamentId    String
  player1Id       String     // User ID of player 1
  player2Id       String     // User ID of player 2
  
  // Team Stats
  totalPoints     Int        @default(0)
  seed            Int?
  qualified       Boolean    @default(false)
  
  // Registration Link
  registrationId  String?    @unique // Link to TournamentRegistration
  
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  // Relations
  tournament      Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  player1         User       @relation("TeamPlayer1", fields: [player1Id], references: [id], onDelete: Cascade)
  player2         User       @relation("TeamPlayer2", fields: [player2Id], references: [id], onDelete: Cascade)
  registration    TournamentRegistration? @relation(fields: [registrationId], references: [id], onDelete: SetNull)
  matchesAsTeam1  Match[]    @relation("Team1Matches")
  matchesAsTeam2  Match[]    @relation("Team2Matches")
  matchesAsWinner Match[]    @relation("MatchWinner")
  
  @@unique([tournamentId, player1Id, player2Id]) // Prevent duplicate teams
  @@index([tournamentId])
  @@index([player1Id])
  @@index([player2Id])
}
```

### 7. Match (Updated)
Enhanced match model with court and date/time.

```prisma
model Match {
  id           String     @id @default(cuid())
  tournamentId String
  team1Id      String?
  team2Id      String?
  winnerId     String?
  
  // Match Details
  round        String     // "groups", "quarterfinals", "semifinals", "final"
  courtId      String?    // Assigned court
  date         DateTime?  // Match date
  startTime    String?    // Match start time
  endTime      String?   // Match end time
  
  // Status
  status       String     @default("scheduled")
  // scheduled | in_progress | completed | cancelled
  
  score        String?
  notes        String?
  
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  // Relations
  team1        Team?      @relation("Team1Matches", fields: [team1Id], references: [id])
  team2        Team?      @relation("Team2Matches", fields: [team2Id], references: [id])
  tournament   Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  winner       Team?      @relation("MatchWinner", fields: [winnerId], references: [id])
  court        Court?     @relation(fields: [courtId], references: [id], onDelete: SetNull)
  
  @@index([tournamentId])
  @@index([round])
  @@index([team1Id])
  @@index([team2Id])
  @@index([courtId])
  @@index([date])
}
```

### 8. Payment (Updated)
Enhanced payment model for tournament registrations.

```prisma
model Payment {
  id              String           @id @default(cuid())
  bookingId       String?          @unique
  sessionId       String?          @unique
  registrationId  String?          @unique // Tournament registration
  
  amount          Int
  status          String           // pending | approved | rejected
  method          String           // instapay | cash | payment_link | stripe
  stripeId        String?
  paymentProof    String?          // URL or reference for manual payments
  paymentReference String?         // Reference number for InstaPay, etc.
  
  // Approval
  approvedById    String?
  approvedAt      DateTime?
  rejectedById    String?
  rejectedAt      DateTime?
  rejectionReason String?
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations
  booking         Booking?         @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  coachingSession CoachingSession? @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  registration    TournamentRegistration? @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  approvedBy      User?            @relation("ApprovedPayments", fields: [approvedById], references: [id])
  rejectedBy      User?            @relation("RejectedPayments", fields: [rejectedById], references: [id])
  
  @@index([status])
  @@index([method])
  @@index([registrationId])
}
```

### 9. User Model Updates
Add new relations to User model.

```prisma
model User {
  // ... existing fields ...
  
  // Tournament Relations
  organizerProfile        OrganizerProfile?
  playerRegistrations     TournamentRegistration[] @relation("PlayerRegistrations")
  partnerRegistrations    TournamentRegistration[] @relation("PartnerRegistrations")
  partnerRequests         PartnerRequest[]         @relation("PartnerRequests")
  receivedPartnerRequests PartnerRequest[]         @relation("ReceivedPartnerRequests")
  mediatedPartnerRequests PartnerRequest[]         @relation("MediatedPartnerRequests")
  approvedOrganizers      OrganizerProfile[]       @relation("ApprovedOrganizers")
  clubApprovedTournaments Tournament[]             @relation("ClubApprovedTournaments")
  adminApprovedTournaments Tournament[]            @relation("AdminApprovedTournaments")
  approvedRegistrations   TournamentRegistration[] @relation("ApprovedRegistrations")
  rejectedRegistrations   TournamentRegistration[] @relation("RejectedRegistrations")
  approvedPayments         Payment[]                @relation("ApprovedPayments")
  rejectedPayments        Payment[]                @relation("RejectedPayments")
  teamPlayer1             Team[]                   @relation("TeamPlayer1")
  teamPlayer2             Team[]                   @relation("TeamPlayer2")
}
```

### 10. Location Model Updates
Add tournament relation.

```prisma
model Location {
  // ... existing fields ...
  tournaments             Tournament[]
}
```

### 11. Court Model Updates
Add match relation.

```prisma
model Court {
  // ... existing fields ...
  matches                 Match[]
}
```

---

## 🔌 API Endpoints Design

### Organizer Management

#### `POST /api/organizers/apply`
Apply to become a Tournament Organizer.

**Auth:** Authenticated user  
**Body:**
```json
{
  "userId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "organizerProfile": { ... }
}
```

#### `GET /api/organizers/pending`
Get pending organizer applications.

**Auth:** Super Admin only  
**Response:**
```json
{
  "organizers": [
    {
      "id": "string",
      "user": { "name", "email", "phone" },
      "createdAt": "datetime"
    }
  ]
}
```

#### `POST /api/organizers/:id/approve`
Approve organizer application.

**Auth:** Super Admin only  
**Response:**
```json
{
  "success": true,
  "organizerProfile": { ... }
}
```

#### `POST /api/organizers/:id/reject`
Reject organizer application.

**Auth:** Super Admin only  
**Body:**
```json
{
  "reason": "string"
}
```

### Rank Categories

#### `POST /api/rank-categories`
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

#### `GET /api/rank-categories`
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
      "maxPoints": 300
    }
  ]
}
```

#### `PATCH /api/rank-categories/:id`
Update rank category.

**Auth:** Approved Tournament Organizer (own categories only)

#### `DELETE /api/rank-categories/:id`
Delete rank category.

**Auth:** Approved Tournament Organizer (own categories only)

### Tournament Management

#### `POST /api/tournaments`
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
  "registrationStartDate": "datetime",
  "registrationDeadline": "datetime",
  "startDate": "datetime",
  "endDate": "datetime",
  "registrationPrice": 500,
  "prizes": "First: 5000 EGP, Second: 3000 EGP",
  "maxTeams": 16,
  "termsAndConditions": "Full terms text...",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "string",
    "status": "DRAFT",
    ...
  }
}
```

#### `GET /api/tournaments`
List tournaments (filtered by role).

**Auth:** Optional  
**Query Params:**
- `status` - Filter by status
- `organizerId` - Filter by organizer
- `locationId` - Filter by location
- `public` - If true, only show REGISTRATION_OPEN and above

**Response:**
```json
{
  "tournaments": [
    {
      "id": "string",
      "name": "string",
      "status": "REGISTRATION_OPEN",
      "location": { "name", "address" },
      "startDate": "datetime",
      "tournamentLevel": "string",
      "registrationPrice": 500
      // maxTeams hidden for public
    }
  ]
}
```

#### `GET /api/tournaments/:id`
Get tournament details.

**Auth:** Optional (different data based on role)  
**Response (Public):**
```json
{
  "id": "string",
  "name": "string",
  "tournamentSystem": "knockout",
  "registrationPrice": 500,
  "prizes": "string",
  "registrationStartDate": "datetime",
  "registrationDeadline": "datetime",
  "tournamentLevel": "string",
  "termsAndConditions": "string",
  "location": { "name", "address" },
  "status": "REGISTRATION_OPEN"
  // maxTeams, registeredTeamsCount, internalNotes hidden
}
```

**Response (Organizer/Admin):**
```json
{
  // ... all fields including:
  "maxTeams": 16,
  "registeredTeamsCount": 8,
  "internalNotes": "string"
}
```

#### `PATCH /api/tournaments/:id`
Update tournament (only if DRAFT or rejected).

**Auth:** Tournament Organizer (own tournaments only)

#### `POST /api/tournaments/:id/request-club-approval`
Request club approval (moves to WAITING_FOR_CLUB_APPROVAL).

**Auth:** Tournament Organizer (own tournaments only)  
**Body:**
```json
{
  "locationId": "string"
}
```

#### `POST /api/tournaments/:id/club-approve`
Approve tournament (Club Owner).

**Auth:** Club Owner (for their location)  
**Response:**
```json
{
  "success": true,
  "tournament": {
    "status": "WAITING_FOR_ADMIN_APPROVAL",
    ...
  }
}
```

#### `POST /api/tournaments/:id/club-reject`
Reject tournament (Club Owner).

**Auth:** Club Owner (for their location)  
**Body:**
```json
{
  "reason": "string"
}
```

#### `POST /api/tournaments/:id/admin-approve`
Approve tournament (Super Admin) - Sets status to REGISTRATION_OPEN.

**Auth:** Super Admin only

#### `POST /api/tournaments/:id/admin-reject`
Reject tournament (Super Admin).

**Auth:** Super Admin only  
**Body:**
```json
{
  "reason": "string"
}
```

### Tournament Registration

#### `POST /api/tournaments/:id/register`
Register for tournament.

**Auth:** Authenticated user  
**Body:**
```json
{
  "partnerPhone": "string (optional)",
  "partnerName": "string (optional)",
  "needsPartner": false,
  "paymentMethod": "instapay",
  "paymentProof": "string (optional)",
  "paymentReference": "string (optional)",
  "termsAccepted": true
}
```

**Response:**
```json
{
  "success": true,
  "registration": {
    "id": "string",
    "status": "PENDING",
    "isEligible": true,
    "message": "Registration submitted. Awaiting approval."
  }
}
```

**Errors:**
- `NOT_ELIGIBLE` - Player points don't match tournament level
- `NO_POINTS` - Player has no points (requires organizer assignment)
- `ALREADY_REGISTERED` - Player already registered
- `REGISTRATION_CLOSED` - Past registration deadline
- `TERMS_NOT_ACCEPTED` - Terms must be accepted

#### `GET /api/tournaments/:id/eligibility`
Check if current user is eligible.

**Auth:** Authenticated user  
**Response:**
```json
{
  "isEligible": true,
  "playerPoints": 450,
  "playerCategory": "Intermediate",
  "tournamentLevel": "Intermediate",
  "message": "You are eligible to register"
}
```

#### `GET /api/tournaments/:id/registrations`
Get tournament registrations.

**Auth:** Tournament Organizer (own tournaments) or Super Admin  
**Response:**
```json
{
  "registrations": [
    {
      "id": "string",
      "player": { "name", "email", "phone" },
      "partner": { "name", "email", "phone" } | null,
      "status": "PENDING",
      "paymentStatus": "pending",
      "createdAt": "datetime"
    }
  ]
}
```

#### `POST /api/registrations/:id/approve`
Approve registration.

**Auth:** Tournament Organizer (own tournaments) or Super Admin  
**Response:**
```json
{
  "success": true,
  "registration": { ... }
}
```

#### `POST /api/registrations/:id/reject`
Reject registration.

**Auth:** Tournament Organizer (own tournaments) or Super Admin  
**Body:**
```json
{
  "reason": "string"
}
```

### Partner System

#### `GET /api/tournaments/:id/partner-pool`
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
      "category": "Intermediate"
    }
  ]
}
```

#### `POST /api/partner-requests`
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

**Response:**
```json
{
  "success": true,
  "partnerRequest": {
    "id": "string",
    "status": "PENDING"
  }
}
```

#### `POST /api/partner-requests/:id/accept`
Accept partner request.

**Auth:** Requested partner  
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

#### `POST /api/partner-requests/:id/reject`
Reject partner request.

**Auth:** Requested partner

#### `POST /api/partner-requests/:id/cancel`
Cancel partner request.

**Auth:** Requester

### Payment Management

#### `POST /api/payments/registration/:registrationId`
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

#### `POST /api/payments/:id/approve`
Approve payment.

**Auth:** Tournament Organizer or Super Admin

#### `POST /api/payments/:id/reject`
Reject payment.

**Auth:** Tournament Organizer or Super Admin  
**Body:**
```json
{
  "reason": "string"
}
```

### Draw & Match Management

#### `POST /api/tournaments/:id/publish-draw`
Publish tournament draw.

**Auth:** Tournament Organizer (own tournaments)  
**Body:**
```json
{
  "matches": [
    {
      "team1Id": "string",
      "team2Id": "string",
      "round": "groups",
      "courtId": "string",
      "date": "datetime",
      "startTime": "string",
      "endTime": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "matchesCreated": 8,
  "notificationsSent": 16
}
```

#### `GET /api/tournaments/:id/matches`
Get tournament matches.

**Auth:** Optional  
**Response:**
```json
{
  "matches": [
    {
      "id": "string",
      "round": "groups",
      "team1": { "player1": { ... }, "player2": { ... } },
      "team2": { "player1": { ... }, "player2": { ... } },
      "court": { "name" },
      "date": "datetime",
      "startTime": "string",
      "status": "scheduled",
      "score": "string"
    }
  ]
}
```

#### `PATCH /api/matches/:id`
Update match (score, status, etc.).

**Auth:** Tournament Organizer (own tournaments) or Super Admin

---

## 🎨 Frontend Page Structure

### 1. Organizer Application Page
`/organizer/apply`

- Form to apply as Tournament Organizer
- Shows approval status if already applied
- Redirects to organizer dashboard if approved

### 2. Organizer Dashboard
`/organizer/dashboard`

**Tabs:**
- **Overview:** Stats, pending approvals
- **Rank Categories:** Create/edit/delete categories
- **Tournaments:** List all tournaments (create, edit, view)
- **Registrations:** Manage registrations for tournaments
- **Partner Requests:** Mediate partner matching

### 3. Tournament Creation Page
`/organizer/tournaments/create`

**Steps:**
1. Basic Info (name, system, level, dates)
2. Location Selection (triggers club approval request)
3. Pricing & Prizes
4. Terms & Conditions
5. Review & Submit

### 4. Tournament List Page (Public)
`/tournaments`

- Shows only REGISTRATION_OPEN and above
- Filter by location, level, date
- CTA: "View Details" / "Register"

### 5. Tournament Details Page (Public)
`/tournaments/:id`

**Public View:**
- Tournament info
- System, price, prizes
- Registration window
- Terms & Conditions (checkbox)
- "Register" button (if eligible and open)

**Organizer/Admin View:**
- All above +
- Max teams
- Registered teams count
- Internal notes
- Manage registrations
- Publish draw

### 6. Tournament Registration Page
`/tournaments/:id/register`

**Steps:**
1. Eligibility Check
2. Partner Selection (has partner / needs partner)
3. Terms Acceptance
4. Payment
5. Confirmation

### 7. Partner Pool Page
`/tournaments/:id/partner-pool`

- List of eligible players looking for partners
- Request to team up
- Accept/reject requests

### 8. Super Admin Tournament Management
`/admin/tournaments`

- List all tournaments
- Approve/reject tournaments
- View organizer profiles
- Approve/reject organizer applications

### 9. Club Owner Tournament Approvals
`/admin/club-owner/tournaments`

- List tournaments for their locations
- Approve/reject club approval requests

---

## 🔐 Business Logic & Edge Cases

### Eligibility Check Logic

```typescript
function checkEligibility(player: Player, tournament: Tournament): {
  isEligible: boolean;
  reason?: string;
} {
  // 1. Check if player has points
  if (!player.points && player.points !== 0) {
    return {
      isEligible: false,
      reason: "NO_POINTS"
    };
  }
  
  // 2. Get tournament's rank category
  const rankCategory = tournament.rankCategory;
  if (!rankCategory) {
    return {
      isEligible: false,
      reason: "INVALID_TOURNAMENT"
    };
  }
  
  // 3. Check if player's points fall within category range
  if (player.points < rankCategory.minPoints || 
      player.points > rankCategory.maxPoints) {
    return {
      isEligible: false,
      reason: "POINTS_MISMATCH",
      message: `Your points (${player.points}) do not match tournament level (${rankCategory.minPoints}-${rankCategory.maxPoints})`
    };
  }
  
  // 4. Check if player already registered
  const existingRegistration = await prisma.tournamentRegistration.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId: tournament.id,
        playerId: player.userId
      }
    }
  });
  
  if (existingRegistration) {
    return {
      isEligible: false,
      reason: "ALREADY_REGISTERED"
    };
  }
  
  return { isEligible: true };
}
```

### Partner Validation Logic

```typescript
async function validatePartner(
  tournamentId: string,
  playerId: string,
  partnerId: string
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Check partner exists
  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    include: { player: true }
  });
  
  if (!partner || !partner.player) {
    return { valid: false, reason: "PARTNER_NOT_FOUND" };
  }
  
  // 2. Check partner eligibility
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { rankCategory: true }
  });
  
  const eligibility = checkEligibility(partner.player, tournament);
  if (!eligibility.isEligible) {
    return { valid: false, reason: "PARTNER_NOT_ELIGIBLE" };
  }
  
  // 3. Check partner not already registered
  const partnerRegistration = await prisma.tournamentRegistration.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId: partnerId
      }
    }
  });
  
  if (partnerRegistration) {
    return { valid: false, reason: "PARTNER_ALREADY_REGISTERED" };
  }
  
  // 4. Check partner not already in a team
  const existingTeam = await prisma.team.findFirst({
    where: {
      tournamentId,
      OR: [
        { player1Id: partnerId },
        { player2Id: partnerId }
      ]
    }
  });
  
  if (existingTeam) {
    return { valid: false, reason: "PARTNER_ALREADY_IN_TEAM" };
  }
  
  return { valid: true };
}
```

### Status Transition Rules

```typescript
const STATUS_TRANSITIONS = {
  DRAFT: ["WAITING_FOR_CLUB_APPROVAL"],
  WAITING_FOR_CLUB_APPROVAL: ["WAITING_FOR_ADMIN_APPROVAL", "DRAFT"],
  WAITING_FOR_ADMIN_APPROVAL: ["REGISTRATION_OPEN", "DRAFT"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED"],
  REGISTRATION_CLOSED: ["ONGOING"],
  ONGOING: ["FINISHED"],
  FINISHED: [] // Terminal state
};

function canTransition(currentStatus: string, newStatus: string): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
}
```

### Duplicate Prevention

1. **Tournament Registration:**
   - Unique constraint: `@@unique([tournamentId, playerId])`
   - Check before creating registration

2. **Teams:**
   - Unique constraint: `@@unique([tournamentId, player1Id, player2Id])`
   - Normalize team order (always player1Id < player2Id)

3. **Partner Requests:**
   - Unique constraint: `@@unique([tournamentId, requesterId])`
   - One active request per tournament

---

## 📱 Notification System

### Notification Types

```typescript
enum NotificationType {
  ORGANIZER_APPROVED = "organizer_approved",
  ORGANIZER_REJECTED = "organizer_rejected",
  TOURNAMENT_CLUB_APPROVED = "tournament_club_approved",
  TOURNAMENT_CLUB_REJECTED = "tournament_club_rejected",
  TOURNAMENT_ADMIN_APPROVED = "tournament_admin_approved",
  TOURNAMENT_ADMIN_REJECTED = "tournament_admin_rejected",
  REGISTRATION_APPROVED = "registration_approved",
  REGISTRATION_REJECTED = "registration_rejected",
  PARTNER_REQUEST = "partner_request",
  PARTNER_ACCEPTED = "partner_accepted",
  PARTNER_REJECTED = "partner_rejected",
  DRAW_PUBLISHED = "draw_published",
  MATCH_ASSIGNED = "match_assigned",
  PAYMENT_APPROVED = "payment_approved",
  PAYMENT_REJECTED = "payment_rejected"
}
```

### Notification Triggers

1. **Organizer Approval:** Send to organizer user
2. **Tournament Club Approval:** Send to organizer
3. **Tournament Admin Approval:** Send to organizer, set status to REGISTRATION_OPEN
4. **Registration Approved:** Send to player
5. **Partner Request:** Send to requested partner
6. **Partner Accepted:** Send to requester, create team
7. **Draw Published:** Send to all registered players
8. **Match Assigned:** Send to both teams

---

## 🔒 Security & Access Control

### Role-Based Permissions

```typescript
// Tournament Organizer
- Create tournaments (DRAFT only)
- Edit own tournaments (DRAFT or rejected only)
- Create/edit/delete own rank categories
- View own tournament registrations
- Approve/reject registrations for own tournaments
- Publish draw for own tournaments
- Mediate partner requests for own tournaments

// Super Admin
- Approve/reject organizer applications
- Approve/reject all tournaments
- View all tournaments
- Manage all registrations
- Assign points/category to players (first time)

// Club Owner
- Approve/reject tournaments for own locations
- View tournaments for own locations

// Regular User
- View public tournaments
- Register for tournaments
- Request partners
- Accept/reject partner requests
```

---

## ✅ Implementation Checklist

### Phase 1: Database Schema
- [ ] Update Prisma schema with all new models
- [ ] Run migration
- [ ] Update User, Location, Court models with new relations

### Phase 2: Organizer System
- [ ] Organizer application API
- [ ] Organizer approval/rejection API
- [ ] Organizer dashboard UI
- [ ] Rank category management APIs and UI

### Phase 3: Tournament Creation
- [ ] Tournament creation API
- [ ] Club approval API
- [ ] Admin approval API
- [ ] Tournament creation UI
- [ ] Approval workflow UI

### Phase 4: Registration System
- [ ] Eligibility check API
- [ ] Registration API
- [ ] Partner system APIs
- [ ] Registration UI
- [ ] Partner pool UI

### Phase 5: Payment Integration
- [ ] Payment creation API
- [ ] Payment approval API
- [ ] Payment UI

### Phase 6: Public Pages
- [ ] Tournament listing page
- [ ] Tournament details page
- [ ] Registration flow UI

### Phase 7: Draw & Matches
- [ ] Draw publishing API
- [ ] Match management APIs
- [ ] Match assignment UI
- [ ] Match results UI

### Phase 8: Notifications
- [ ] Notification creation for all events
- [ ] WhatsApp integration (optional)
- [ ] In-app notification UI

---

## 🚨 Critical Edge Cases

1. **Player has no points:**
   - Organizer assigns points + category
   - Requires Super Admin approval (first time only)
   - Then player can register

2. **Partner already registered:**
   - Prevent duplicate registrations
   - Show clear error message

3. **Tournament reaches max teams:**
   - Auto-close registration
   - Set status to REGISTRATION_CLOSED

4. **Club rejects tournament:**
   - Status returns to DRAFT
   - Organizer can edit and resubmit

5. **Admin rejects tournament:**
   - Status returns to DRAFT
   - Organizer can edit and resubmit

6. **Payment rejection:**
   - Registration status remains PENDING
   - Player can resubmit payment

7. **Partner request timeout:**
   - Auto-cancel after X days
   - Player can request new partner

---

This design provides a complete, scalable tournament management system with proper approval workflows, partner matching, and comprehensive registration handling.
