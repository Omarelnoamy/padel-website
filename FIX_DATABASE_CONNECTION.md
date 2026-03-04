# 🔧 Fix Database Connection - "Failed to load locations"

## The Problem

Error: `FATAL: Tenant or user not found`

This means your database connection string credentials are incorrect or expired.

## ✅ Solution: Get Fresh Connection String from Supabase

### Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/settings/database
2. Scroll down to **"Connection string"** section

### Step 2: Select Session Mode (Important!)

1. Click on **"Connection pooling"** tab
2. Select **"Session"** mode (NOT Transaction mode)
3. Copy the connection string

It should look like:

```
postgresql://postgres.ntvdjfwmkscuzqkvtqic:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true
```

### Step 3: Update Your .env File

Replace the `DATABASE_URL` in `/Users/epnu/Desktop/padel-website/.env` with the fresh connection string you just copied.

### Step 4: Restart Your Server

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

## 🔍 Alternative: Use Direct Connection (If Pooler Doesn't Work)

If Session Pooler still doesn't work:

1. In Supabase Dashboard, go to **"Connection string"** tab (NOT Connection pooling)
2. Select **"URI"** format
3. Copy the connection string (it will use port 5432 directly)
4. Update your `.env` file
5. Restart server

## ⚠️ Important Notes

- **Session Pooler** (port 5432) works with Prisma
- **Transaction Pooler** (port 6543) does NOT work with Prisma
- Make sure your Supabase project is **Active** (not paused)
- The password might have changed if you reset it

## 🧪 Test Connection

After updating, test if it works:

```bash
npx prisma db push
```

If this succeeds, your connection is fixed!

