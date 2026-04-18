import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFastSession } from '@/lib/fast-auth'
import * as jose from 'jose'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock jose
vi.mock('jose', async () => {
    const actual = await vi.importActual('jose')
    return {
        ...actual,
        hkdf: vi.fn(),
        jwtDecrypt: vi.fn(),
    }
})

describe('getFastSession', () => {
  const mockSecret = 'test-secret-32-chars-long-at-least!!'
  
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTH_SECRET = mockSecret
  })

  it('returns null if no token is present', async () => {
    const { cookies } = await import('next/headers')
    ;(cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue(undefined)
    })

    const session = await getFastSession()
    expect(session).toBeNull()
  })

  it('returns user session if valid token is provided', async () => {
    const { cookies } = await import('next/headers')
    ;(cookies as any).mockReturnValue({
      get: vi.fn().mockImplementation((name) => {
          if (name === 'authjs.session-token') return { value: 'valid-token' }
          return undefined
      })
    })

    // Mock jose.hkdf to return a dummy key
    ;(jose.hkdf as any).mockResolvedValue(new Uint8Array(32))
    
    // Mock jose.jwtDecrypt to return a valid payload
    ;(jose.jwtDecrypt as any).mockResolvedValue({
      payload: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600
      }
    })

    const session = await getFastSession()
    
    expect(session).not.toBeNull()
    expect(session?.user.id).toBe('user-123')
    expect(session?.user.role).toBe('ADMIN')
  })

  it('returns null if decryption fails', async () => {
    const { cookies } = await import('next/headers')
    ;(cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'invalid-token' })
    })

    ;(jose.hkdf as any).mockResolvedValue(new Uint8Array(32))
    ;(jose.jwtDecrypt as any).mockRejectedValue(new Error('Decryption failed'))

    const session = await getFastSession()
    expect(session).toBeNull()
  })
})
