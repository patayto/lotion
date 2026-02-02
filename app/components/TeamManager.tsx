'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from './Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createUser, updateUser, deleteUser } from '@/app/actions'
import { useUser } from './UserContext'
import { useCurrentUserRole } from './DashboardClientWrapper'

export function TeamManager() {
    const { users } = useUser()
    const currentUserRole = useCurrentUserRole()
    const [isPending, startTransition] = useTransition()
    const [open, setOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newRole, setNewRole] = useState<string>('MEMBER')
    const [error, setError] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    // Only show to admins
    if (currentUserRole !== 'ADMIN') {
        return null
    }

    const handleCreate = () => {
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return
        if (isCreating) return

        setIsCreating(true)
        startTransition(async () => {
            try {
                setError('')
                await createUser({ name: newName, email: newEmail, password: newPassword, role: newRole })
                setNewName('')
                setNewEmail('')
                setNewPassword('')
                setNewRole('MEMBER')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create user')
            } finally {
                setIsCreating(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-normal h-8">
                    <Icon name="Users" className="mr-2 h-4 w-4" />
                    Manage Team
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Team Members</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Input
                            placeholder="Name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <Input
                            placeholder="Email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <Input
                            placeholder="Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Select value={newRole} onValueChange={setNewRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MEMBER">Member</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={handleCreate} disabled={!newName || !newEmail || !newPassword || isCreating}>
                            {isCreating && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                            {isCreating ? 'Adding...' : 'Add Member'}
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 mt-4">
                        {users.map(user => (
                            <TeamMemberRow key={user.id} user={user} />
                        ))}
                        {users.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No team members yet.</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TeamMemberRow({ user }: { user: { id: string, name: string } }) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(user.name)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleSave = () => {
        if (isSaving) return
        setIsSaving(true)
        startTransition(async () => {
            await updateUser(user.id, name)
            setIsEditing(false)
            setIsSaving(false)
        })
    }

    const handleDelete = () => {
        if (isDeleting) return
        if (!confirm(`Are you sure you want to remove ${user.name}?`)) return

        setIsDeleting(true)
        startTransition(async () => {
            await deleteUser(user.id)
            setIsDeleting(false)
        })
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-sm"
                    disabled={isSaving}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Icon name="Loader2" className="h-4 w-4 animate-spin" /> : <Icon name="Check" className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <Icon name="X" className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className={`flex items-center justify-between p-2 rounded-md hover:bg-slate-50 group ${isDeleting ? 'opacity-50' : ''}`}>
            <span className="text-sm font-medium">{user.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isDeleting ? (
                    <Icon name="Loader2" className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)} disabled={isDeleting}>
                            <Icon name="Pencil" className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Icon name="Trash2" className="h-3.5 w-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
