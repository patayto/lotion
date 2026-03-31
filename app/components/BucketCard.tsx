'use client'

import { useState, useTransition, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Icon } from './Icon'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toggleTask, deleteTaskDefinition, assignBucket, deleteBucket, reorderTasks, getOrCreateAssignment } from '@/app/actions'
import { cn } from '@/lib/utils'
import { useUser } from './UserContext'
import { EditBucketTitle, EditTaskControls, AddTaskButton, useEditMode } from './EditComponents'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentUserRole } from './DashboardClientWrapper'

// Types
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
        completedBy?: { id: string; name: string } | null
    }[]
}

interface BucketCardProps {
    bucket: Bucket
    assignment: Assignment | null
    users: User[]
    bucketId: string
    missedTaskIds?: string[]
    date: string
    isReadOnly?: boolean
}

const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 border-blue-300',
    green: 'bg-green-100 border-green-300',
    pink: 'bg-pink-100 border-pink-300',
    purple: 'bg-purple-100 border-purple-300',
    orange: 'bg-orange-100 border-orange-300',
    teal: 'bg-teal-100 border-teal-300',
    yellow: 'bg-yellow-100 border-yellow-300',
    red: 'bg-red-100 border-red-300',
    gray: 'bg-gray-100 border-gray-300',
}

export function BucketCard({
    bucket,
    assignment,
    users,
    missedTaskIds = [],
    date,
    isReadOnly = false,
}: BucketCardProps) {
    const { currentUser } = useUser()
    const { isEditing } = useEditMode()
    const currentUserRole = useCurrentUserRole()
    const isAdmin = currentUserRole === 'ADMIN'

    const [isPending, startTransition] = useTransition()
    const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState(false)

    // Optimistic task completion state
    const [optimisticTasks, setOptimisticTasks] = useState<Map<string, boolean>>(new Map())
    const [optimisticAssignee, setOptimisticAssignee] = useState<User | null | undefined>(undefined)
    const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null)

    // Local task order for optimistic reordering
    const [localTasks, setLocalTasks] = useState<Task[]>(bucket.tasks)
    useEffect(() => { setLocalTasks(bucket.tasks) }, [bucket.tasks])

    // Delete bucket confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletePending, startDeleteTransition] = useTransition()

    // Reorder state
    const [reorderPending, startReorderTransition] = useTransition()

    const assignee = optimisticAssignee !== undefined ? optimisticAssignee : assignment?.user
    const isAssigned = !!assignee
    const baseColor = colorMap[bucket.color] || colorMap.gray

    function handleToggle(taskId: string, checked: boolean) {
        if (isReadOnly) return
        if (!currentUser) {
            alert('Please select a user first (top right)')
            return
        }
        if (loadingTaskId) return

        let supporterId: string | undefined = undefined
        if (assignee && currentUser.id !== assignee.id) {
            supporterId = currentUser.id
        }

        setOptimisticTasks(prev => new Map(prev).set(taskId, checked))
        setLoadingTaskId(taskId)

        startTransition(async () => {
            try {
                const assignmentId = assignment?.id ?? createdAssignmentId ?? await (async () => {
                    const id = await getOrCreateAssignment(bucket.id, date)
                    setCreatedAssignmentId(id)
                    return id
                })()
                await toggleTask(assignmentId, taskId, checked, supporterId)
            } catch (error) {
                console.error('Failed to toggle task:', error)
                setOptimisticTasks(prev => { const next = new Map(prev); next.delete(taskId); return next })
                alert('Failed to update task. Please try again.')
            } finally {
                setLoadingTaskId(null)
            }
        })
    }

    function handleUnassign() {
        if (isReadOnly || isAssigning) return
        setOptimisticAssignee(null)
        setIsAssigning(true)
        startTransition(async () => {
            try {
                await assignBucket(bucket.id, '', date)
            } catch (error) {
                console.error('Failed to unassign bucket:', error)
                setOptimisticAssignee(undefined)
                alert('Failed to unassign bucket. Please try again.')
            } finally {
                setIsAssigning(false)
            }
        })
    }

    function handleAssign(userId: string) {
        if (isReadOnly || isAssigning) return
        const newAssignee = userId === 'unassigned' ? null : users.find(u => u.id === userId) || null
        setOptimisticAssignee(newAssignee)
        setIsAssigning(true)
        startTransition(async () => {
            try {
                await assignBucket(bucket.id, userId === 'unassigned' ? '' : userId, date)
            } catch (error) {
                console.error('Failed to assign bucket:', error)
                setOptimisticAssignee(undefined)
                alert('Failed to assign bucket. Please try again.')
            } finally {
                setIsAssigning(false)
            }
        })
    }

    function moveTask(index: number, direction: -1 | 1) {
        const swapIndex = index + direction
        if (swapIndex < 0 || swapIndex >= localTasks.length || reorderPending) return

        const newTasks = [...localTasks]
        ;[newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]]
        setLocalTasks(newTasks)

        startReorderTransition(async () => {
            try {
                await reorderTasks(bucket.id, newTasks.map(t => t.id))
            } catch (error) {
                console.error('Failed to reorder tasks:', error)
                setLocalTasks(localTasks)
                alert('Failed to reorder tasks. Please try again.')
            }
        })
    }

    function handleDeleteBucket() {
        startDeleteTransition(async () => {
            try {
                await deleteBucket(bucket.id)
            } catch (error) {
                console.error('Failed to delete bucket:', error)
                setShowDeleteConfirm(false)
                alert('Failed to delete bucket. Please try again.')
            }
        })
    }

    return (
        <Card className={cn('h-full flex flex-col transition-all', baseColor, !isAssigned && 'opacity-70 border-dashed bg-gray-50')}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {bucket.icon && <Icon name={bucket.icon} className="h-5 w-5 text-primary shrink-0" />}
                        <CardTitle className="text-lg min-w-0">
                            <EditBucketTitle bucketId={bucket.id} currentTitle={bucket.title} />
                        </CardTitle>
                        {isReadOnly && (
                            <span className="text-xs text-slate-400 italic shrink-0">historical</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Delete bucket (admin only, edit mode) */}
                        {isEditing && !isReadOnly && isAdmin && (
                            showDeleteConfirm ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-6 w-6 text-red-600 hover:bg-red-50"
                                        onClick={handleDeleteBucket}
                                        disabled={deletePending}
                                        title="Confirm delete"
                                    >
                                        {deletePending
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : <Icon name="Check" className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={deletePending}
                                        title="Cancel"
                                    >
                                        <Icon name="X" className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    title="Delete bucket"
                                >
                                    <Icon name="Trash2" className="h-4 w-4" />
                                </Button>
                            )
                        )}

                        {/* Assignee display */}
                        {assignee ? (
                            <div className={cn('group flex items-center gap-1 text-sm text-muted-foreground', isAssigning && 'opacity-50')}>
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback>{assignee.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span>{assignee.name}</span>
                                {!isReadOnly && (
                                    isAssigning ? (
                                        <Loader2 className="h-3 w-3 animate-spin ml-1 text-muted-foreground" />
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUnassign() }}
                                            disabled={isAssigning}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 h-4 w-4 rounded-full hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Unassign"
                                        >
                                            <Icon name="X" className="h-3 w-3" />
                                        </button>
                                    )
                                )}
                            </div>
                        ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Unassigned</span>
                        )}

                        {/* Assignment select in edit mode */}
                        {isEditing && !isReadOnly && (
                            <div className="relative ml-1">
                                <Select
                                    value={assignment?.userId || 'unassigned'}
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
                                    <Loader2 className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-muted-foreground pointer-events-none" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <div className="space-y-3">
                    {localTasks.map((task, index) => {
                        const progress = assignment?.taskProgress.find(p => p.taskDefinitionId === task.id)
                        const serverIsDone = progress?.status === 'DONE'
                        const isDone = optimisticTasks.has(task.id) ? optimisticTasks.get(task.id)! : serverIsDone
                        const wasMissed = missedTaskIds.includes(task.id)
                        const isTaskLoading = loadingTaskId === task.id

                        return (
                            <div
                                key={task.id}
                                className={cn(
                                    'flex items-start gap-2 p-2 rounded transition-opacity',
                                    wasMissed && !isDone && 'bg-red-50 border border-red-100',
                                    isTaskLoading && 'opacity-50'
                                )}
                            >
                                {/* Reorder buttons (edit mode only) */}
                                {isEditing && !isReadOnly && (
                                    <div className="flex flex-col shrink-0 mt-0.5">
                                        <button
                                            disabled={index === 0 || reorderPending}
                                            onClick={() => moveTask(index, -1)}
                                            className="h-3.5 w-3.5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                            title="Move up"
                                        >
                                            <Icon name="ChevronUp" className="h-3 w-3" />
                                        </button>
                                        <button
                                            disabled={index === localTasks.length - 1 || reorderPending}
                                            onClick={() => moveTask(index, 1)}
                                            className="h-3.5 w-3.5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                            title="Move down"
                                        >
                                            <Icon name="ChevronDown" className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}

                                <div className="relative mt-1 shrink-0">
                                    <Checkbox
                                        id={task.id}
                                        checked={isDone}
                                        disabled={isReadOnly || isTaskLoading}
                                        onCheckedChange={(c) => handleToggle(task.id, c as boolean)}
                                    />
                                    {isTaskLoading && (
                                        <Loader2 className="absolute -right-4 top-0 h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                </div>

                                <div className="grid gap-0.5 w-full min-w-0">
                                    <EditTaskControls
                                        taskId={task.id}
                                        currentContent={task.content}
                                        onDelete={() => deleteTaskDefinition(task.id)}
                                    />
                                    {isDone && progress?.supportedByUserId && (
                                        <p className="text-xs text-muted-foreground">
                                            Supported by {users.find(u => u.id === progress.supportedByUserId)?.name || 'Unknown'}
                                        </p>
                                    )}
                                    {isDone && progress?.completedBy && (
                                        <p className="text-xs text-muted-foreground">
                                            Done by {progress.completedBy.name}
                                        </p>
                                    )}
                                </div>

                                {/* Reorder spinner (appears on the right when pending) */}
                                {isEditing && reorderPending && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0 mt-1" />
                                )}
                            </div>
                        )
                    })}
                    {!isReadOnly && <AddTaskButton bucketId={bucket.id} />}
                </div>
            </CardContent>
        </Card>
    )
}
