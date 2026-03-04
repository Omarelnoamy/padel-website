#!/bin/bash

# Script to run database migrations for PadelPro

echo "🚀 Starting database setup..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with your DATABASE_URL first"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "DATABASE_URL=" .env; then
    echo "❌ Error: DATABASE_URL not found in .env file"
    exit 1
fi

# Check if DATABASE_URL still has placeholder
if grep -q "PASTE_YOUR_SUPABASE" .env; then
    echo "❌ Error: Please replace PASTE_YOUR_SUPABASE_CONNECTION_STRING_HERE with your actual Supabase connection string"
    echo ""
    echo "To get your connection string:"
    echo "1. Go to https://supabase.com/dashboard/project/_/settings/database"
    echo "2. Copy the connection string under 'Connection string' → 'URI'"
    echo "3. Paste it in .env file"
    exit 1
fi

echo "✅ .env file found"
echo ""

echo "📦 Running Prisma migrations..."
npx prisma migrate dev --name init

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations completed!"
    echo ""
    echo "📦 Generating Prisma Client..."
    npx prisma generate
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Database setup complete!"
        echo ""
        echo "Your tables have been created in Supabase!"
        echo ""
        echo "🚀 Next steps:"
        echo "1. Restart your dev server (Ctrl+C then 'npm run dev')"
        echo "2. Visit http://localhost:3000/register to test"
        echo ""
        echo "💡 To view your database:"
        echo "   npx prisma studio"
    else
        echo "❌ Error generating Prisma Client"
        exit 1
    fi
else
    echo "❌ Error running migrations"
    exit 1
fi

