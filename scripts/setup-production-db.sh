1#!/bin/bash
# Script to set up production database (Supabase) from local machine

echo "🔧 Setting up Supabase database..."
echo ""
echo "⚠️  Make sure you have set SUPABASE_DATABASE_URL in your .env file"
echo ""
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.znznpcejidjdxdmnzecm:cebAykDvAxEjWgmE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.znznpcejidjdxdmnzecm:cebAykDvAxEjWgmE@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
SUPABASE_DATABASE_URL=$DIRECT_URL

# Check if SUPABASE_DATABASE_URL is set
if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ Error: SUPABASE_DATABASE_URL not set"
  echo "Add this to your .env file:"
  echo "SUPABASE_DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true'"
  exit 1
fi

# Run migrations
echo "📦 Running Prisma migrations..."
DATABASE_URL=$SUPABASE_DATABASE_URL npx prisma migrate deploy

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate

# Seed database
echo "🌱 Seeding database with initial user..."
DATABASE_URL=$SUPABASE_DATABASE_URL npx prisma db seed

echo ""
echo "✅ Database setup complete!"
echo "📝 Test credentials: alice@example.com / password123"
