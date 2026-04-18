import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authenticate, logOut } from './auth-actions'
import { signIn, signOut } from '../../auth'
import { AuthError } from 'next-auth'

vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn()
    })),
    AuthError: class AuthError extends Error {
        constructor(public type: string) {
            super(type)
            this.name = 'AuthError'
        }
    }
}))

vi.mock('../../auth', () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
}))

describe('auth-actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('authenticate', () => {
        it('calls signIn with correct credentials', async () => {
            const formData = new FormData()
            formData.append('email', 'test@example.com')
            formData.append('password', 'password123')

            await authenticate(undefined, formData)

            expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
                email: 'test@example.com',
                password: 'password123',
            }))
        })

        it('returns error message on CredentialsSignin failure', async () => {
            const formData = new FormData()
            ;(signIn as any).mockRejectedValue(new AuthError('CredentialsSignin'))

            const result = await authenticate(undefined, formData)
            expect(result).toBe('Invalid credentials.')
        })

        it('returns generic error for other AuthErrors', async () => {
            const formData = new FormData()
            ;(signIn as any).mockRejectedValue(new AuthError('SomeOtherError'))

            const result = await authenticate(undefined, formData)
            expect(result).toBe('Something went wrong.')
        })

        it('rethrows non-AuthErrors', async () => {
            const formData = new FormData()
            const error = new Error('Network error')
            ;(signIn as any).mockRejectedValue(error)

            await expect(authenticate(undefined, formData)).rejects.toThrow('Network error')
        })
    })

    describe('logOut', () => {
        it('calls signOut and redirects to login', async () => {
            await logOut()
            expect(signOut).toHaveBeenCalledWith({ redirectTo: '/login' })
        })
    })
})
