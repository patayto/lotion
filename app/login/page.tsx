'use client'

import { useActionState } from 'react'
import { authenticate } from '../lib/auth-actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm space-y-4 p-8 bg-white rounded-lg shadow border">
                <h1 className="text-2xl font-bold text-center text-slate-900">Sign In</h1>
                <p className="text-sm text-center text-slate-500">Enter your email and password to continue.</p>

                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="email"
                            name="email"
                            placeholder="Email"
                            required
                        />
                        <Input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            minLength={6}
                        />
                    </div>
                    {errorMessage && (
                        <p className="text-sm text-red-500 font-medium">{errorMessage}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Signing in...' : 'Sign in'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
