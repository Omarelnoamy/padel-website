# Terminal Commands - Copy and Paste These

## Step 1: Navigate to your project

```bash
cd /Users/epnu/Desktop/padel-website
```

## Step 2: Run the migration

```bash
npx prisma migrate dev --name init
```

**What to expect:**

- It will ask "Create a new migration?" - Type `y` and press Enter
- It will create the database tables
- This takes 10-30 seconds

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

**What to expect:**

- This generates the Prisma client code
- Takes 5-10 seconds

## Step 4: (Optional) View your database

```bash
npx prisma studio
```

**What to expect:**

- Opens a browser window at http://localhost:5555
- Shows all your database tables in a nice UI
- Press Ctrl+C to close

## Step 5: Restart your dev server

```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

---

## 🎯 Complete Copy-Paste (All at once)

Copy and paste this entire block into your terminal:

```bash
cd /Users/epnu/Desktop/padel-website
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

---

## 📝 What Each Command Does

**`npx prisma migrate dev --name init`**

- Connects to your Supabase database
- Creates all 12 tables in your database
- Saves migration history

**`npx prisma generate`**

- Creates the Prisma client code
- Allows your app to talk to the database

**`npm run dev`**

- Starts your Next.js development server
- Makes your app available at http://localhost:3000

---

## ✅ Success Indicators

After running the commands, you should see:

1. **Migration output:**

   ```
   The following migration(s) have been created and applied from new schema changes:
   prisma/migrations/XXXXXXXX_init/migration.sql
   Your database is now in sync with your schema.
   ```

2. **Prisma client:**

   ```
   Environment variables loaded from .env
   Prisma schema loaded from prisma/schema.prisma
   Generated Prisma Client (v6.x.x) to ./node_modules/.prisma/client
   ```

3. **Database tables in Supabase:**
   - Go to https://supabase.com/dashboard
   - Click "Table Editor"
   - You should see: User, Location, Court, Booking, Coach, etc.

---

## 🐛 Troubleshooting

### If you get "Error: P1001: Can't reach database server"

- Check your .env file has the correct connection string
- Make sure it uses port 6543 (connection pooling)

### If you get "Migration failed"

- Run: `npx prisma migrate reset` (this deletes all data)
- Then run migration again

### If tables already exist

- That's fine! Just run `npx prisma generate` to update the client

---

## 🎉 Next Steps After Migrations

Once migrations complete successfully:

1. **Test registration:**

   - Visit http://localhost:3000/register
   - Create a test account

2. **Check database:**

   - Visit https://supabase.com/dashboard
   - Go to Table Editor
   - You should see your user in the User table

3. **Start building:**
   - Your database is now ready!
   - Add some locations, courts, and coaches
   - Connect your booking page to the API
