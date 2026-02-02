import NextAuth from "next-auth"
import { prisma } from "./lib/prisma"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials)

                if (!parsedCredentials.success) {
                    return null
                }

                const { email, password } = parsedCredentials.data
                const user = await prisma.user.findUnique({ where: { email } })

                if (!user || !user.password) {
                    return null
                }

                const passwordsMatch = await bcrypt.compare(password, user.password)

                if (passwordsMatch) {
                    return user
                }

                return null
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Add user data to token on signin
            if (user) {
                token.id = user.id
                token.email = user.email
                token.name = user.name
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            // Add user data from token to session
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.user.name = token.name as string
                session.user.role = token.role as string
            }
            return session
        },
    },
})
