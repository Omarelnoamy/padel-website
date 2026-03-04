# 🧹 Database Reset & Testing Guide

## ⚠️ IMPORTANT: Development Only

**This will DELETE ALL DATA in your database. Only run this in development!**

---

## Step 1: Reset Database

```bash
npm run db:reset
```

This will:

- Drop all tables
- Re-run all migrations
- Seed the database with test data

**Alternative (if you want to skip seed):**

```bash
npx prisma migrate reset --force --skip-seed
npm run db:seed
```

---

## Step 2: Verify Seed Data

After seeding, you should have:

### Users (all passwords: `password123`)

- `superadmin@test.com` - Super Admin (approved)
- `clubownera@test.com` - Club Owner A (approved, owns Location A)
- `clubownerb@test.com` - Club Owner B (unapproved)
- `ownerpartner@test.com` - Owner Partner (approved, read-only)
- `moderator@test.com` - Moderator (approved, limited)
- `clubadmin@test.com` - Club Admin (approved, booking-only)
- `user@test.com` - Regular User (approved)

### Locations & Courts

- **Location A** (owned by Club Owner A)
  - Court A1 (Indoor, 250 EGP/hour)
  - Court A2 (Outdoor, 200 EGP/hour)
- **Location B** (unassigned)
  - Court B1 (Indoor, 300 EGP/hour)

### Bookings

- 2 confirmed bookings (Location A)
- 1 cancelled booking (Location A)

### Financial Transactions

- 2 booking revenue entries
- 1 cancellation refund (negative income)
- 1 manual income
- 1 manual expense

---

## Step 3: Start Development Server

```bash
npm run dev
```

Ensure the server is running on `http://localhost:3000`

---

## Step 4: Run Tests

### Option A: Automated Test Runner

```bash
npm test
```

### Option B: Manual Testing

Use the test cases in `TEST_PLAN.md` to manually verify each scenario.

---

## Step 5: Review Test Results

Check the console output for:

- ✅ Passed tests
- ❌ Failed tests
- Error messages and details

---

## Troubleshooting

### Database Connection Error

- Verify `.env` has correct `DATABASE_URL`
- Ensure database is accessible

### Seed Fails

- Check Prisma client is generated: `npx prisma generate`
- Verify all migrations are applied

### Test Runner Fails

- Ensure dev server is running
- Check BASE_URL in `test-runner.ts`
- Verify test users exist in database

---

## Next Steps

After testing:

1. Review `TEST_PLAN.md` for comprehensive test matrix
2. Fix any failing tests
3. Document edge cases found
4. Update test cases as needed
