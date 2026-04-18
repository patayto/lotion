import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TeamManager } from '@/app/components/TeamManager'
import { useCurrentUserRole } from '@/app/components/DashboardClientWrapper'
import { useUser } from '@/app/components/UserContext'
import * as actions from '@/app/actions'

vi.mock('@/app/components/DashboardClientWrapper', () => ({
    useCurrentUserRole: vi.fn()
}))

vi.mock('@/app/components/UserContext', () => ({
    useUser: vi.fn()
}))

vi.mock('@/app/components/Icon', () => ({
    Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />
}))

vi.mock('@/app/actions', () => ({
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn()
}))

describe('TeamManager', () => {
    const mockUsers = [
        { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'ADMIN' }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
        ;(useUser as any).mockReturnValue({ users: mockUsers })
    })

    it('renders admin-only message if not admin', () => {
        ;(useCurrentUserRole as any).mockReturnValue('MEMBER')
        render(<TeamManager />)
        expect(screen.queryByText('Manage Team')).not.toBeInTheDocument()
    })

    it('renders and opens drawer for admin', () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        render(<TeamManager />)
        const btn = screen.getByText('Manage Team')
        expect(btn).toBeInTheDocument()
        fireEvent.click(btn)
        expect(screen.getByText('Manage Team Members')).toBeInTheDocument()
    })

    it('calls createUser action', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        render(<TeamManager />)
        fireEvent.click(screen.getByText('Manage Team'))
        
        fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Bob' } })
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'bob@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
        
        fireEvent.click(screen.getByText('Add Member'))
        
        await waitFor(() => {
            expect(actions.createUser).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Bob',
                email: 'bob@example.com',
                password: 'password123',
                role: 'MEMBER'
            }))
        })
    })

    it('calls updateUser action', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        render(<TeamManager />)
        fireEvent.click(screen.getByText('Manage Team'))
        
        fireEvent.click(screen.getByTestId('icon-Pencil'))
        
        const input = screen.getByDisplayValue('Alice')
        fireEvent.change(input, { target: { value: 'Alice Smith' } })
        fireEvent.click(screen.getByTestId('icon-Check'))
        
        await waitFor(() => {
            expect(actions.updateUser).toHaveBeenCalledWith('u1', 'Alice Smith')
        })
    })

    it('calls deleteUser action', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        
        render(<TeamManager />)
        fireEvent.click(screen.getByText('Manage Team'))
        
        fireEvent.click(screen.getByTestId('icon-Trash2'))
        
        await waitFor(() => {
            expect(actions.deleteUser).toHaveBeenCalledWith('u1')
        })
    })
})
