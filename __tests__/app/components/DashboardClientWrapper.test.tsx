import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardClientWrapper, HeaderUserAction } from '@/app/components/DashboardClientWrapper'
import { logOut } from '@/app/lib/auth-actions'

vi.mock('@/app/lib/auth-actions', () => ({
    logOut: vi.fn()
}))

// We'll use the real providers but mock the inner components to simplify
vi.mock('./UserSwitcher', () => ({
    UserSwitcher: () => <div data-testid="user-switcher" />
}))

vi.mock('./EditComponents', () => ({
    // Use real providers but mock the UI parts
    EditProvider: ({ children }: any) => <div>{children}</div>,
    EditToggle: () => <div data-testid="edit-toggle" />,
    useEditMode: () => ({ isEditing: false })
}))

vi.mock('./Icon', () => ({
    Icon: () => <div data-testid="icon" />
}))

describe('DashboardClientWrapper', () => {
    it('renders children', () => {
        render(
            <DashboardClientWrapper users={[]} currentUserRole="ADMIN">
                <div data-testid="child">Child</div>
            </DashboardClientWrapper>
        )
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })
})

describe('HeaderUserAction', () => {
    it('calls logOut on click', () => {
        render(
            <DashboardClientWrapper users={[]} currentUserRole="ADMIN">
                <HeaderUserAction />
            </DashboardClientWrapper>
        )
        const logoutBtn = screen.getByTitle('Log out')
        fireEvent.click(logoutBtn)
        expect(logOut).toHaveBeenCalled()
    })
})
