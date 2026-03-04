# 🔴 URGENT: Fix Database Connection

## Important Note About RLS Policies

The Supabase assistant gave you **RLS (Row Level Security) policies**. These are for **security AFTER connection works**, not for fixing the connection itself.

**Right now, Prisma can't even connect to Supabase.** We need to fix that FIRST.

---

## 🎯 The Real Problem

Your Prisma client can't reach Supabase. This is a **connection string** issue.

---

## ✅ Simple Fix - Get the Right Connection String

### Step 1: Open Supabase Dashboard

Go directly here:
https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/settings/database

### Step 2: Find "Connection string" Section

Scroll down until you see **"Connection string"**

### Step 3: You'll See Two Options

**Option A: Connection string** (Direct connection)

- Shows: `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres`
- **Try this one first!**

**Option B: Connection pooling**

- Then select **"Transaction"** mode
- Shows: `postgresql://postgres.xxx:...@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true`

### Step 4: Copy ONE of These

Try **Option A first** (Direct connection). If that doesn't work, try Option B.

### Step 5: Update Your .env

Replace the DATABASE_URL in `/Users/epnu/Desktop/padel-website/.env`

### Step 6: Restart Server

```bash
# Press Ctrl+C
npm run dev
```

---

## 🔍 Check Your Supabase Project Status

Before anything, check:

1. Go to: https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic
2. Look at the top - is your project **"Active"**?
3. Is there a **"Pause"** button? (If yes, it's paused!)
4. Any warnings or errors shown?

**If your project is paused or has errors, that's why it won't connect!**

---

## 🚀 Alternative: Use Connection String from Supabase CLI

If the dashboard doesn't work:

1. Install Supabase CLI:

```bash
brew install supabase/tap/supabase
```

2. Login:

```bash
supabase login
```

3. Link project:

```bash
supabase link --project-ref ntvdjfwmkscuzqkvtqic
```

4. Get connection string:

```bash
supabase status
```

---

## 💡 About Those RLS Policies

The policies Supabase assistant gave you are for:

- Securing data access
- Row-level security
- Multi-tenant applications

**But we don't need them right now!**

Prisma connects directly to PostgreSQL, not through Supabase's PostgREST API, so RLS policies aren't blocking the connection.

**The connection issue is network/firewall related, not policy related.**

---

## 🎯 What You Need To Do RIGHT NOW

1. **Check Supabase project status** (Active/Paused?)
2. **Get connection string** from dashboard
3. **Update .env file**
4. **Restart server**
5. **Test registration**

That's it! Once connection works, THEN we can add RLS policies if you want.

---

## 📝 Quick Checklist

- [ ] Supabase project is Active (not paused)
- [ ] Got connection string from dashboard
- [ ] Updated .env file
- [ ] Restarted server
- [ ] Tested registration

**Share what you find!** Especially:

- Is the project Active?
- What connection strings do you see in the dashboard?
