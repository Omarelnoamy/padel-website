# 🚀 Simple Database Setup - Copy These Commands

## Step 1: Stop the current command (if stuck)

Press **Ctrl+C** in your terminal

## Step 2: Use the simpler command (copy this):

```bash
cd /Users/epnu/Desktop/padel-website
npx prisma db push
```

This will:

- Connect to your Supabase database
- Create all tables instantly
- No migrations needed!

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## Step 4: Verify it worked

```bash
npx prisma studio
```

This opens a browser showing all your tables!

## Step 5: Restart your server

```bash
npm run dev
```

---

## 🎉 That's it! Test it:

1. Visit: http://localhost:3000/register
2. Create an account
3. Check Supabase dashboard - you'll see the User table with your data!
