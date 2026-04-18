import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Icon } from './Icon'

describe('Icon', () => {
    it('renders a valid icon', () => {
        const { container } = render(<Icon name="Check" />)
        expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('returns null for an invalid icon name', () => {
        const { container } = render(<Icon name="NonExistentIcon" />)
        expect(container.firstChild).toBeNull()
    })
})
