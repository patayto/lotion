# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚧 ACTIVE MIGRATION: Vercel Deployment

**Status**: Migrating to production deployment on Vercel

**Plan file**: `/Users/filipe/.claude/plans/glittery-wondering-bentley.md`

### What's Changing

| Component | Before | After |
|-----------|--------|-------|
| Database | SQLite (local dev.db) | Vercel Postgres |
| Auth | Single team passphrase | Individual user logins (NextAuth.js) |
| User creation | N/A | Admin creates users with email/password |
| Hosting | Local only | Vercel |

### Migration Steps (15 total)
1. Export SQLite data
2. Update Prisma schema for PostgreSQL
3. Set up Docker PostgreSQL for local dev
4. Create data import script
5. Create Prisma client singleton
6. Install and configure NextAuth
7. Update middleware for NextAuth
8. Update login page (email/password)
9. Add auth checks to server actions
10. Update user management for passwords
11. Update seed script
12. Update build scripts for Vercel
13. Test locally end-to-end
14. Deploy to Vercel
15. Update documentation

### Key Files Being Modified
- `prisma/schema.prisma` - PostgreSQL provider, add email/password to User
- `middleware.ts` - NextAuth session check instead of passphrase cookie
- `app/actions.ts` - Prisma singleton import, auth checks
- `app/login/page.tsx` - Email/password form with NextAuth signIn
- `app/components/TeamManager.tsx` - Password field for user creation

### Key Files Being Created
- `auth.ts` - NextAuth configuration with Credentials provider
- `lib/prisma.ts` - Prisma client singleton
- `docker-compose.yml` - Local PostgreSQL
- `scripts/export-data.ts` - SQLite data export
- `scripts/import-data.ts` - PostgreSQL data import

### Dependencies Being Added
```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

---

## Project Overview

This is a **Daily Progress Tracker** application built with Next.js 16, React 19, Prisma, and PostgreSQL (migrating from SQLite). It allows teams to track daily task assignments across multiple "buckets" (categories), assign tasks to team members, and monitor completion status.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npx prisma generate          # Generate Prisma Client after schema changes
npx prisma db push          # Push schema changes to MongoDB
npx prisma studio           # Open Prisma Studio GUI
npx prisma db seed          # Seed the database with initial data
```

## Environment Setup

**Current (during migration)**:
```bash
# Local development with Docker PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lotion_dev"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Production (Vercel)**:
```bash
DATABASE_URL="..."                    # Auto-populated by Vercel Postgres
NEXTAUTH_SECRET="..."                 # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-app.vercel.app"
```

**Legacy (pre-migration)**:
```bash
DATABASE_URL="file:./dev.db"          # SQLite local database
TEAM_PASSPHRASE="your-passphrase"     # Simple auth (being replaced)
```

## Architecture Overview

### Data Model Flow

The app operates on a daily basis with this hierarchy:

1. **DailyLog** (one per date) → Contains **Assignments** for that day
2. **Bucket** (persistent categories like "Morning Routine", "Work Tasks") → Contains **TaskDefinitions**
3. **Assignment** (links DailyLog + Bucket + User) → Contains **TaskProgress** for each task
4. **TaskProgress** (tracks completion of individual tasks) → Can have a `supportedByUserId` when someone helps

Key relationships:
- Each date gets its own `DailyLog` (auto-created via `ensureDailyLog()`)
- Buckets are assigned to users per day through `Assignment`
- Task completion is tracked through `TaskProgress` records
- "Missed tasks" logic: checks yesterday's assignments for incomplete tasks

### Application Structure

**Server Actions** (`app/actions.ts`):
- All database operations are Next.js Server Actions
- Main function: `getDailyState(date)` - fetches all data needed for a given date
- Handles CRUD for assignments, tasks, users, and buckets
- Uses `revalidatePath('/')` after mutations to refresh UI

**Authentication** (post-migration: `auth.ts` + `middleware.ts`):
- NextAuth.js with Credentials provider (email/password)
- JWT session strategy
- Middleware uses NextAuth session check, redirects to `/login` if not authenticated
- Individual user authentication with hashed passwords (bcrypt)
- Admin creates user accounts (no self-registration)

**Legacy auth** (pre-migration):
- Simple cookie-based auth using `TEAM_PASSPHRASE` environment variable
- `app/api/auth/route.ts` - passphrase validation endpoint (will be deleted)

**Client State** (`app/components/UserContext.tsx`):
- React Context provides current user selection across the app
- User switching affects which tasks are shown/editable
- Auto-selects first user on load if none selected

**UI Components**:
- `BucketCard.tsx` - Displays a bucket's tasks with checkboxes and assignment controls
- `MorningHuddle.tsx` - Shows unassigned buckets at the start of the day
- `EditComponents.tsx` - Inline editing for buckets, tasks, and users
- `DateFilter.tsx` - Navigate between different dates
- `UserSwitcher.tsx` - Dropdown to change current user

### Key Technical Patterns

**Dynamic Rendering**:
- Main page uses `export const dynamic = 'force-dynamic'` to ensure fresh data
- Server Components fetch data, pass to Client Components for interactivity

**Prisma with PostgreSQL** (post-migration):
- Uses `@default(cuid())` for string IDs
- Standard PostgreSQL relational model
- Unique constraints: `[dailyLogId, bucketId]` for assignments, `[assignmentId, taskDefinitionId]` for progress

**Prisma Client Singleton** (`lib/prisma.ts`):
- Use singleton pattern to prevent connection exhaustion in serverless environment
- Import from `lib/prisma` instead of creating new `PrismaClient()` instances

**UI Library**:
- shadcn/ui components (Button, Card, Dialog, etc.) in `components/ui/`
- Radix UI primitives with Tailwind CSS styling
- Lucide React for icons

## Common Workflows

### Adding a new bucket field
1. Update `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Run `npx prisma generate`
4. Update relevant queries in `app/actions.ts`
5. Update UI in `BucketCard.tsx` or `EditComponents.tsx`

### Database schema changes (PostgreSQL)
- Use `npx prisma migrate dev --name <name>` for local development
- Use `npx prisma db push` for quick sync without migration files
- Migrations stored in `prisma/migrations/` directory
- Run `npx prisma generate` after schema changes to update client

### Local development setup (post-migration)
```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies and setup database
npm install
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

### Testing new features
- No test framework is currently configured
- Manual testing via `npm run dev` at http://localhost:3000
- Use Prisma Studio (`npx prisma studio`) to inspect database state
- Test credentials (after seeding): alice@example.com / password123

## Important Notes

- **Date handling**: All dates stored as ISO strings (`YYYY-MM-DD`) in the `DailyLog.date` field
- **Assignment logic**: A bucket must be assigned to a user before tasks can be tracked for that day
- **Missed tasks**: Calculated by comparing yesterday's incomplete tasks (see `getDailyState()` around line 64-84)
- **No TypeScript interfaces**: Server Action return types are inferred; add explicit types if needed
- **Seeding**: `prisma/seed.ts` creates sample buckets and users for development
