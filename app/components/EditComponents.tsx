'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from './Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { updateBucket, createTaskDefinition, updateTaskDefinition, deleteTaskDefinition } from '@/app/actions'
import { useUser } from './UserContext'

// Simplified Edit Context or just prop drilling?
// Let's create an "EditContext" to toggle the mode globally? 
// Or just a simple state in the Page wrapper passed down?
// For now, let's create a "ManageButton" that toggles a global state in context?

import React, { createContext, useContext } from 'react'

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
    if (!context) throw new Error("useEditMode must be used within EditProvider")
    return context
}

export function EditToggle() {
    const { isEditing, toggleEditing } = useEditMode()
    return (
        <Button
            variant={isEditing ? "destructive" : "outline"}
            size="sm"
            onClick={toggleEditing}
            className="gap-2"
        >
            <Icon name={isEditing ? "X" : "Pencil"} className="h-4 w-4" />
            {isEditing ? "Done Editing" : "Manage"}
        </Button>
    )
}

// Sub-components for performing edits

export function EditBucketTitle({ bucketId, currentTitle }: { bucketId: string, currentTitle: string }) {
    const { isEditing } = useEditMode()
    const [title, setTitle] = useState(currentTitle)

    if (!isEditing) return <span className="text-lg font-semibold">{currentTitle}</span>

    return (
        <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            onBlur={() => updateBucket(bucketId, title)}
            className="h-7 text-lg font-semibold px-1 py-0 border-transparent hover:border-input focus:border-input bg-transparent"
        />
    )
}

export function EditTaskControls({ taskId, currentContent, onDelete }: { taskId: string, currentContent: string, onDelete: () => void }) {
    const { isEditing } = useEditMode()
    const [content, setContent] = useState(currentContent)

    if (!isEditing) return (
        <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
            {currentContent}
        </label>
    )

    return (
        <div className="flex items-center gap-1 w-full">
            <Input
                value={content}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
                onBlur={() => updateTaskDefinition(taskId, content)}
                className="h-6 text-sm px-1 py-0 bg-white/50"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
                <Icon name="Trash2" className="h-3 w-3" />
            </Button>
        </div>
    )
}

export function AddTaskButton({ bucketId }: { bucketId: string }) {
    const { isEditing } = useEditMode()
    if (!isEditing) return null

    return (
        <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground border-dashed border border-slate-300 hover:bg-white"
            onClick={async () => {
                const text = prompt("New Task Name:")
                if (text) await createTaskDefinition(bucketId, text)
            }}
        >
            + Add Task
        </Button>
    )
}
