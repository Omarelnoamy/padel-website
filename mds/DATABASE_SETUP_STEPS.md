# Database Setup - Exact Steps

## 🚀 Option 1: Free Cloud Database (Recommended - 5 minutes)

### Step 1: Get a Free Database URL

**Choose one:**

#### A. Railway (Easiest)

1. Go to https://railway.app
2. Click "Login" → Sign up with GitHub (free)
3. Click "New Project"
4. Click "Provision PostgreSQL"
5. Click on the PostgreSQL service
6. Go to "Variables" tab
7. Copy the value of `DATABASE_URL`
8. **You now have your database URL!**

#### B. Supabase (Also Easy)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up (free)
4. Create new project
5. Wait 2 minutes for setup
6. Go to Settings → Database
7. Scroll to "Connection string"
8. Copy the URI connection string
9. **You now have your database URL!**

### Step 2: Add to Your Project

```bash
# Go to your project folder
cd /Users/epnu/Desktop/padel-website

# Create .env file (if it doesn't exist)
touch .env

# Open .env file in your editor and paste:
```

**Paste this into your `.env` file:**

```env
# Your database URL (paste the one you copied)
DATABASE_URL="your_database_url_here"

# Generate a random secret for NextAuth
NEXTAUTH_SECRET="your-random-secret-here-generate-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"
```

**To generate NEXTAUTH_SECRET, run:**

```bash
openssl rand -base64 32
```

Copy the output and paste it where it says `your-random-secret-here...`

### Step 3: Run Migrations

```bash
# This creates all tables in your database
npx prisma migrate dev --name init

# You'll see a prompt asking to create database
# Type: y and press Enter
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Done! Test it

```bash
# Your dev server should already be running
# Just refresh your browser at http://localhost:3000

# Go to: http://localhost:3000/register
# Create an account
# Go to: http://localhost:3000/login
# Login
```

---

## 🖥️ Option 2: Local PostgreSQL (10 minutes)

### Step 1: Install PostgreSQL

**Mac:**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**

- Download from: https://www.postgresql.org/download/windows/
- Install and start the service

### Step 2: Create Database

```bash
# Mac/Linux
createdb padel_db

# Windows (use psql)
psql -U postgres
CREATE DATABASE padel_db;
\q
```

### Step 3: Get Connection String

Your local connection string will be:

```
postgresql://yourusername@localhost:5432/padel_db
```

Replace `yourusername` with your PostgreSQL username (usually your Mac username)

**To find your username:**

```bash
whoami
```

### Step 4: Add to .env

```bash
# Create .env file
touch .env
```

**Add this to .env:**

```env
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/padel_db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate secret:**

```bash
openssl rand -base64 32
```

### Step 5: Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 6: Done!

Refresh your browser and test registration/login.

---

## 📋 Complete .env File Template

Copy this and fill in your values:

```env
# Database (paste your DATABASE_URL here)
DATABASE_URL="postgresql://..."

# NextAuth (generate secret with: openssl rand -base64 32)
NEXTAUTH_SECRET="paste-your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional (for future):
# STRIPE_SECRET_KEY=""
# RESEND_API_KEY=""
```

---

## ✅ Verification Checklist

After running migrations, verify everything works:

### 1. Check if tables were created:

**Using Prisma Studio:**

```bash
npx prisma studio
```

This opens http://localhost:5555 where you can see all tables.

**Or check your database directly** (should see tables like User, Location, Court, etc.)

### 2. Test Registration:

1. Go to http://localhost:3000/register
2. Fill in the form
3. Click "Register"
4. You should see "Redirecting to login..."

### 3. Test Login:

1. Go to http://localhost:3000/login
2. Enter your email and password
3. Click "Login"
4. You should be redirected to home page
5. Your name should appear in the navbar

### 4. Check Database:

```bash
npx prisma studio
```

You should see your user record in the `User` table!

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot find module '@prisma/client'"

**Fix:**

```bash
npx prisma generate
```

### Issue: "Error connecting to database"

**Fix:**

1. Check your DATABASE_URL is correct
2. Make sure database is running
3. For cloud databases, check if you need to whitelist IP

### Issue: "Migration failed"

**Fix:**

```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

### Issue: "PrismaClient is not configured"

**Fix:**

1. Make sure .env file exists in the project root
2. Check DATABASE_URL is set
3. Restart your dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Issue: "DATABASE_URL environment variable is missing"

**Fix:**

1. Make sure .env file is in `/Users/epnu/Desktop/padel-website/`
2. Check the file has DATABASE_URL
3. No quotes needed around the URL
4. Restart dev server

---

## 🎯 Quick Reference Commands

```bash
# 1. Generate random secret
openssl rand -base64 32

# 2. Create migration
npx prisma migrate dev --name init

# 3. Generate Prisma client
npx prisma generate

# 4. Open database GUI
npx prisma studio

# 5. Reset database (⚠️ deletes all data)
npx prisma migrate reset

# 6. View database schema
npx prisma format
```

---

## 📝 Example .env File

```env
DATABASE_URL="postgresql://johndoe@localhost:5432/padel_db"
NEXTAUTH_SECRET="XK7mP9vN2qR4wF6hL8jK3mP0sV2xZ5aB7dC9fG1hI0jKlMnOp"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 🎉 Success Indicators

When everything is working:

✅ `/api/locations` returns `[]` (empty array is fine, means no data yet)
✅ `/api/coaches` returns `[]`
✅ You can register a new user
✅ You can login with that user
✅ Your name appears in the navbar
✅ Logout button appears when logged in

---

## 🚀 What's Next?

After database is set up:

1. Add locations/courts/coaches data (see ADD_INITIAL_DATA.md)
2. Test booking flow
3. Add payment integration
4. Deploy to production

---

## 🆘 Still Having Issues?

1. Check terminal for exact error message
2. Make sure .env file is in the root directory
3. Make sure dev server is restarted after adding .env
4. For cloud databases, make sure you copied the full URL including password

**Need help?** Share the exact error message and I'll help you fix it!
