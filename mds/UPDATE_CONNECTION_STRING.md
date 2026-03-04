# 🔧 Update Supabase Connection String

## The Problem

Your current connection string uses port 5432 which Supabase blocks.

## The Solution

Use the **Connection Pooling** connection string instead.

## Steps (2 minutes):

### 1. Go to Supabase Database Settings

Click this link:
https://supabase.com/dashboard/project/ntvdjfwmkscuzqkvtqic/settings/database

### 2. Get Connection Pooling String

- Scroll to **"Connection string"** section
- Select dropdown → Choose **"Connection pooling"**
- Select **"Session mode"** (not Transaction mode)
- Click the **Copy** button 📋

You'll get something like:

```
postgresql://postgres.ntvdjfwmkscuzqkvtqic:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 3. Update .env File

Open `/Users/epnu/Desktop/padel-website/.env`

Replace the `DATABASE_URL` line with what you just copied.

Your .env should look like:

```env
DATABASE_URL="postgresql://postgres.ntvdjfwmkscuzqkvtqic:G9KlMVmgu1HYNkBo@aws-0-[REGION].pooler.supabase.com:6543/postgres"
NEXTAUTH_SECRET="1ij0A2ce0xZEXbTzTCyNHrBL8aytHdjHVc51vA/ptr4="
NEXTAUTH_URL="http://localhost:3000"
```

**Important:** Replace `[REGION]` with your actual region (e.g., `us-east-1`, `eu-west-1`, etc.)

### 4. Run Migrations

After updating, run:

```bash
cd /Users/epnu/Desktop/padel-website
npx prisma migrate dev --name init
```

## ✅ Done!

After the migrations complete, you'll have all your tables in Supabase!

---

## 🆘 Still Having Issues?

**If connection pooling doesn't work:**

1. Your Supabase project might need IP whitelisting
2. Check the Supabase dashboard for any connection errors
3. Try restarting your Supabase project

**Need help?** Share the connection pooling string you get from Supabase and I can help you format it correctly.
