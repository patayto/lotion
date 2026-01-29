'use client'

import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface IconProps {
    name: string
    className?: string
}

export function Icon({ name, className }: IconProps) {
    const IconComponent = (Icons as any)[name] as LucideIcon
    if (!IconComponent) {
        return null
    }
    return <IconComponent className={className} />
}
