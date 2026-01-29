'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignBucket } from '@/app/actions'
import { Icon } from './Icon'

interface MorningHuddleProps {
    unassignedBuckets: any[] // Bucket[]
    users: any[] // User[]
    date: string
}

export function MorningHuddle({ unassignedBuckets, users, date }: MorningHuddleProps) {
    const [loading, setLoading] = useState(false)

    // We handle assignments one by one for simplicity in this MVP
    // or show a list of unassigned buckets with a dropdown next to each.

    return (
        <div className="mb-8">
            <Card className="bg-blue-50/50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon name="Sun" className="h-5 w-5 text-orange-500" />
                        Morning Huddle
                    </CardTitle>
                    <CardDescription>
                        Assign the following buckets to kick off the day.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {unassignedBuckets.map(bucket => (
                            <div key={bucket.id} className="bg-white p-3 rounded-md border flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2">
                                    {bucket.icon && <Icon name={bucket.icon} className="h-4 w-4 text-muted-foreground" />}
                                    <span className="font-medium text-sm">{bucket.title}</span>
                                </div>
                                <AssignmentDropdown bucketId={bucket.id} users={users} date={date} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function AssignmentDropdown({ bucketId, users, date }: { bucketId: string, users: any[], date: string }) {
    const [isPending, setIsPending] = useState(false)

    async function handleAssign(userId: string) {
        setIsPending(true)
        try {
            await assignBucket(bucketId, userId, date)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Select onValueChange={handleAssign} disabled={isPending}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
                {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
