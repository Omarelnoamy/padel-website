# Environment Setup Guide

## 🚀 Quick Start

### 1. Set up your database

Choose one of these options:

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL on your machine
# For Mac:
brew install postgresql
brew services start postgresql

# For Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
createdb padel_db
```

#### Option B: Free Cloud Database (Recommended for testing)

**Supabase (Free tier):**

1. Go to https://supabase.com
2. Create a new project
3. Get your connection string from Settings > Database
4. It will look like: `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres`

**Railway (Free trial):**

1. Go to https://railway.app
2. New Project > PostgreSQL
3. Copy the connection string

### 2. Create .env file

Create a `.env` file in the project root:

```env
# Database (choose one of the options above)
DATABASE_URL="your_database_connection_string"

# NextAuth - Generate secret with:
# openssl rand -base64 32
NEXTAUTH_SECRET="paste_generated_secret_here"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (optional for now)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email (optional for now)
RESEND_API_KEY="re_..."
```

### 3. Run migrations

```bash
# This will create all tables in your database
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 4. Seed the database (optional)

Create a file `prisma/seed.ts` or add seed data manually:

```bash
# Run seed if you create seed.ts
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

## 📝 Manual Database Setup

If you want to add initial data manually, here's SQL for basic setup:

### Create Locations

```sql
INSERT INTO "Location" (id, name, address, "createdAt") VALUES
('loc1', 'PTS SUHO SQUARE', 'Suho square, Port Said', NOW()),
('loc2', 'PTS Helnan Portfouad', 'Helnan, Port Fouad', NOW()),
('loc3', 'Padel Up', 'Nouras Resort, Port Said', NOW());
```

### Create Courts

```sql
INSERT INTO "Court" (id, name, type, "pricePerHour", "locationId") VALUES
('court1', 'Court 1', 'Premium Glass Court', 250, 'loc1'),
('court2', 'Court 2', 'Premium Glass Court', 250, 'loc1'),
('court3', 'Court A', 'Premium Glass Court', 250, 'loc2'),
('court4', 'Court B', 'Premium Glass Court', 250, 'loc2'),
('court5', 'Court 1', 'Premium Glass Court', 250, 'loc3'),
('court6', 'Court 2', 'Premium Glass Court', 250, 'loc3');
```

### Create Coaches

```sql
INSERT INTO "Coach" (id, name, specialization, experience, bio, "pricePerHour", image, rating) VALUES
('coach1', 'Mostafa Tamer', 'Professional Padel Coach', '8 years', 'Bio here', 350, '/images/mostafa-tamer.jpg', 4.9),
('coach2', 'Salah Tawfik', 'Youth Development Coach', '5 years', 'Bio here', 280, '/images/salah-tawfik.jpg', 4.8),
('coach3', 'Abdo Haridy', 'Advanced Technique Coach', '12 years', 'Bio here', 450, '/images/abdo-haridy.jpg', 5.0),
('coach4', 'Samaka', 'Fitness & Technique Coach', '6 years', 'Bio here', 320, '/images/samaka.jpg', 4.7);
```

## 🔧 Troubleshooting

### "Cannot find module '@prisma/client'"

```bash
npm install @prisma/client
npx prisma generate
```

### "No schema file found"

```bash
# Make sure you have prisma/schema.prisma file
ls prisma/schema.prisma
```

### Database connection error

- Check your DATABASE_URL in .env
- Make sure your database is running
- Check firewall settings if using cloud database

### Migration errors

```bash
# Reset database (WARNING: This deletes all data)
npx prisma migrate reset

# Or push schema without migrations (development only)
npx prisma db push
```

## ✅ Next Steps

Once your database is set up:

1. ✅ Database schema created
2. ✅ API routes created
3. ⏳ Connect booking page to real data
4. ⏳ Add authentication
5. ⏳ Add payment integration
6. ⏳ Add email notifications
