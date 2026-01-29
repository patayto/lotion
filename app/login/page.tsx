'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
    const [passphrase, setPassphrase] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase }),
        })

        if (res.ok) {
            router.push('/')
            router.refresh()
        } else {
            setError('Incorrect passphrase')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm space-y-4 p-8 bg-white rounded-lg shadow border">
                <h1 className="text-2xl font-bold text-center text-slate-900">Team Access</h1>
                <p className="text-sm text-center text-slate-500">Please enter the team passphrase to continue.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="password"
                        placeholder="Passphrase"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                    />
                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    <Button type="submit" className="w-full">
                        Enter
                    </Button>
                </form>
            </div>
        </div>
    )
}
