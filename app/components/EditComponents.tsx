'use client'

import React, { createContext, useContext, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Icon } from './Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
    updateBucket,
    createTaskDefinition,
    updateTaskDefinition,
    deleteTaskDefinition,
    createBucket,
} from '@/app/actions'

// ─── Edit Context ─────────────────────────────────────────────────────────────

interface EditContextType {
    isEditing: boolean
    toggleEditing: () => void
}

const EditContext = createContext<EditContextType | undefined>(undefined)

export function EditProvider({ children }: { children: React.ReactNode }) {
    const [isEditing, setIsEditing] = useState(false)
    return (
        <EditContext.Provider value={{ isEditing, toggleEditing: () => setIsEditing(prev => !prev) }}>
            {children}
        </EditContext.Provider>
    )
}

export function useEditMode() {
    const context = useContext(EditContext)
    if (!context) throw new Error('useEditMode must be used within EditProvider')
    return context
}

// ─── EditToggle ───────────────────────────────────────────────────────────────

export function EditToggle() {
    const { isEditing, toggleEditing } = useEditMode()
    return (
        <Button
            variant={isEditing ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleEditing}
            className="gap-2"
        >
            <Icon name={isEditing ? 'X' : 'Pencil'} className="h-4 w-4" />
            {isEditing ? 'Done Editing' : 'Manage'}
        </Button>
    )
}

// ─── EditBucketTitle ──────────────────────────────────────────────────────────

export function EditBucketTitle({ bucketId, currentTitle }: { bucketId: string; currentTitle: string }) {
    const { isEditing } = useEditMode()
    const [title, setTitle] = useState(currentTitle)
    const [isPending, startTransition] = useTransition()

    if (!isEditing) return <span className="text-lg font-semibold">{currentTitle}</span>

    return (
        <div className="relative flex items-center">
            <Input
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onBlur={() => {
                    if (title.trim() && title !== currentTitle) {
                        startTransition(async () => { await updateBucket(bucketId, title.trim()) })
                    }
                }}
                disabled={isPending}
                className="h-7 text-lg font-semibold px-1 py-0 border-transparent hover:border-input focus:border-input bg-transparent pr-6"
            />
            {isPending && (
                <Loader2 className="absolute right-1 h-3 w-3 animate-spin text-muted-foreground" />
            )}
        </div>
    )
}

// ─── EditTaskControls ─────────────────────────────────────────────────────────

export function EditTaskControls({
    taskId,
    currentContent,
    onDelete,
}: {
    taskId: string
    currentContent: string
    onDelete: () => void
}) {
    const { isEditing } = useEditMode()
    const [content, setContent] = useState(currentContent)
    const [savePending, startSaveTransition] = useTransition()
    const [deletePending, startDeleteTransition] = useTransition()

    if (!isEditing)
        return (
            <label
                htmlFor={taskId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
                {currentContent}
            </label>
        )

    return (
        <div className="flex items-center gap-1 w-full">
            <div className="relative flex-1">
                <Input
                    value={content}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
                    onBlur={() => {
                        if (content.trim() && content !== currentContent) {
                            startSaveTransition(async () => {
                                await updateTaskDefinition(taskId, content.trim())
                            })
                        }
                    }}
                    disabled={savePending || deletePending}
                    className="h-6 text-sm px-1 py-0 bg-white/50 pr-6"
                />
                {savePending && (
                    <Loader2 className="absolute right-1 top-1 h-3 w-3 animate-spin text-muted-foreground" />
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                disabled={savePending || deletePending}
                onClick={() => {
                    startDeleteTransition(async () => {
                        await deleteTaskDefinition(taskId)
                        onDelete()
                    })
                }}
            >
                {deletePending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <Icon name="Trash2" className="h-3 w-3" />
                )}
            </Button>
        </div>
    )
}

// ─── AddTaskButton ────────────────────────────────────────────────────────────

export function AddTaskButton({ bucketId }: { bucketId: string }) {
    const { isEditing } = useEditMode()
    const [isPending, startTransition] = useTransition()

    if (!isEditing) return null

    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="w-full text-xs text-muted-foreground border-dashed border border-slate-300 hover:bg-white"
            onClick={() => {
                const text = prompt('New Task Name:')
                if (text?.trim()) {
                    startTransition(async () => {
                        await createTaskDefinition(bucketId, text.trim())
                    })
                }
            }}
        >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            + Add Task
        </Button>
    )
}

// ─── AddBucketCard ────────────────────────────────────────────────────────────

export function AddBucketCard() {
    const { isEditing } = useEditMode()
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [isPending, startTransition] = useTransition()

    if (!isEditing) return null

    function handleSubmit() {
        if (!title.trim() || isPending) return
        startTransition(async () => {
            await createBucket(title.trim())
            setTitle('')
            setOpen(false)
        })
    }

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(true)}
                onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
                className="cursor-pointer border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center min-h-[200px] hover:border-primary hover:bg-slate-50 transition-colors"
            >
                <div className="flex flex-col items-center gap-2 text-slate-400 hover:text-primary transition-colors">
                    <Icon name="Plus" className="h-8 w-8" />
                    <span className="text-sm font-medium">Add Bucket</span>
                </div>
            </div>

            <Dialog open={open} onOpenChange={(v) => { if (!isPending) { setOpen(v); if (!v) setTitle('') } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>New Bucket</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Bucket name"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        disabled={isPending}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setOpen(false); setTitle('') }} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
