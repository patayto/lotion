import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserSwitcher } from '@/app/components/UserSwitcher'
import { useUser } from '@/app/components/UserContext'

vi.mock('@/app/components/UserContext', () => ({
    useUser: vi.fn()
}))

vi.mock('@/app/components/TeamManager', () => ({
    TeamManager: () => <div data-testid="team-manager">TeamManager</div>
}))

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, value }: any) => (
        <select data-testid="user-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
            {children}
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectSeparator: () => <hr />
}))

describe('UserSwitcher', () => {
    const mockSetCurrentUser = vi.fn()
    const mockUsers = [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders null if no current user', () => {
        ;(useUser as any).mockReturnValue({
            currentUser: null,
            setCurrentUser: mockSetCurrentUser,
            users: mockUsers
        })
        const { container } = render(<UserSwitcher />)
        expect(container).toBeEmptyDOMElement()
    })

    it('renders select with current user and handles change', () => {
        ;(useUser as any).mockReturnValue({
            currentUser: mockUsers[0],
            setCurrentUser: mockSetCurrentUser,
            users: mockUsers
        })
        
        render(<UserSwitcher />)
        expect(screen.getByText('View as:')).toBeInTheDocument()
        
        const select = screen.getByTestId('user-select')
        expect(select).toHaveValue('u1')
        
        fireEvent.change(select, { target: { value: 'u2' } })
        expect(mockSetCurrentUser).toHaveBeenCalledWith(mockUsers[1])
    })

    it('does not call setCurrentUser if user not found', () => {
        ;(useUser as any).mockReturnValue({
            currentUser: mockUsers[0],
            setCurrentUser: mockSetCurrentUser,
            users: mockUsers
        })
        
        render(<UserSwitcher />)
        const select = screen.getByTestId('user-select')
        
        fireEvent.change(select, { target: { value: 'unknown' } })
        expect(mockSetCurrentUser).not.toHaveBeenCalled()
    })
})
