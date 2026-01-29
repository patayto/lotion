'use client'

import { UserProvider } from './UserContext'
import { UserSwitcher } from './UserSwitcher'
import { EditProvider, EditToggle } from './EditComponents'

export function DashboardClientWrapper({
    children,
    users
}: {
    children: React.ReactNode,
    users: any[]
}) {
    return (
        <UserProvider initialUsers={users}>
            <EditProvider>
                {children}
            </EditProvider>
        </UserProvider>
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
