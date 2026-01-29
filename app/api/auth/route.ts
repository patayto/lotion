import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    const body = await request.json()
    const { passphrase } = body

    const CORRECT_PASSPHRASE = process.env.TEAM_PASSPHRASE

    // Simple check
    if (passphrase === CORRECT_PASSPHRASE) {
        const cookieStore = await cookies()
        // Set a long-lived cookie
        cookieStore.set('team-auth', 'authenticated', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
        })

        return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid passphrase' }, { status: 401 })
}
