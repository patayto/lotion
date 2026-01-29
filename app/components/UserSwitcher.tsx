'use client'

import { useUser } from './UserContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select'
import { TeamManager } from './TeamManager'

export function UserSwitcher() {
    const { currentUser, setCurrentUser, users } = useUser()

    if (!currentUser) return null

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">View as:</span>
            <Select value={currentUser.id} onValueChange={(val) => {
                const u = users.find(u => u.id === val)
                if (u) setCurrentUser(u)
            }}>
                <SelectTrigger className="w-[140px] h-8 text-sm bg-white">
                    <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                    {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                    <SelectSeparator />
                    <div className="p-1">
                        <TeamManager />
                    </div>
                </SelectContent>
            </Select>
        </div>
    )
}
