'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
    id: string
    name: string
}

interface UserContextType {
    currentUser: User | null
    setCurrentUser: (user: User | null) => void
    users: User[]
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children, initialUsers, currentUserId }: { children: React.ReactNode, initialUsers: User[], currentUserId?: string }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    // Default to the logged-in user, but fallback to first user if tracking missing
    useEffect(() => {
        if (initialUsers.length > 0 && !currentUser) {
            const defaultUser = currentUserId ? initialUsers.find(u => u.id === currentUserId) : null;
            setCurrentUser(defaultUser || initialUsers[0])
        }
    }, [initialUsers, currentUser, currentUserId])

    return (
        <UserContext.Provider value={{ currentUser, setCurrentUser, users: initialUsers }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}
