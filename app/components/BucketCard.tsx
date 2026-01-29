'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toggleTask, deleteTaskDefinition } from '@/app/actions'
import { cn } from '@/lib/utils'
import { useUser } from './UserContext'
import { EditBucketTitle, EditTaskControls, AddTaskButton, useEditMode } from './EditComponents'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assignBucket } from '@/app/actions'

// Types (simplified for props)
interface User {
    id: string
    name: string
}

interface Task {
    id: string
    content: string
}

interface Bucket {
    id: string
    title: string
    icon: string | null
    color: string
    tasks: Task[]
}

interface Assignment {
    id: string
    userId: string | null
    user?: User | null
    taskProgress: {
        taskDefinitionId: string
        status: string
        supportedByUserId: string | null
    }[]
}

interface BucketCardProps {
    bucket: Bucket
    assignment: Assignment | null
    users: User[]
    bucketId: string // redundant but clear
    missedTaskIds?: string[]
    date: string
}

// Color Logic
const colorMap: Record<string, string> = {
    blue: "bg-blue-100 border-blue-300",
    green: "bg-green-100 border-green-300",
    pink: "bg-pink-100 border-pink-300",
    purple: "bg-purple-100 border-purple-300",
    orange: "bg-orange-100 border-orange-300",
    teal: "bg-teal-100 border-teal-300",
    yellow: "bg-yellow-100 border-yellow-300",
    red: "bg-red-100 border-red-300",
    gray: "bg-gray-100 border-gray-300"
}

export function BucketCard({ bucket, assignment, users, missedTaskIds = [], date }: BucketCardProps) {
    const { currentUser } = useUser()
    const { isEditing } = useEditMode()
    // We can treat unassigned as a special state
    const isAssigned = !!assignment?.userId
    const assignee = assignment?.user

    const baseColor = colorMap[bucket.color] || colorMap.gray

    async function handleToggle(taskId: string, checked: boolean) {
        if (!assignment) return
        if (!currentUser) {
            alert("Please select a user first (top right)")
            return
        }

        // Logic: If I am NOT the assignee, I am supporting
        let supporterId: string | undefined = undefined
        if (assignee && currentUser.id !== assignee.id) {
            supporterId = currentUser.id
        }

        await toggleTask(assignment.id, taskId, checked, supporterId)
    }

    return (
        <Card className={cn("h-full flex flex-col transition-all", baseColor, !isAssigned && "opacity-70 border-dashed bg-gray-50")}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {bucket.icon && <Icon name={bucket.icon} className="h-5 w-5 text-primary" />}
                        <CardTitle className="text-lg">
                            <EditBucketTitle bucketId={bucket.id} currentTitle={bucket.title} />
                        </CardTitle>
                    </div>
                    {assignee ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback>{assignee.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span>{assignee.name}</span>
                        </div>
                    ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Unassigned</span>
                    )}

                    {isEditing && (
                        <div className="absolute right-2 top-10 bg-white shadow-md rounded p-1 z-10">
                            <Select
                                value={assignment?.userId || "unassigned"}
                                onValueChange={(val) => assignBucket(bucket.id, val === "unassigned" ? "" : val, date)}
                            >
                                <SelectTrigger className="w-[120px] h-7 text-xs">
                                    <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-3">
                    {bucket.tasks.map(task => {
                        const progress = assignment?.taskProgress.find(p => p.taskDefinitionId === task.id)
                        const isDone = progress?.status === 'DONE'
                        const wasMissed = missedTaskIds.includes(task.id)

                        return (
                            <div key={task.id} className={cn("flex items-start gap-3 p-2 rounded", wasMissed && !isDone && "bg-red-50 border border-red-100")}>
                                <Checkbox
                                    id={task.id}
                                    checked={isDone}
                                    className="mt-1"
                                    disabled={!isAssigned} // Cannot check if unassigned?
                                    onCheckedChange={(c) => handleToggle(task.id, c as boolean)}
                                />
                                <div className="grid gap-0.5 w-full">
                                    <EditTaskControls
                                        taskId={task.id}
                                        currentContent={task.content}
                                        onDelete={() => deleteTaskDefinition(task.id)}
                                    />
                                    {/* Support Logic Placeholder - could add a small 'Supported by' button/badge */}
                                    {isDone && progress?.supportedByUserId && (
                                        <p className="text-xs text-muted-foreground">
                                            Supported by {users.find(u => u.id === progress.supportedByUserId)?.name || 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    <AddTaskButton bucketId={bucket.id} />
                </div>
            </CardContent>
        </Card>
    )
}
