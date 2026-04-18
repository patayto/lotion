import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UserProvider, useUser } from './UserContext'

const TestComponent = () => {
    const { currentUser, setCurrentUser, users } = useUser()
    return (
        <div>
            <span data-testid="user">{currentUser?.name || 'none'}</span>
            <span data-testid="user-count">{users.length}</span>
            <button onClick={() => setCurrentUser({ id: 'u1', name: 'Alice' })}>Set User</button>
        </div>
    )
}

describe('UserContext', () => {
    it('provides default null user', () => {
        render(
            <UserProvider initialUsers={[]}>
                <TestComponent />
            </UserProvider>
        )
        expect(screen.getByTestId('user')).toHaveTextContent('none')
    })

    it('updates user when setCurrentUser is called', () => {
        render(
            <UserProvider initialUsers={[]}>
                <TestComponent />
            </UserProvider>
        )
        
        act(() => {
            screen.getByText('Set User').click()
        })
        
        expect(screen.getByTestId('user')).toHaveTextContent('Alice')
    })

    it('uses initialUsers prop', () => {
        const users = [{ id: 'u1', name: 'Alice' }]
        render(
            <UserProvider initialUsers={users}>
                <TestComponent />
            </UserProvider>
        )
        expect(screen.getByTestId('user-count')).toHaveTextContent('1')
    })

    it('throws error when useUser is used outside provider', () => {
        // Suppress console.error for this test as it's expected to throw
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const ErrorComponent = () => {
            useUser()
            return null
        }
        
        expect(() => render(<ErrorComponent />)).toThrow('useUser must be used within a UserProvider')
        
        consoleSpy.mockRestore()
    })
})
