# 🔧 Database Setup Guide - Quick Fix

## Current Issue

Your database connection string is invalid or expired. Error: "FATAL: Tenant or user not found"

## ✅ Step-by-Step Fix

### Step 1: Get Fresh Connection String from Supabase

1. **Open Supabase Dashboard:**

   - Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/settings/database
   - (Or login to Supabase → Select your project → Settings → Database)

2. **Get Connection String (Choose ONE method):**

   **Option A: Direct Connection (Recommended - Try this first)**

   - Scroll to **"Connection string"** section
   - Select tab: **"Connection string"** (NOT "Connection pooling")
   - Format dropdown: Select **"URI"**
   - Click **Copy** button
   - Should look like: `postgresql://postgres:[PASSWORD]@db.ntvdjfwmkscuzqkvtqic.supabase.co:5432/postgres`

   **Option B: Connection Pooling (If Option A doesn't work)**

   - Scroll to **"Connection string"** section
   - Select tab: **"Connection pooling"**
   - Mode: Select **"Session"** (NOT Transaction)
   - Click **Copy** button
   - Should look like: `postgresql://postgres.ntvdjfwmkscuzqkvtqic:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true`

   **Option C: Transaction Mode (Last resort)**

   - Use "Connection pooling" tab
   - Mode: Select **"Transaction"**
   - Copy the connection string

### Step 2: Update Your .env File

1. Open: `/Users/epnu/Desktop/padel-website/.env`

2. Replace the `DATABASE_URL` line with the connection string you just copied

3. Your `.env` should look like:

```env
DATABASE_URL="paste_your_fresh_connection_string_here"
NEXTAUTH_SECRET="1ij0Ace0xZEXbTzTCyNHrBL8aytHdjHVc51vA/ptr4="
NEXTAUTH_URL="http://localhost:3000"
```

**Important:**

- Keep the quotes around the URL
- Make sure there are no extra spaces
- The password is case-sensitive

### Step 3: Test the Connection

Run this command to test if the connection works:

```bash
cd /Users/epnu/Desktop/padel-website
npx prisma db push
```

**Expected result:** Should say "✅ Your database is now in sync with your Prisma schema"

**If you get an error:** Try a different connection string option (Option A, B, or C above)

### Step 4: Create Database Tables (Migration)

If the connection test works, run migrations:

```bash
npx prisma migrate dev --name init
```

This creates all your database tables (User, Location, Court, Booking, etc.)

### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

This generates the Prisma client so your app can query the database.

### Step 6: Restart Your Dev Server

1. Stop the current server (Ctrl+C in the terminal where `npm run dev` is running)
2. Start it again:

```bash
npm run dev
```

### Step 7: Verify It Works

1. Visit: http://localhost:3000/register
2. Try to create an account
3. If it works, check your Supabase dashboard → Table Editor → You should see a new user in the `User` table!

---

## 🆘 Still Not Working?

### Check Supabase Project Status

1. Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic
2. Make sure your project status is **"Active"** (not paused)
3. If it's paused, click "Resume" button

### Common Issues:

**"Connection refused"**

- Your Supabase project might be paused
- Check if you need to whitelist your IP address

**"Authentication failed"**

- Your password might be wrong
- Get a fresh connection string from Supabase dashboard
- Make sure you copied the ENTIRE string including password

**"Tenant or user not found"**

- Connection string format is wrong
- Make sure you're using the correct format (see Step 1)
- Try Option A (Direct connection) first

**"Relation does not exist"**

- Tables haven't been created yet
- Run: `npx prisma migrate dev --name init`

---

## ✅ Success Checklist

When everything is working, you should be able to:

- [ ] Run `npx prisma db push` without errors
- [ ] See tables in Supabase dashboard (User, Location, Court, etc.)
- [ ] Register a new user at http://localhost:3000/register
- [ ] Login at http://localhost:3000/login
- [ ] See your user data in Supabase Table Editor

---

## 🎯 Quick Reference Commands

```bash
# Test connection
npx prisma db push

# Create tables
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# View database in browser (Prisma Studio)
npx prisma studio

# Check if connection works
npx prisma db pull
```

---

## 📝 Need Help?

If you're still stuck, share:

1. The exact error message you get
2. Which connection string option you tried (A, B, or C)
3. Whether your Supabase project is Active or Paused

