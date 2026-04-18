import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditProvider, EditToggle, EditBucketTitle, EditTaskControls, AddBucketCard, useEditMode } from '@/app/components/EditComponents'
import * as actions from '@/app/actions'

vi.mock('@/app/actions', () => ({
    updateBucket: vi.fn(),
    createTaskDefinition: vi.fn(),
    updateTaskDefinition: vi.fn(),
    deleteTaskDefinition: vi.fn(),
    createBucket: vi.fn(),
}))

// Mock Icon using every possible way to ensure it's picked up
vi.mock('@/app/components/Icon', () => ({
    Icon: ({ name }: any) => <div data-testid={`icon-${name}`}>{name}</div>
}))

describe('EditComponents', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('EditProvider & EditToggle', () => {
        it('toggles editing state', () => {
            render(
                <EditProvider>
                    <EditToggle />
                </EditProvider>
            )
            
            const btn = screen.getByRole('button', { name: /Manage/i })
            fireEvent.click(btn)
            
            expect(screen.getByText(/Done Editing/i)).toBeInTheDocument()
            
            fireEvent.click(screen.getByText(/Done Editing/i))
            expect(screen.getByText(/Manage/i)).toBeInTheDocument()
        })
    })

    describe('EditBucketTitle', () => {
        it('renders text when not editing', () => {
            render(
                <EditProvider>
                     <EditBucketTitle bucketId="b1" currentTitle="Work" />
                </EditProvider>
            )
            expect(screen.getByText('Work')).toBeInTheDocument()
        })

        it('renders input and updates title on blur', async () => {
            render(
                <EditProvider>
                    <EditToggle />
                    <EditBucketTitle bucketId="b1" currentTitle="Work" />
                </EditProvider>
            )
            
            fireEvent.click(screen.getByText('Manage'))
            
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'New Work' } })
            fireEvent.blur(input)
            
            await waitFor(() => {
                expect(actions.updateBucket).toHaveBeenCalledWith('b1', 'New Work')
            })
        })
    })

    describe('EditTaskControls', () => {
        it('renders text when not editing', () => {
            render(
                <EditProvider>
                    <EditTaskControls taskId="t1" currentContent="Task 1" onDelete={() => {}} />
                </EditProvider>
            )
            expect(screen.getByText('Task 1')).toBeInTheDocument()
        })

        it('renders input when editing and updates task', async () => {
            render(
                <EditProvider>
                    <EditToggle />
                    <EditTaskControls taskId="t1" currentContent="Task 1" onDelete={() => {}} />
                </EditProvider>
            )
            
            fireEvent.click(screen.getByText('Manage'))
            
            const input = screen.getByRole('textbox')
            fireEvent.change(input, { target: { value: 'Updated Task' } })
            fireEvent.blur(input)
            
            await waitFor(() => {
                expect(actions.updateTaskDefinition).toHaveBeenCalledWith('t1', 'Updated Task')
            })
        })

        it('calls onDelete callback', async () => {
            const onDelete = vi.fn()
            // Ensure deleteTaskDefinition returns a promise
            ;(actions.deleteTaskDefinition as any).mockResolvedValue(true)
            
            render(
                <EditProvider>
                    <EditToggle />
                    <EditTaskControls taskId="t1" currentContent="Task 1" onDelete={onDelete} />
                </EditProvider>
            )
            fireEvent.click(screen.getByText('Manage'))
            
            // The trash button is the one with the trash icon
            // We'll search for the icon text if mock worked, or the icon itself
            const trashIcon = await screen.findByTestId(/icon-Trash2/i)
            fireEvent.click(trashIcon.closest('button')!)
            
            await waitFor(() => {
                expect(onDelete).toHaveBeenCalled()
            })
        })
    })

    describe('AddBucketCard', () => {
        it('renders and creates a bucket', async () => {
            render(
                <EditProvider>
                    <EditToggle />
                    <AddBucketCard />
                </EditProvider>
            )
            
            fireEvent.click(screen.getByText('Manage'))
            fireEvent.click(screen.getByText('Add Bucket'))
            
            fireEvent.change(screen.getByPlaceholderText('Bucket name'), { target: { value: 'New Bucket' } })
            fireEvent.click(screen.getByText('Create'))
            
            await waitFor(() => {
                expect(actions.createBucket).toHaveBeenCalledWith('New Bucket')
            })
        })

        it('supports keyboard interaction', async () => {
            render(
                <EditProvider>
                    <EditToggle />
                    <AddBucketCard />
                </EditProvider>
            )
            
            // Enter edit mode
            fireEvent.click(screen.getByText('Manage'))
            
            const addBtn = screen.getByText('Add Bucket').parentElement?.parentElement
            fireEvent.keyDown(addBtn!, { key: 'Enter' })
            
            expect(screen.getByPlaceholderText('Bucket name')).toBeInTheDocument()
            
            fireEvent.change(screen.getByPlaceholderText('Bucket name'), { target: { value: 'Enter Key' } })
            fireEvent.keyDown(screen.getByPlaceholderText('Bucket name'), { key: 'Enter' })
            
            await waitFor(() => {
                expect(actions.createBucket).toHaveBeenCalledWith('Enter Key')
            })
        })
    })
})
