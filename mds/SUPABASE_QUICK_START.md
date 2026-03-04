# 🚀 Supabase Setup - Quick Start

## ✅ You Have 4 Simple Steps

### Step 1: Get Your Supabase Connection String (1 minute)

1. Go to https://supabase.com/dashboard
2. Click on your **project**
3. Click **Settings** ⚙️ (left sidebar)
4. Click **Database**
5. Scroll to **"Connection string"** section
6. Click dropdown → select **"URI"**
7. Click the **Copy** button 📋
8. You'll get something like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 2: Add to .env File (1 minute)

**Open** `/Users/epnu/Desktop/padel-website/.env` in your editor

**Replace** this line:

```
DATABASE_URL="PASTE_YOUR_SUPABASE_CONNECTION_STRING_HERE"
```

**With** your actual connection string (paste what you copied):

```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

**Save** the file.

### Step 3: Run Migrations (2 minutes)

**Open terminal** in your project folder and run:

```bash
cd /Users/epnu/Desktop/padel-website

# Run the automated script
./run_migrations.sh
```

**OR manually:**

```bash
npx prisma migrate dev --name init
# When asked "Create a new migration?" type: y and press Enter

npx prisma generate
```

### Step 4: Restart Dev Server (30 seconds)

```bash
# Stop current server (Ctrl+C)
# Restart it
npm run dev
```

---

## 🎉 Done! Test It Now

1. **Visit:** http://localhost:3000/register
2. **Create an account**
3. **Go to:** http://localhost:3000/login
4. **Login**
5. **See your name** in the navbar! ✨

---

## 🔍 Verify Database

**View your database in Supabase:**

1. Go to https://supabase.com/dashboard
2. Click **Table Editor** in left sidebar
3. You should see all tables: User, Location, Court, Booking, etc.

**Or use Prisma Studio:**

```bash
npx prisma studio
```

This opens http://localhost:5555 - a nice UI to view your data!

---

## 📋 What Your .env Should Look Like

```env
DATABASE_URL="postgresql://postgres:[YOUR-ACTUAL-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

NEXTAUTH_SECRET="1ij0A2ce0xZEXbTzTCyNHrBL8aytHdjHVc51vA/ptr4="
NEXTAUTH_URL Adaptive="http://localhost:3000"
```

**Important:** Replace `[YOUR-ACTUAL-PASSWORD]` with your actual Supabase database password.

---

## 🆘 Troubleshooting

### "Error connecting to database"

**Fix:**

1. Make sure you copied the ENTIRE connection string
2. Check the password is correct
3. The string should start with `postgresql://`

### "Migration failed"

**Fix:**

```bash
npx prisma migrate reset
# Type: y when asked
npx prisma migrate dev --name init
```

### Can't find Supabase connection string

**Where to find it:**

- Supabase Dashboard → Your Project → Settings ⚙️ → Database
- Scroll down to "Connection string"
- Select "URI" from dropdown
- Click "Copy"

### Still having issues?

**Check:**

1. Is your .env file in `/Users/epnu/Desktop/padel-website/`?
2. Did you restart the dev server after editing .env?
3. Is the DATABASE_URL in quotes?
4. Did you replace the placeholder text?

---

## ✨ You're All Set!

Once migrations complete successfully:

- ✅ 12 tables created in Supabase
- ✅ Ready for users to register
- ✅ Authentication working
- ✅ API routes functional

**Next:** Add initial data (locations, courts, coaches) and connect the booking page!
