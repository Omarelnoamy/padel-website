#!/bin/bash

echo "🔍 Testing database connection..."
echo ""

# Test Prisma connection
npx prisma db push --skip-generate 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database connection successful!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npx prisma generate"
    echo "2. Restart your dev server: npm run dev"
else
    echo ""
    echo "❌ Database connection failed!"
    echo ""
    echo "Please check:"
    echo "1. Your DATABASE_URL in .env file is correct"
    echo "2. Your Supabase project is active (not paused)"
    echo "3. You're using Session mode or Direct connection (NOT Transaction mode)"
fi

