import { describe, it, expect } from 'vitest'
import { authConfig } from './auth.config'

describe('auth.config', () => {
    describe('authorized callback', () => {
        const { authorized } = authConfig.callbacks as any

        it('returns false if not logged in and on dashboard', () => {
            const request = { nextUrl: { pathname: '/' } }
            const auth = { user: null }
            expect(authorized({ auth, request })).toBe(false)
        })

        it('returns true if logged in and on dashboard', () => {
            const request = { nextUrl: { pathname: '/' } }
            const auth = { user: { name: 'User' } }
            expect(authorized({ auth, request })).toBe(true)
        })

        it('returns true if not on dashboard even if not logged in', () => {
            const request = { nextUrl: { pathname: '/some-public-page' } }
            const auth = { user: null }
            expect(authorized({ auth, request })).toBe(true)
        })

        it('returns true if logged in and accessing non-dashboard page', () => {
            const request = { nextUrl: { pathname: '/login' } }
            const auth = { user: { name: 'User' } }
            expect(authorized({ auth, request })).toBe(true)
        })
    })
})
