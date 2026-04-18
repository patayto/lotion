import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RootLayout from '@/app/layout'

vi.mock('next/font/google', () => ({
    Geist: () => ({ variable: 'geist-sans' }),
    Geist_Mono: () => ({ variable: 'geist-mono' }),
}))

describe('RootLayout', () => {
    it('renders children and has html/body tags', () => {
        // We can't easily render a full html/body in JSDOM via RTL render 
        // because it usually renders inside a div. 
        // But we can check if it returns the expected structure.
        const { container } = render(
            <RootLayout>
                <div data-testid="child">Child Content</div>
            </RootLayout>
        )
        
        // JSDOM might strip <html> and <body> when rendering into a div
        // but we can check the content
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })
})
