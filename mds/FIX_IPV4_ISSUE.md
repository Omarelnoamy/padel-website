# ✅ Fix: Use Session Pooler (IPv4 Compatible)

## The Problem

Your Supabase shows "Not IPv4 compatible" warning - that's why direct connection doesn't work!

## The Solution

Use **Session Pooler** instead of Direct connection.

## Steps:

### 1. In the Modal You Have Open

Click the **"Pooler settings"** button that's shown in the warning.

OR

### 2. Change the Method

In the modal, look for:

- **"Method"** dropdown (currently says "Direct connection")
- Change it to **"Session Pooler"** or **"Transaction Pooler"**

### 3. Copy the Connection String

You'll see a new connection string that looks like:

```
postgresql://postgres.ntvdjfwmkscuzqkvtqic:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Copy this entire string!**

### 4. Update Your .env File

Open `/Users/epnu/Desktop/padel-website/.env`

Replace the DATABASE_URL with the pooler connection string you just copied.

### 5. Make Sure to Replace [YOUR_PASSWORD]

The connection string will have `[YOUR_PASSWORD]` - replace it with your actual database password (the one you saw earlier: `G9KlMVmgu1HYNkBo`)

So it becomes:

```
postgresql://postgres.ntvdjfwmkscuzqkvtqic:G9KlMVmgu1HYNkBo@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 6. Restart Server

```bash
# Press Ctrl+C in terminal
npm run dev
```

### 7. Test!

Go to http://localhost:3000/register and try registering!

---

## 🎯 What You're Looking For

After clicking "Pooler settings" or changing Method to "Session Pooler", you should see:

- Connection string with `pooler.supabase.com:6543` (NOT `db.xxx.supabase.co:5432`)
- Port **6543** (not 5432)
- `?pgbouncer=true` at the end

**This is the connection string that will work!**
