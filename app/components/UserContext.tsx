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

export function UserProvider({ children, initialUsers }: { children: React.ReactNode, initialUsers: User[] }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    // Default to first user for convenience if none selected, or let them pick
    useEffect(() => {
        if (initialUsers.length > 0 && !currentUser) {
            setCurrentUser(initialUsers[0])
        }
    }, [initialUsers, currentUser])

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
