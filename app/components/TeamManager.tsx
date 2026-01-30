'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from './Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createUser, updateUser, deleteUser } from '@/app/actions'
import { useUser } from './UserContext'

export function TeamManager() {
    const { users } = useUser()
    const [open, setOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')

    const handleCreate = async () => {
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return
        await createUser({ name: newName, email: newEmail, password: newPassword })
        setNewName('')
        setNewEmail('')
        setNewPassword('')
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
                        <Button onClick={handleCreate} disabled={!newName || !newEmail || !newPassword}>Add Member</Button>
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
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(user.name)

    const handleSave = async () => {
        await updateUser(user.id, name)
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave}>
                    <Icon name="Check" className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)}>
                    <Icon name="X" className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 group">
            <span className="text-sm font-medium">{user.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                    <Icon name="Pencil" className="h-3.5 w-3.5 text-slate-500" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                        if (confirm(`Are you sure you want to remove ${user.name}?`)) {
                            deleteUser(user.id)
                        }
                    }}
                >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}
