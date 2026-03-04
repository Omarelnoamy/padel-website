# 🔧 Fix Database Connection Issue

## Problem

Connection pooling (port 6543) isn't working. Use direct connection instead.

## Quick Fix (2 minutes)

### 1. Get Direct Connection String from Supabase

Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/settings/database

Scroll to **"Connection string"** section:

**Choose: "Connection string" (NOT "Connection pooling")**

Select **"URI"** from dropdown

Copy the connection string - it will look like:

```
postgresql://postgres:[PASSWORD]@db.ntvdjfwmkscuzqkvtqic.supabase.co:5432/postgres
```

### 2. Update .env File

Open `/Users/epnu/Desktop/padel-website/.env`

Replace the DATABASE_URL with the new one (the one on port 5432, not 6543)

It should change from:

```env
DATABASE_URL="postgresql://postgres.ntvdjfwmkscuzqkvtqic:G9KlMVmgu1HYNkBo@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
```

To:

```env
DATABASE_URL="postgresql://postgres:G9KlMVmgu1HYNkBo@db.ntvdjfwmkscuzqkvtqic.supabase.co:5432/postgres"
```

**Notice the difference:**

- Direct connection: `db.ntvdjfwmkscuzqkvtqic.supabase.co:5432`
- Pooled connection: `aws-1-eu-west-1.pooler.supabase.com:6543`

### 3. Restart Dev Server

In your terminal:

```bash
# Press Ctrl+C to stop
npm run dev
```

### 4. Test Again

Go to: http://localhost:3001/register
Try registering again

---

## Alternative: Use Transaction Mode

If direct connection doesn't work, try Transaction mode:

1. Go to Supabase dashboard → Settings → Database
2. Connection string → **Connection pooling**
3. Select **"Transaction"** (not Session)
4. Copy that connection string
5. Update .env

Transaction mode usually works better than Session mode.

---

## After Fix

Once connection works:

- ✅ User registration will work
- ✅ Login will work
- ✅ You'll see data in Supabase
- ✅ App will be fully functional
