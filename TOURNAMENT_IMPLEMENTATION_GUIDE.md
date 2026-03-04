# Tournament System - Implementation Guide

## 📋 Overview

This guide provides step-by-step instructions for implementing the complete tournament management system.

---

## 🗄️ Phase 1: Database Schema

### Step 1.1: Verify Schema
The Prisma schema has been updated with all required models:
- ✅ `OrganizerProfile`
- ✅ `RankCategory`
- ✅ `Tournament` (redesigned)
- ✅ `TournamentRegistration`
- ✅ `PartnerRequest`
- ✅ `Team` (updated)
- ✅ `Match` (updated)
- ✅ `Payment` (updated)
- ✅ `User` (relations added)
- ✅ `Location` (relations added)
- ✅ `Court` (relations added)

### Step 1.2: Run Migration
```bash
npx prisma migrate dev --name tournament_system_complete
npx prisma generate
```

### Step 1.3: Verify Migration
- Check that all tables are created
- Verify indexes are created
- Test relations in Prisma Studio

---

## 🔌 Phase 2: Backend API Implementation

### Step 2.1: Organizer Management APIs

**Create:** `src/app/api/organizers/apply/route.ts`
- POST endpoint for organizer application
- Check if user already has profile
- Create `OrganizerProfile` with `isApproved = false`

**Create:** `src/app/api/organizers/pending/route.ts`
- GET endpoint for Super Admin
- Return pending organizer applications

**Create:** `src/app/api/organizers/[id]/approve/route.ts`
- POST endpoint for Super Admin
- Update `isApproved = true`
- Create notification

**Create:** `src/app/api/organizers/[id]/reject/route.ts`
- POST endpoint for Super Admin
- Update `rejectedAt` and `rejectionReason`
- Create notification

**Create:** `src/app/api/organizers/me/route.ts`
- GET endpoint for current user
- Return organizer profile if exists

### Step 2.2: Rank Category APIs

**Create:** `src/app/api/rank-categories/route.ts`
- POST: Create rank category
- GET: List organizer's categories
- Validate point ranges don't overlap

**Create:** `src/app/api/rank-categories/[id]/route.ts`
- PATCH: Update category
- DELETE: Delete category (if not used)

### Step 2.3: Tournament Management APIs

**Update:** `src/app/api/tournaments/route.ts`
- POST: Create tournament (DRAFT)
- GET: List tournaments (filtered by role)

**Create:** `src/app/api/tournaments/[id]/route.ts`
- GET: Get tournament details
- PATCH: Update tournament (if DRAFT)

**Create:** `src/app/api/tournaments/[id]/request-club-approval/route.ts`
- POST: Request club approval
- Update status to WAITING_FOR_CLUB_APPROVAL
- Create notification to club owner

**Create:** `src/app/api/tournaments/[id]/club-approve/route.ts`
- POST: Club owner approves
- Update status to WAITING_FOR_ADMIN_APPROVAL
- Create notification to organizer

**Create:** `src/app/api/tournaments/[id]/club-reject/route.ts`
- POST: Club owner rejects
- Update status to DRAFT
- Create notification to organizer

**Create:** `src/app/api/tournaments/[id]/admin-approve/route.ts`
- POST: Super Admin approves
- Update status to REGISTRATION_OPEN
- Create notification to organizer

**Create:** `src/app/api/tournaments/[id]/admin-reject/route.ts`
- POST: Super Admin rejects
- Update status to DRAFT
- Create notification to organizer

**Create:** `src/app/api/tournaments/[id]/close-registration/route.ts`
- POST: Close registration
- Update status to REGISTRATION_CLOSED

**Create:** `src/app/api/tournaments/[id]/start/route.ts`
- POST: Start tournament
- Update status to ONGOING

**Create:** `src/app/api/tournaments/[id]/finish/route.ts`
- POST: Finish tournament
- Update status to FINISHED

### Step 2.4: Registration APIs

**Create:** `src/app/api/tournaments/[id]/eligibility/route.ts`
- GET: Check eligibility
- Return eligibility status and reason

**Create:** `src/app/api/tournaments/[id]/register/route.ts`
- POST: Register for tournament
- Validate eligibility
- Create registration (PENDING)
- Create payment if provided
- Handle partner selection

**Create:** `src/app/api/tournaments/[id]/registrations/route.ts`
- GET: List registrations (Organizer/Admin only)

**Create:** `src/app/api/registrations/[id]/approve/route.ts`
- POST: Approve registration
- Create team if partner confirmed
- Create notification

**Create:** `src/app/api/registrations/[id]/reject/route.ts`
- POST: Reject registration
- Create notification

### Step 2.5: Partner System APIs

**Create:** `src/app/api/tournaments/[id]/partner-pool/route.ts`
- GET: List available players in partner pool

**Create:** `src/app/api/partner-requests/route.ts`
- POST: Create partner request

**Create:** `src/app/api/partner-requests/[id]/accept/route.ts`
- POST: Accept partner request
- Create team
- Update registrations

**Create:** `src/app/api/partner-requests/[id]/reject/route.ts`
- POST: Reject partner request

**Create:** `src/app/api/partner-requests/[id]/cancel/route.ts`
- POST: Cancel partner request

**Create:** `src/app/api/partner-requests/[id]/organizer-mediate/route.ts`
- POST: Organizer mediates partner matching

### Step 2.6: Payment APIs

**Create:** `src/app/api/payments/registration/[registrationId]/route.ts`
- POST: Create payment for registration

**Create:** `src/app/api/payments/[id]/approve/route.ts`
- POST: Approve payment

**Create:** `src/app/api/payments/[id]/reject/route.ts`
- POST: Reject payment

### Step 2.7: Match Management APIs

**Create:** `src/app/api/tournaments/[id]/publish-draw/route.ts`
- POST: Publish draw
- Create matches
- Send notifications

**Create:** `src/app/api/tournaments/[id]/matches/route.ts`
- GET: List tournament matches

**Create:** `src/app/api/matches/[id]/route.ts`
- PATCH: Update match (score, status, winner)

---

## 🎨 Phase 3: Frontend Implementation

### Step 3.1: Organizer Application Page

**Create:** `src/app/organizer/apply/page.tsx`
- Form to apply as organizer
- Show approval status
- Redirect to dashboard if approved

### Step 3.2: Organizer Dashboard

**Create:** `src/app/organizer/dashboard/page.tsx`
- Tabs: Overview, Rank Categories, Tournaments, Registrations, Partner Requests
- Stats and pending approvals

### Step 3.3: Rank Category Management

**Create:** `src/app/organizer/rank-categories/page.tsx`
- List categories
- Create/edit/delete forms
- Point range validation

### Step 3.4: Tournament Creation

**Create:** `src/app/organizer/tournaments/create/page.tsx`
- Multi-step form:
  1. Basic Info
  2. Location Selection
  3. Pricing & Prizes
  4. Terms & Conditions
  5. Review & Submit

### Step 3.5: Tournament List (Public)

**Update:** `src/app/tournaments/page.tsx`
- Show only REGISTRATION_OPEN and above
- Filter by location, level, date
- CTA: "View Details" / "Register"

### Step 3.6: Tournament Details (Public)

**Update:** `src/app/tournaments/[id]/page.tsx`
- Public view: Tournament info, registration form
- Organizer/Admin view: All data + management tools

### Step 3.7: Registration Flow

**Create:** `src/app/tournaments/[id]/register/page.tsx`
- Eligibility check
- Partner selection
- Terms acceptance
- Payment
- Confirmation

### Step 3.8: Partner Pool

**Create:** `src/app/tournaments/[id]/partner-pool/page.tsx`
- List eligible players
- Request to team up
- Accept/reject requests

### Step 3.9: Super Admin Tournament Management

**Create:** `src/app/admin/tournaments/page.tsx`
- List all tournaments
- Approve/reject buttons
- Organizer management

### Step 3.10: Club Owner Tournament Approvals

**Update:** `src/app/admin/club-owner/page.tsx`
- Add "Tournaments" tab
- List tournaments for their locations
- Approve/reject buttons

---

## 🔐 Phase 4: RBAC Integration

### Step 4.1: Update RBAC Utility

**Update:** `src/lib/rbac.ts`
- Add `isTournamentOrganizer()` function
- Add `canCreateTournament()` function
- Add `canManageTournament(organizerId)` function
- Add `canApproveTournament()` function (Club Owner / Super Admin)

### Step 4.2: Protect API Routes

- Add RBAC checks to all tournament APIs
- Return proper error messages for unauthorized access

---

## 🔔 Phase 5: Notification System

### Step 5.1: Notification Helper

**Create:** `src/lib/notifications.ts`
- Helper functions for creating notifications
- Support for all tournament notification types

### Step 5.2: Integrate Notifications

- Add notification creation to all relevant API endpoints
- Use notification helper in:
  - Organizer approval/rejection
  - Tournament approval/rejection
  - Registration approval/rejection
  - Partner requests
  - Draw publishing
  - Match assignment

---

## 🧪 Phase 6: Testing

### Step 6.1: Unit Tests
- Test eligibility logic
- Test partner validation
- Test status transitions

### Step 6.2: Integration Tests
- Test complete registration flow
- Test approval workflow
- Test partner matching

### Step 6.3: Manual Testing
1. Apply as organizer
2. Get approved by Super Admin
3. Create rank categories
4. Create tournament
5. Request club approval
6. Get club approval
7. Get admin approval
8. Register as player
9. Test partner system
10. Test payment flow
11. Publish draw
12. Manage matches

---

## 🚨 Critical Implementation Notes

### Eligibility Check
- Must check player points against rank category
- Handle players with no points (require organizer assignment)
- Prevent duplicate registrations

### Partner Validation
- Validate partner exists
- Check partner eligibility
- Prevent duplicate teams
- Handle partner requests properly

### Status Transitions
- Enforce valid status transitions
- Prevent invalid operations
- Handle rejection properly (return to DRAFT)

### Payment Flow
- Support multiple payment methods
- Require proof for non-cash methods
- Link payment to registration
- Approve/reject payments

### Draw Publishing
- Validate all teams are from approved registrations
- Assign courts and times
- Send notifications to all players
- Create match records

### Security
- All APIs must check authorization
- Public endpoints only show public data
- Organizer can only manage own tournaments
- Club Owner can only approve own locations
- Super Admin has full access

---

## 📝 Next Steps

1. **Run Migration:** Execute Prisma migration
2. **Implement APIs:** Start with organizer management
3. **Build Frontend:** Start with organizer dashboard
4. **Test Thoroughly:** Test all flows end-to-end
5. **Deploy:** Deploy to staging, then production

---

## 🔗 Related Documents

- `TOURNAMENT_SYSTEM_DESIGN.md` - Complete design specification
- `TOURNAMENT_API_ENDPOINTS.md` - API endpoint documentation
- `prisma/schema.prisma` - Database schema

---

This implementation guide provides a clear roadmap for building the complete tournament management system.
