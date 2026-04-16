'use client'

import { UserProvider } from './UserContext'
import { UserSwitcher } from './UserSwitcher'
import { EditProvider, EditToggle } from './EditComponents'
import { createContext, useContext } from 'react'

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
    return (
        <div className="flex items-center gap-2">
            <EditToggle />
            <UserSwitcher />
        </div>
    )
}
