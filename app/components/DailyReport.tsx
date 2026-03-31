'use client'

import { useState } from 'react'
import { FileText, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { getDailyReport } from '@/app/actions'
import { Icon } from './Icon'

// Mirror the return type from actions.ts (kept in sync manually)
type ReportData = Awaited<ReturnType<typeof getDailyReport>>

// ─── CSV helpers ────────────────────────────────────────────────────────────

function generateCSV(report: ReportData): string {
    const rows: string[][] = [
        ['Date', 'Bucket', 'Assigned To', 'Task', 'Status', 'Completed By', 'Completed At', 'Supported By'],
    ]
    for (const a of report.assignments) {
        for (const t of a.completed) {
            rows.push([
                report.date,
                a.bucket.title,
                a.user.name,
                t.content,
                'Completed',
                t.completedBy?.name ?? a.user.name,
                t.completedAt ? new Date(t.completedAt).toLocaleString() : '',
                t.supportedBy?.name ?? '',
            ])
        }
        for (const t of a.outstanding) {
            rows.push([report.date, a.bucket.title, a.user.name, t.content, 'Outstanding', '', '', ''])
        }
    }
    for (const b of report.unassignedBuckets) {
        rows.push([report.date, b.title, 'Unassigned', `(${b.taskCount} tasks)`, 'Unassigned', '', '', ''])
    }
    return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col items-center border rounded-lg px-4 py-3 min-w-[100px]">
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            <span className="text-xs text-muted-foreground mt-0.5 text-center">{label}</span>
        </div>
    )
}

function ReportBody({ report }: { report: ReportData }) {
    const { summary, assignments, unassignedBuckets } = report

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <SummaryCard
                    label="Total Buckets"
                    value={`${summary.assignedBuckets} / ${summary.totalBuckets}`}
                />
                <SummaryCard
                    label="Tasks Completed"
                    value={`${summary.completedTasks} / ${summary.totalTasks}`}
                />
                <SummaryCard label="Outstanding" value={summary.outstandingTasks} />
                <SummaryCard label="Completion" value={`${summary.completionPercent}%`} />
            </div>

            {/* Assignments */}
            {assignments.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                        Assignments
                    </h3>
                    <div className="space-y-4">
                        {assignments.map((a, i) => (
                            <div key={i} className="border rounded-lg p-4 space-y-3">
                                {/* Bucket + assignee heading */}
                                <div className="flex items-center gap-2">
                                    {a.bucket.icon && (
                                        <Icon name={a.bucket.icon} className="h-4 w-4 text-slate-600" />
                                    )}
                                    <span className="font-semibold text-slate-800">{a.bucket.title}</span>
                                    <span className="text-muted-foreground text-sm">→ {a.user.name}</span>
                                </div>

                                {/* Task lists side by side */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Completed */}
                                    <div>
                                        <p className="text-xs font-medium text-green-700 mb-1.5">
                                            ✓ Completed ({a.completed.length})
                                        </p>
                                        {a.completed.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">None</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {a.completed.map(t => (
                                                    <li key={t.taskId} className="text-sm">
                                                        <span className="text-slate-700">{t.content}</span>
                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                                                            {t.completedBy && t.completedBy.id !== a.user.id && (
                                                                <span>by {t.completedBy.name}</span>
                                                            )}
                                                            {t.completedAt && (
                                                                <span>
                                                                    {new Date(t.completedAt).toLocaleTimeString([], {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                </span>
                                                            )}
                                                            {t.supportedBy && (
                                                                <span>supported by {t.supportedBy.name}</span>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Outstanding */}
                                    <div>
                                        <p className="text-xs font-medium text-amber-700 mb-1.5">
                                            ○ Outstanding ({a.outstanding.length})
                                        </p>
                                        {a.outstanding.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">All done!</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {a.outstanding.map(t => (
                                                    <li key={t.taskId} className="text-sm text-muted-foreground">
                                                        {t.content}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Unassigned buckets */}
            {unassignedBuckets.length > 0 && (
                <section>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Unassigned Buckets
                    </h3>
                    <ul className="space-y-1">
                        {unassignedBuckets.map(b => (
                            <li key={b.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                {b.icon && <Icon name={b.icon} className="h-4 w-4" />}
                                <span>{b.title}</span>
                                <span className="text-xs">({b.taskCount} tasks)</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

// ─── Main exported component ─────────────────────────────────────────────────

export function DailyReportButton({ date }: { date: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState<ReportData | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleOpen() {
        setOpen(true)
        if (report) return // already loaded — don't re-fetch
        setLoading(true)
        setError(null)
        try {
            const data = await getDailyReport(date)
            setReport(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load report')
        } finally {
            setLoading(false)
        }
    }

    function handleOpenChange(next: boolean) {
        setOpen(next)
        if (!next) {
            // Reset so that opening again for a different date re-fetches
            setReport(null)
            setError(null)
        }
    }

    const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <>
            <Button variant="outline" size="sm" onClick={handleOpen} disabled={loading}>
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
                {loading ? 'Generating…' : 'Daily Report'}
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Daily Report</DialogTitle>
                        <DialogDescription>{formattedDate}</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        {loading && (
                            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Generating report…</span>
                            </div>
                        )}
                        {error && (
                            <div className="text-sm text-red-600 py-4">Error: {error}</div>
                        )}
                        {report && !loading && <ReportBody report={report} />}
                    </div>

                    <DialogFooter>
                        {report && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const csv = generateCSV(report)
                                    downloadCSV(csv, `lotion-report-${report.date}.csv`)
                                }}
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenChange(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
