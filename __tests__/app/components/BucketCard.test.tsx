import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BucketCard } from '@/app/components/BucketCard'
import { useUser } from '@/app/components/UserContext'
import { useEditMode } from '@/app/components/EditComponents'
import { useCurrentUserRole } from '@/app/components/DashboardClientWrapper'
import * as actions from '@/app/actions'

// Mock context hooks
vi.mock('@/app/components/UserContext', () => ({
    useUser: vi.fn()
}))
vi.mock('@/app/components/EditComponents', () => ({
    EditBucketTitle: ({ currentTitle }: any) => <div>{currentTitle}</div>,
    EditTaskControls: ({ currentContent, onDelete }: any) => (
        <div>
            {currentContent}
            <button onClick={onDelete} data-testid="icon-Trash2">Delete</button>
        </div>
    ),
    AddTaskButton: () => <div>AddTaskButton</div>,
    useEditMode: vi.fn()
}))
vi.mock('@/app/components/DashboardClientWrapper', () => ({
    useCurrentUserRole: vi.fn()
}))

vi.mock('./Icon', () => ({
    Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />
}))

vi.mock('@/app/components/Icon', () => ({
    Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />
}))

// Mock server actions
vi.mock('@/app/actions', () => ({
    toggleTask: vi.fn(),
    deleteTaskDefinition: vi.fn(),
    assignBucket: vi.fn(),
    deleteBucket: vi.fn(),
    reorderTasks: vi.fn(),
    getOrCreateAssignment: vi.fn()
}))

describe('BucketCard', () => {
    const mockUser = { id: 'u1', name: 'Alice' }
    const mockBucket = {
        id: 'b1',
        title: 'Work',
        icon: 'Briefcase',
        color: 'blue',
        tasks: [{ id: 't1', content: 'Task 1' }]
    }
    const mockAssignment = {
        id: 'a1',
        userId: 'u1',
        user: mockUser,
        taskProgress: [{ taskDefinitionId: 't1', status: 'PENDING', supportedByUserId: null }]
    }

    beforeEach(() => {
        vi.clearAllMocks()
        ;(useUser as any).mockReturnValue({ currentUser: mockUser })
        ;(useEditMode as any).mockReturnValue({ isEditing: false })
        ;(useCurrentUserRole as any).mockReturnValue('MEMBER')
    })

    it('renders bucket title and tasks', () => {
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        expect(screen.getByText('Work')).toBeInTheDocument()
        expect(screen.getByText('Task 1')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('toggles task completion', async () => {
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)

        await waitFor(() => {
            expect(actions.toggleTask).toHaveBeenCalledWith('a1', 't1', true)
        })
    })

    it('shows unassigned state if no assignment', () => {
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={null} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        expect(screen.getByText('Unassigned')).toBeInTheDocument()
    })

    it('shows delete button in edit mode for admins', async () => {
        ;(useEditMode as any).mockReturnValue({ isEditing: true })
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')

        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )

        const deleteBtn = screen.getByTitle('Delete bucket')
        expect(deleteBtn).toBeInTheDocument()
        
        fireEvent.click(deleteBtn)
        expect(screen.getByText('Delete?')).toBeInTheDocument()
        
        const confirmBtn = screen.getByTitle('Confirm delete')
        fireEvent.click(confirmBtn)
        
        await waitFor(() => {
            expect(actions.deleteBucket).toHaveBeenCalledWith('b1')
        })
    })

    it('handles unassigning a bucket', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        const unassignBtn = screen.getByTitle('Unassign')
        fireEvent.click(unassignBtn)
        
        await waitFor(() => {
            expect(actions.assignBucket).toHaveBeenCalledWith('b1', '', '2024-01-01')
        })
    })

    it('handles assigning a bucket to a user', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        ;(useEditMode as any).mockReturnValue({ isEditing: true })
        const mockUsers = [mockUser, { id: 'u2', name: 'Bob' }]
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={null} 
                users={mockUsers} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        // In edit mode, we should have a Select
        const selectTrigger = screen.getByRole('combobox')
        expect(selectTrigger).toBeInTheDocument()
    })

    it('respects isReadOnly mode', () => {
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
                isReadOnly={true}
            />
        )
        
        const checkbox = screen.getByRole('checkbox')
        fireEvent.click(checkbox)
        
        expect(actions.toggleTask).not.toHaveBeenCalled()
    })

    it('handles task reordering', async () => {
        ;(useEditMode as any).mockReturnValue({ isEditing: true })
        const multiTaskBucket = {
            ...mockBucket,
            tasks: [
                { id: 't1', content: 'Task 1' },
                { id: 't2', content: 'Task 2' }
            ]
        }
        render(
            <BucketCard 
                bucket={multiTaskBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        // Find the down button for the first task
        // We'll use the icons we mocked
        const downBtns = screen.getAllByTestId('icon-ChevronDown')
        fireEvent.click(downBtns[0].closest('button')!)
        
        await waitFor(() => {
            expect(actions.reorderTasks).toHaveBeenCalledWith('b1', ['t2', 't1'])
        })
    })

    it('shows supportedBy information', () => {
        const supportedAssignment = {
            ...mockAssignment,
            taskProgress: [
                { taskDefinitionId: 't1', status: 'DONE', supportedByUserId: 'u2' }
            ]
        }
        const mockUsers = [mockUser, { id: 'u2', name: 'Bob' }]
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={supportedAssignment} 
                users={mockUsers} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        expect(screen.getByText('Supported by Bob')).toBeInTheDocument()
    })

    it('highlights missed tasks', () => {
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
                missedTaskIds={['t1']}
            />
        )
        // Check for specific class or just that it renders
        // The container should have bg-red-50
        const taskText = screen.getByText('Task 1')
        const taskRow = taskText.closest('.bg-red-50')
        expect(taskRow).toBeInTheDocument()
    })

    it('handles bucket deletion', async () => {
        ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
        ;(useEditMode as any).mockReturnValue({ isEditing: true })
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        // Find the Trash2 icon/button
        const deleteBtn = screen.getByTitle('Delete bucket')
        fireEvent.click(deleteBtn)
        
        // Should show "Delete?" text and confirm button
        expect(screen.getByText('Delete?')).toBeInTheDocument()
        fireEvent.click(screen.getByTitle('Confirm delete'))
        
        await waitFor(() => {
            expect(actions.deleteBucket).toHaveBeenCalledWith('b1')
        })
    })

    it('handles task deletion from card', async () => {
        ;(useEditMode as any).mockReturnValue({ isEditing: true })
        render(
            <BucketCard 
                bucket={mockBucket} 
                assignment={mockAssignment} 
                users={[mockUser]} 
                bucketId="b1" 
                date="2024-01-01" 
            />
        )
        
        // Find the trash icon for Task 1
        const trashBtn = screen.getByTestId('icon-Trash2')
        fireEvent.click(trashBtn)
        
        await waitFor(() => {
            expect(actions.deleteTaskDefinition).toHaveBeenCalledWith('t1')
        })
    })

    describe('error cases', () => {
        beforeEach(() => {
            vi.spyOn(window, 'alert').mockImplementation(() => {})
            vi.spyOn(console, 'error').mockImplementation(() => {})
        })

        it('handles toggle failure', async () => {
            ;(useUser as any).mockReturnValue({ currentUser: mockUser })
            ;(actions.toggleTask as any).mockRejectedValue(new Error('Fail'))
            render(
                <BucketCard 
                    bucket={mockBucket} 
                    assignment={mockAssignment} 
                    users={[mockUser]} 
                    bucketId="b1" 
                    date="2024-01-01" 
                />
            )
            
            fireEvent.click(screen.getByRole('checkbox'))
            
            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed'))
            })
        })

        it('handles assign failure', async () => {
            ;(actions.assignBucket as any).mockRejectedValue(new Error('Fail'))
            ;(useEditMode as any).mockReturnValue({ isEditing: true })
            render(
                <BucketCard 
                    bucket={mockBucket} 
                    assignment={mockAssignment} 
                    users={[mockUser]} 
                    bucketId="b1" 
                    date="2024-01-01" 
                />
            )
            
            // Trigger assignment change
            // ... need to interact with Select
        })

        it('handles move failure', async () => {
            ;(useEditMode as any).mockReturnValue({ isEditing: true })
            ;(actions.reorderTasks as any).mockRejectedValue(new Error('Fail'))
            const reorderBucket = {
                ...mockBucket,
                tasks: [{ id: 't1', content: 'Task 1' }, { id: 't2', content: 'Task 2' }]
            }
            render(
                <BucketCard 
                    bucket={reorderBucket} 
                    assignment={mockAssignment} 
                    users={[mockUser]} 
                    bucketId="b1" 
                    date="2024-01-01" 
                />
            )
            
            fireEvent.click(screen.getAllByTitle('Move down')[0])
            
            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('reorder'))
            })
        })

        it('handles delete bucket failure', async () => {
            ;(useCurrentUserRole as any).mockReturnValue('ADMIN')
            ;(useEditMode as any).mockReturnValue({ isEditing: true })
            ;(actions.deleteBucket as any).mockRejectedValue(new Error('Fail'))
            
            render(
                <BucketCard 
                    bucket={mockBucket} 
                    assignment={mockAssignment} 
                    users={[mockUser]} 
                    bucketId="b1" 
                    date="2024-01-01" 
                />
            )
            
            fireEvent.click(screen.getByTitle('Delete bucket'))
            fireEvent.click(screen.getByTitle('Confirm delete'))
            
            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('delete'))
            })
        })

        it('alerts if no user selected on toggle', () => {
            ;(useUser as any).mockReturnValue({ currentUser: null })
            render(
                <BucketCard 
                    bucket={mockBucket} 
                    assignment={mockAssignment} 
                    users={[mockUser]} 
                    bucketId="b1" 
                    date="2024-01-01" 
                />
            )
            
            fireEvent.click(screen.getByRole('checkbox'))
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('select a user'))
        })
    })
})
