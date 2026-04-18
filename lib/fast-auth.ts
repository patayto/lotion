import { cookies } from 'next/headers'
import * as jose from 'jose'

/**
 * A lightweight session verification utility that bypasses the full NextAuth stack.
 * Uses 'jose' to verify the JWT token directly from cookies in <10ms.
 */
export async function getFastSession() {
    const cookieStore = await cookies()
    
    // Check both standard and secure cookie names
    const token = 
        cookieStore.get('authjs.session-token')?.value || 
        cookieStore.get('__Secure-authjs.session-token')?.value ||
        cookieStore.get('next-auth.session-token')?.value ||
        cookieStore.get('__Secure-next-auth.session-token')?.value

    if (!token) return null

    const secret = process.env.AUTH_SECRET
    if (!secret) {
        console.error('AUTH_SECRET is not defined')
        return null
    }

    try {
        // NextAuth v5 uses HKDF to derive the encryption key from AUTH_SECRET
        const salt = ''
        const info = 'NextAuth.js Generated Encryption Key'
        const key = await jose.hkdf(
            'sha256',
            secret,
            salt,
            info,
            32
        )

        // Decrypt the JWE
        const { payload } = await jose.jwtDecrypt(token, key, {
            clockTolerance: 15, // Allow 15s clock skew
        })

        if (!payload || !payload.id) {
            return null
        }

        return {
            user: {
                id: payload.id as string,
                email: payload.email as string,
                name: payload.name as string,
                role: payload.role as string,
            },
            expires: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : null,
        }
    } catch (error) {
        // If decryption fails, the token is invalid or tampered with
        console.error('fastAuth decryption failed:', error)
        return null
    }
}
