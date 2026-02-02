'use client'

import { useState, useTransition } from 'react'
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
    const [isPending, startTransition] = useTransition()
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState(false)

    // Optimistic state: track task completion locally
    const [optimisticTasks, setOptimisticTasks] = useState<Map<string, boolean>>(new Map())
    const [optimisticAssignee, setOptimisticAssignee] = useState<User | null | undefined>(undefined)

    // Use optimistic assignee if available, otherwise use server state
    const assignee = optimisticAssignee !== undefined ? optimisticAssignee : assignment?.user
    const isAssigned = !!assignee

    const baseColor = colorMap[bucket.color] || colorMap.gray

    function handleToggle(taskId: string, checked: boolean) {
        if (!assignment) return
        if (!currentUser) {
            alert("Please select a user first (top right)")
            return
        }
        if (loadingTaskId) return // Prevent multiple clicks

        // Logic: If I am NOT the assignee, I am supporting
        let supporterId: string | undefined = undefined
        if (assignee && currentUser.id !== assignee.id) {
            supporterId = currentUser.id
        }

        // Optimistic update: immediately update UI
        setOptimisticTasks(prev => new Map(prev).set(taskId, checked))
        setLoadingTaskId(taskId)

        startTransition(async () => {
            try {
                await toggleTask(assignment.id, taskId, checked, supporterId)
                // Success: keep the optimistic state (it will sync with server on next render)
            } catch (error) {
                // Error: revert the optimistic update
                console.error('Failed to toggle task:', error)
                setOptimisticTasks(prev => {
                    const next = new Map(prev)
                    next.delete(taskId)
                    return next
                })
                alert('Failed to update task. Please try again.')
            } finally {
                setLoadingTaskId(null)
            }
        })
    }

    function handleUnassign() {
        if (isAssigning) return // Prevent multiple clicks

        // Optimistic update: immediately unassign
        setOptimisticAssignee(null)
        setIsAssigning(true)

        startTransition(async () => {
            try {
                await assignBucket(bucket.id, "", date)
                // Success: optimistic state will sync with server
            } catch (error) {
                // Error: revert to server state
                console.error('Failed to unassign bucket:', error)
                setOptimisticAssignee(undefined) // Reset to use server state
                alert('Failed to unassign bucket. Please try again.')
            } finally {
                setIsAssigning(false)
            }
        })
    }

    function handleAssign(userId: string) {
        if (isAssigning) return // Prevent multiple clicks

        // Optimistic update: immediately assign
        const newAssignee = userId === "unassigned"
            ? null
            : users.find(u => u.id === userId) || null
        setOptimisticAssignee(newAssignee)
        setIsAssigning(true)

        startTransition(async () => {
            try {
                await assignBucket(bucket.id, userId === "unassigned" ? "" : userId, date)
                // Success: optimistic state will sync with server
            } catch (error) {
                // Error: revert to server state
                console.error('Failed to assign bucket:', error)
                setOptimisticAssignee(undefined) // Reset to use server state
                alert('Failed to assign bucket. Please try again.')
            } finally {
                setIsAssigning(false)
            }
        })
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
                        <div className={cn("group flex items-center gap-1 text-sm text-muted-foreground", isAssigning && "opacity-50")}>
                            <Avatar className="h-6 w-6">
                                <AvatarFallback>{assignee.name.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span>{assignee.name}</span>
                            {isAssigning ? (
                                <Icon name="Loader2" className="h-3 w-3 animate-spin ml-1 text-muted-foreground" />
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnassign()
                                    }}
                                    disabled={isAssigning}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 h-4 w-4 rounded-full hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Unassign"
                                >
                                    <Icon name="X" className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Unassigned</span>
                    )}

                    {isEditing && (
                        <div className="absolute right-2 top-10 bg-white shadow-md rounded p-1 z-10">
                            <Select
                                value={assignment?.userId || "unassigned"}
                                onValueChange={handleAssign}
                                disabled={isAssigning}
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
                            {isAssigning && (
                                <Icon name="Loader2" className="absolute right-1 top-1 h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-3">
                    {bucket.tasks.map(task => {
                        const progress = assignment?.taskProgress.find(p => p.taskDefinitionId === task.id)
                        const serverIsDone = progress?.status === 'DONE'

                        // Use optimistic state if available, otherwise use server state
                        const isDone = optimisticTasks.has(task.id)
                            ? optimisticTasks.get(task.id)!
                            : serverIsDone

                        const wasMissed = missedTaskIds.includes(task.id)
                        const isTaskLoading = loadingTaskId === task.id

                        return (
                            <div key={task.id} className={cn("flex items-start gap-3 p-2 rounded transition-opacity", wasMissed && !isDone && "bg-red-50 border border-red-100", isTaskLoading && "opacity-50")}>
                                <div className="relative mt-1">
                                    <Checkbox
                                        id={task.id}
                                        checked={isDone}
                                        disabled={!isAssigned || isTaskLoading}
                                        onCheckedChange={(c) => handleToggle(task.id, c as boolean)}
                                    />
                                    {isTaskLoading && (
                                        <Icon name="Loader2" className="absolute -right-4 top-0 h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                </div>
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
