import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Notice: We cannot import prisma here because it doesn't run on the edge (yet/easily)
// So we will just define the providers configuration here for the middleware to use
// BUT verify password logic needs prisma... 
// actually middleware "authorize" is not called for session check, it verifies the session token.
// The `authorize` callback in Credentials provider is ONLY called on login.
// Login happens in Server Actions or API routes which CAN use Prisma.
// The middleware only verifies the JWT/Session.
// However, next-auth setup requires the config to be passed.
// For the Middleware to work on Edge, we typically separate the config that doesn't rely on ORM.

export const authConfig = {
    providers: [
        Credentials({
            // We only truly need the credentials provider definition here if we were doing login in middleware
            // But for simply verifying session, the strategy 'jwt' is key.
            // We'll leave the authorize logic empty here or stubbed?
            // Actually, for NextAuth v5, it's best to have a separate auth.config.ts 
            // that has the providers lists but maybe implementation that is edge safe?
            // Let's just put the simpler config here.
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname === '/'
            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // user is logged in, but trying to access something else?
                // allow them
                return true
            }
            return true
        },
    },
} satisfies NextAuthConfig
