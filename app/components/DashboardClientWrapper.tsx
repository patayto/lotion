'use client'

import { UserProvider } from './UserContext'
import { UserSwitcher } from './UserSwitcher'
import { EditProvider, EditToggle } from './EditComponents'
import { createContext, useContext, useTransition } from 'react'
import { logOut } from '../lib/auth-actions'
import { Icon } from './Icon'

const CurrentUserRoleContext = createContext<string>('MEMBER')

export function useCurrentUserRole() {
    return useContext(CurrentUserRoleContext)
}

export function DashboardClientWrapper({
    children,
    users,
    currentUserRole,
    currentUserId
}: {
    children: React.ReactNode,
    users: any[],
    currentUserRole: string,
    currentUserId?: string
}) {
    return (
        <CurrentUserRoleContext.Provider value={currentUserRole}>
            <UserProvider initialUsers={users} currentUserId={currentUserId}>
                <EditProvider>
                    {children}
                </EditProvider>
            </UserProvider>
        </CurrentUserRoleContext.Provider>
    )
}

export function HeaderUserAction() {
    const [isPending, startTransition] = useTransition()
    
    return (
        <div className="flex items-center gap-2">
            <EditToggle />
            <UserSwitcher />
            <button
                onClick={() => startTransition(() => logOut())}
                disabled={isPending}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
                title="Log out"
            >
                <Icon name="LogOut" className="w-5 h-5" />
            </button>
        </div>
    )
}
