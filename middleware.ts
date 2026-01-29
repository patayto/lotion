import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // If no passphrase is set (e.g. dev without env var), allow access or block?
    // User wanted "simple authorisation", assume env var presence is critical.
    // For local dev, we might want to default to allow if not set, or enforce.
    const PASSPHRASE = process.env.TEAM_PASSPHRASE

    // If we are already on the login page, allow
    if (request.nextUrl.pathname === '/login') {
        return NextResponse.next()
    }

    // Allow static assets, api routes usually need protection too but maybe not next internals
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.endsWith('.ico')
    ) {
        return NextResponse.next()
    }

    // Check for the "auth" cookie
    const authCookie = request.cookies.get('team-auth')

    if (authCookie?.value === 'authenticated') {
        return NextResponse.next()
    }

    // Redirect to login if not authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) -> actually we WANT to protect API routes
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
