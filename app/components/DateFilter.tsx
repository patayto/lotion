'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export function DateFilter({ currentDate }: { currentDate: string }) {
    const router = useRouter()

    // Use the passed prop for the initial state to ensure server/client match
    const [date, setDate] = React.useState<Date | undefined>(
        currentDate ? new Date(currentDate) : new Date()
    )

    const handleSelect = (newDate: Date | undefined) => {
        // Only update if a date is actually selected
        if (!newDate) return

        setDate(newDate)

        // adjust to local YYYY-MM-DD to avoid timezone shifts when passing to URL
        const offset = newDate.getTimezoneOffset()
        const localDate = new Date(newDate.getTime() - (offset * 60 * 1000))
        const dateStr = localDate.toISOString().split('T')[0]

        router.push(`?date=${dateStr}`)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
