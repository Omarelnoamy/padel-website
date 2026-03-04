# 👮 Moderator Testing Guide

This guide explains how to test the **Moderator** user type in the PadelPro system.

## 📋 What is a Moderator?

A **Moderator** is a type of admin user with:
- **Role**: `admin`
- **Admin Type**: `moderator`
- **Access**: Club Owner Dashboard (similar to club owners and owner partners)
- **Approval Required**: Yes (must be approved by Super Admin)

### Moderator Permissions

Based on the codebase, moderators have:
- ✅ Access to Club Owner Dashboard (`/admin/club-owner`)
- ✅ View all locations (similar to club owners)
- ✅ View bookings for all locations
- ✅ View financial data
- ✅ Create/modify/cancel bookings (with full access like club owners)
- ✅ All regular user permissions

---

## 🚀 Step-by-Step Testing Instructions

### Step 1: Create a Moderator Account

#### Option A: Using the Create Script (Recommended)

1. Open your terminal in the project root directory
2. Run the moderator creation script:
   ```bash
   node create-moderator.js
   ```
3. Follow the prompts:
   - **Email**: Press Enter for `moderator@padel.com` or enter a custom email
   - **Password**: Press Enter for `moderator123` or enter a custom password
   - **Name**: Press Enter for `Test Moderator` or enter a custom name

#### Option B: Manual Database Update (Alternative)

If you prefer to use an existing user or create via database:

1. Use Prisma Studio or direct database access:
   ```bash
   npx prisma studio
   ```

2. Create/update a user with:
   - `role`: `"admin"`
   - `adminType`: `"moderator"`
   - `isApproved`: `false` (will need approval)
   - `email`, `password` (hashed), `name`

#### Option C: Via Registration (For Testing Full Flow)

1. Go to `http://localhost:3000/register`
2. Register with:
   - Select "Admin" as account type
   - Select "Moderator" as admin type (if available in the form)
   - Fill in email, password, name
3. This will create an **unapproved** moderator that needs super admin approval

---

### Step 2: Approve the Moderator (Required)

Moderators cannot access admin features until approved by a Super Admin.

1. **Login as Super Admin**:
   - Go to `http://localhost:3000/login`
   - Login with your super admin credentials (e.g., `admin@padel.com` / `admin123`)

2. **Navigate to Super Admin Dashboard**:
   - Go to `http://localhost:3000/admin/super-admin`
   - Or click "Super Admin" in the navigation menu

3. **Approve the Moderator**:
   - Look for the "Pending Approvals" section
   - Find the moderator user you just created
   - Click "Approve" button
   - The moderator's `isApproved` status will be set to `true`

---

### Step 3: Login as Moderator

1. **Logout** from Super Admin (if still logged in)

2. **Login as Moderator**:
   - Go to `http://localhost:3000/login`
   - Enter the moderator credentials:
     - Email: `moderator@padel.com` (or the email you used)
     - Password: `moderator123` (or the password you set)

3. **Verify Login**:
   - You should successfully login
   - Check the navigation bar - you should see admin-related links

---

### Step 4: Test Moderator Features

#### 4.1 Access Club Owner Dashboard

1. Navigate to `/admin/club-owner` or click "Club Owner Dashboard" in the navigation
2. **Expected Result**: 
   - You should see the Club Owner Dashboard
   - The page title should show "Moderator Dashboard"
   - You should have access to all tabs (Overview, Bookings, Transactions, Locations)

#### 4.2 Test Viewing Locations

1. In the Club Owner Dashboard, go to the "Locations" tab
2. **Expected Result**:
   - You should see all locations in the system
   - Similar to how a club owner would see their locations

#### 4.3 Test Viewing Bookings

1. Go to the "Bookings" tab in the Club Owner Dashboard
2. **Expected Result**:
   - You should see bookings from all locations
   - You can filter by date and location
   - Similar to club owner's booking view

#### 4.4 Test Creating a Booking (Full Access)

1. In the Club Owner Dashboard, go to the "Bookings" tab
2. Click "Create New Booking" or similar button
3. Try to create a booking:
   - Select a location (any location)
   - Select a court
   - Select a date and time
   - Create the booking
4. **Expected Result**:
   - Booking should be created successfully
   - No restrictions on booking duration
   - Can book at any time (no 4-hour advance rule)
   - Can set booking categories (Regular, Academy, Tournament)

#### 4.5 Test Canceling Bookings

1. Find a booking in the Club Owner Dashboard
2. Try to cancel it
3. **Expected Result**:
   - Can cancel any booking
   - No cancellation deadline restrictions
   - Similar to club owner's cancel permissions

#### 4.6 Test Financial Transactions

1. Go to the "Transactions" tab in the Club Owner Dashboard
2. **Expected Result**:
   - You should see financial transactions
   - Similar to club owner's financial view
   - Can view income, expenses, net profit

#### 4.7 Test Regular User Features

1. Navigate to `/booking` (regular booking page)
2. Try to book a court as a regular user
3. **Expected Result**:
   - Should work normally
   - You have all regular user permissions
   - Can book courts, view bookings, etc.

---

### Step 5: Test Approval Flow (Optional)

To test the full registration and approval flow:

1. **Create a New Test User**:
   - Logout as moderator
   - Register a new account at `/register`
   - Select "Admin" → "Moderator"
   - Use a different email (e.g., `moderator2@padel.com`)

2. **Try to Access Admin Features**:
   - After registration, try to go to `/admin/club-owner`
   - **Expected Result**: Should be blocked or redirected (because `isApproved: false`)

3. **Get Approved**:
   - Login as Super Admin
   - Go to Super Admin Dashboard
   - Approve the new moderator
   - Logout

4. **Access Admin Features**:
   - Login as the newly approved moderator
   - Try to access `/admin/club-owner`
   - **Expected Result**: Should work now (because `isApproved: true`)

---

## 🧪 Test Checklist

Use this checklist to ensure you've tested all moderator functionality:

- [ ] **Account Creation**
  - [ ] Created moderator account successfully
  - [ ] Moderator appears in database with correct `role` and `adminType`

- [ ] **Approval System**
  - [ ] Moderator cannot access admin features before approval
  - [ ] Moderator appears in Super Admin's pending approvals
  - [ ] Super Admin can approve moderator
  - [ ] Moderator can access admin features after approval

- [ ] **Login & Navigation**
  - [ ] Can login with moderator credentials
  - [ ] Navigation bar shows admin links
  - [ ] Can access Club Owner Dashboard

- [ ] **Dashboard Access**
  - [ ] Can view Club Owner Dashboard
  - [ ] Page shows "Moderator Dashboard" title
  - [ ] All tabs are accessible (Overview, Bookings, Transactions, Locations)

- [ ] **Location Management**
  - [ ] Can view all locations
  - [ ] Location data displays correctly

- [ ] **Booking Management**
  - [ ] Can view bookings from all locations
  - [ ] Can create bookings (any location, any time, any duration)
  - [ ] Can cancel bookings (no restrictions)
  - [ ] Can set booking categories (Regular, Academy, Tournament)
  - [ ] Can filter bookings by date and location

- [ ] **Financial Management**
  - [ ] Can view financial transactions
  - [ ] Can view financial summaries
  - [ ] Can view financial charts

- [ ] **Regular User Features**
  - [ ] Can book courts as regular user
  - [ ] Can view own bookings
  - [ ] Can cancel own bookings

---

## 🔍 Verification Queries

To verify moderator setup in the database:

```sql
-- Check all moderators
SELECT id, email, name, role, "adminType", "isApproved", "createdAt"
FROM "User"
WHERE role = 'admin' AND "adminType" = 'moderator';

-- Check a specific moderator
SELECT * FROM "User" WHERE email = 'moderator@padel.com';

-- Check approval status
SELECT email, "isApproved" FROM "User" 
WHERE role = 'admin' AND "adminType" = 'moderator';
```

Or using Prisma Studio:
```bash
npx prisma studio
```
Then navigate to User table and filter by `role = admin` and `adminType = moderator`.

---

## 🐛 Troubleshooting

### Moderator Cannot Access Admin Dashboard

**Possible Causes:**
1. ✅ **Not approved yet**: Check if `isApproved = false` in database
   - **Solution**: Get Super Admin to approve the moderator

2. ✅ **Wrong role/adminType**: Verify `role = "admin"` and `adminType = "moderator"`
   - **Solution**: Update the user in database

3. ✅ **Session not refreshed**: Old session might have old permissions
   - **Solution**: Clear cookies, logout, and login again

### Moderator Cannot See Locations

**Possible Causes:**
1. ✅ **No locations exist**: Create some locations first
   - **Solution**: Use Super Admin to create locations

2. ✅ **Database connection issue**: Check database connection
   - **Solution**: Verify database is running and connection string is correct

### Approval Not Working

**Possible Causes:**
1. ✅ **Not logged in as Super Admin**: Verify you're using super admin account
   - **Solution**: Login with `role = "admin"` and `adminType = "super_admin"`

2. ✅ **Super Admin not approved**: Super Admin needs to be approved too
   - **Solution**: Check super admin's `isApproved = true`

---

## 📝 Quick Reference

### Default Test Credentials (Created by Script)

- **Email**: `moderator@padel.com`
- **Password**: `moderator123`
- **Name**: `Test Moderator`
- **Role**: `admin`
- **Admin Type**: `moderator`
- **Approval Status**: `false` (needs approval)

### Useful URLs

- **Login**: `http://localhost:3000/login`
- **Club Owner Dashboard**: `http://localhost:3000/admin/club-owner`
- **Super Admin Dashboard**: `http://localhost:3000/admin/super-admin`
- **Regular Booking**: `http://localhost:3000/booking`
- **My Bookings**: `http://localhost:3000/my-bookings`

### Database Schema Reference

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  password    String
  role        String   @default("user")  // "admin" for moderators
  adminType   String?                    // "moderator" for moderators
  isApproved  Boolean  @default(true)    // false for admins until approved
  // ... other fields
}
```

---

## 🎯 Summary

To test moderator functionality:

1. **Create** moderator account: `node create-moderator.js`
2. **Approve** via Super Admin Dashboard
3. **Login** as moderator
4. **Test** all features in Club Owner Dashboard
5. **Verify** permissions match expectations

The moderator should have full access to the Club Owner Dashboard with all the same features as a club owner, but for all locations (not just owned ones).
