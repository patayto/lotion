# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- MANUAL -->
## Active Migration: Vercel Deployment

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
<!-- END MANUAL -->

<!-- MANUAL -->
## Observability & Tracing

**Status**: OpenTelemetry implemented for assignment operations, pending full coverage.

### Current Implementation
- Next.js instrumentation set up via native configuration and `instrumentation.ts` in root.
- Prisma query auto-tracing enabled via `previewFeatures = ["tracing"]`.
- The Next.js Otel integration exports traces to OTLP HTTP (`http://localhost:4318/v1/traces`) for Jaeger.
- A `jaegertracing/all-in-one:latest` Docker service was added to `docker-compose.yml` to view traces on `localhost:16686`.
- Target Operations explicitly instrumented with custom `@opentelemetry/api` active spans: `assignBucket`, `getDailyState`.

### Pending Tracing Tasks
- [ ] Instrument `toggleTask`
- [ ] Instrument `createBucket`, `updateBucket`, `deleteBucket`
- [ ] Instrument `createTaskDefinition`, `updateTaskDefinition`, `deleteTaskDefinition`
- [ ] Instrument `createUser`, `updateUser`, `deleteUser`
- [ ] Instrument `reorderTasks`
- [ ] Instrument `getTaskHistory`
- [ ] Instrument `getDatesWithData`, `getDailyReport`, `getOrCreateAssignment`
<!-- END MANUAL -->

---

<!-- AUTO-MANAGED: project-description -->
## Overview

**Daily Progress Tracker** — a Next.js 16 / React 19 application for teams to track daily task assignments across categorized buckets, assign tasks to team members, and monitor completion status.

**Stack**: Next.js 16, React 19, Prisma, PostgreSQL (migrating from SQLite), NextAuth.js v5, shadcn/ui, Tailwind CSS v4, TypeScript.
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
## Build & Development Commands

```bash
# Development
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Lint code

# Database
docker-compose up -d                      # Start local PostgreSQL
npx prisma migrate dev --name <name>      # Create and run a migration
npx prisma db push                        # Sync schema without migration files
npx prisma generate                       # Regenerate Prisma Client after schema changes
npx prisma db seed                        # Seed database with sample data
npx prisma studio                         # Open Prisma GUI

# Testing
npm test                                  # Run all tests (Vitest)
npm run test:watch                        # Run tests in watch mode
```

### Environment Variables

```bash
# Local development (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lotion_dev"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Production (Vercel)
DATABASE_URL="..."          # Auto-populated by Vercel Postgres
NEXTAUTH_SECRET="..."       # openssl rand -base64 32
NEXTAUTH_URL="https://your-app.vercel.app"
```

### Local Dev Setup

```bash
docker-compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
# Test credentials: alice@example.com / password123
```
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
## Architecture

### Directory Structure

```
lotion-react/
├── app/
│   ├── actions.ts              # All server actions (DB operations)
│   ├── page.tsx                # Main dashboard (Server Component)
│   ├── layout.tsx              # Root layout
│   ├── login/page.tsx          # Login page (email/password)
│   ├── api/auth/route.ts       # Legacy auth API (pre-migration)
│   ├── lib/auth-actions.ts     # Auth server actions
│   └── components/
│       ├── UserContext.tsx     # React Context for current user
│       ├── BucketCard.tsx      # Bucket tasks UI
│       ├── MorningHuddle.tsx   # Unassigned buckets view
│       ├── EditComponents.tsx  # Inline editing UI
│       ├── DateFilter.tsx      # Date navigation
│       ├── UserSwitcher.tsx    # User dropdown
│       ├── DailyReport.tsx     # Daily summary
│       ├── DashboardClientWrapper.tsx
│       └── TeamManager.tsx     # User management
├── components/ui/              # shadcn/ui components
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Utility functions
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Seed script
│   └── migrations/             # Migration files
├── auth.ts                     # NextAuth configuration
├── middleware.ts               # Auth middleware (session check)
├── docker-compose.yml          # Local PostgreSQL
└── next.config.ts
```

### Data Model

```
DailyLog (one per date)
  └── Assignment (DailyLog + Bucket + User)
        └── TaskProgress (task completion status)

Bucket (persistent categories)
  └── TaskDefinition (tasks within a bucket)
```

Key: each date auto-creates a `DailyLog` via `ensureDailyLog()`. Buckets are assigned to users per day through `Assignment`.

### Key Subsystems

**Server Actions** (`app/actions.ts`): All DB operations are Next.js Server Actions. `getDailyState(date)` is the main data-fetching function. Uses `revalidatePath('/')` after mutations.

**Auth** (`auth.ts` + `middleware.ts`): NextAuth.js v5, Credentials provider (email/password), JWT sessions, bcrypt password hashing. No self-registration — admin creates accounts.

**Client State** (`app/components/UserContext.tsx`): React Context for current user selection. Auto-selects first user on load.
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
## Code Conventions

- **Language**: TypeScript throughout; server action return types are inferred
- **Components**: Client Components marked with `'use client'`; Server Components fetch data and pass to client components
- **Rendering**: `export const dynamic = 'force-dynamic'` on main page for fresh data
- **Database**: Import Prisma client from `lib/prisma` (singleton) — never create new `PrismaClient()` instances
- **IDs**: `@default(cuid())` for string IDs in Prisma schema
- **Dates**: All dates stored as ISO strings (`YYYY-MM-DD`) in `DailyLog.date`
- **UI**: shadcn/ui components from `components/ui/`; Radix UI primitives; Lucide React icons
- **Testing**: Vitest for unit/integration tests; Mocks for Prisma and Auth are in `__tests__/`
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Detected Patterns

- **Server Action pattern**: All mutations in `app/actions.ts` call `revalidatePath('/')` after DB writes
- **Missed tasks**: Calculated by comparing yesterday's incomplete tasks — see `getDailyState()` lines ~64–84
- **Assignment guard**: A bucket must be assigned to a user before tasks can be tracked for that day
- **Prisma singleton**: `lib/prisma.ts` uses singleton to prevent connection exhaustion in serverless
- **Unique constraints**: `[dailyLogId, bucketId]` for assignments; `[assignmentId, taskDefinitionId]` for task progress

### Adding a New Bucket Field
1. Update `prisma/schema.prisma`
2. `npx prisma db push` + `npx prisma generate`
3. Update queries in `app/actions.ts`
4. Update UI in `BucketCard.tsx` or `EditComponents.tsx`
<!-- END AUTO-MANAGED -->

<!-- MANUAL -->
## Custom Notes

Add project-specific notes here. This section is never auto-modified.

### Important Reminders
- Use Prisma Studio (`npx prisma studio`) to inspect database state
- `app/api/auth/route.ts` is legacy passphrase auth — will be deleted post-migration
<!-- END MANUAL -->
