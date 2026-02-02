import { Suspense } from 'react'
import { getDailyState } from '@/app/actions'
import { MorningHuddle } from './components/MorningHuddle'
import { BucketCard } from './components/BucketCard'
import { DashboardClientWrapper, HeaderUserAction } from './components/DashboardClientWrapper'
import { DateFilter } from './components/DateFilter'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = dateParam || today
  const state = await getDailyState(date)

  const { buckets, assignments, users, missedTaskIds, currentUserRole } = state

  // Identify unassigned buckets
  const unassigned = buckets.filter(b => {
    const assign = assignments.find(a => a.bucketId === b.id)
    return !assign || !assign.userId
  })

  // Group everything for render
  return (
    <DashboardClientWrapper users={users} currentUserRole={currentUserRole}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Daily Progress Tracker</h1>
            {date !== today && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                History: {date}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Suspense fallback={<div className="w-[200px] h-10 bg-slate-100 rounded" />}>
              <DateFilter currentDate={date} />
            </Suspense>
            <div className="text-sm text-slate-500 font-medium hidden md:block">
              {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <HeaderUserAction />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">

          {/* Only show Morning Huddle if it is today */}
          {date === today && unassigned.length > 0 && (
            <MorningHuddle unassignedBuckets={unassigned} users={users} date={today} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {buckets.map(bucket => {
              const assignment = assignments.find(a => a.bucketId === bucket.id) || null
              return (
                <BucketCard
                  key={bucket.id}
                  bucketId={bucket.id}
                  bucket={bucket}
                  assignment={assignment}
                  users={users}
                  missedTaskIds={missedTaskIds}
                  date={date}
                />
              )
            })}
          </div>
        </main>
      </div>
    </DashboardClientWrapper>
  )
}
