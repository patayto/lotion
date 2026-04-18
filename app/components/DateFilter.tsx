'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export function DateFilter({ currentDate, datesWithData }: {
    currentDate: string
    datesWithData: string[]
}) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [isPending, startTransition] = React.useTransition()

    const [date, setDate] = React.useState<Date | undefined>(() => {
        if (!currentDate) return new Date()
        const [year, month, day] = currentDate.split('-').map(Number)
        return new Date(year, month - 1, day, 12, 0, 0)
    })

    React.useEffect(() => {
        if (!currentDate) return
        const [year, month, day] = currentDate.split('-').map(Number)
        setDate(new Date(year, month - 1, day, 12, 0, 0))
    }, [currentDate])

    const datesWithDataParsed = React.useMemo(
        () => datesWithData.map(d => {
            const [year, month, day] = d.split('-').map(Number)
            return new Date(year, month - 1, day, 12, 0, 0)
        }),
        [datesWithData]
    )

    const handleSelect = (newDate: Date | undefined) => {
        if (!newDate) return

        setDate(newDate)
        setOpen(false)

        const offset = newDate.getTimezoneOffset()
        const localDate = new Date(newDate.getTime() - (offset * 60 * 1000))
        const dateStr = localDate.toISOString().split('T')[0]

        startTransition(() => {
            router.push(`?date=${dateStr}`)
        })
    }

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={isPending}
                        className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        {isPending
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <CalendarIcon className="mr-2 h-4 w-4" />}
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        modifiers={{ hasData: datesWithDataParsed }}
                        modifiersClassNames={{ hasData: 'day-has-data' }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {isPending && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-slate-600">Loading {date ? format(date, 'MMM d, yyyy') : 'date'}…</p>
                </div>,
                document.body
            )}
        </>
    )
}
