import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
    children: ReactNode
    className?: string
    variant?: 'glass' | 'solid'
    style?: React.CSSProperties
}

export function Card({ children, className, variant = 'glass', style }: CardProps) {
    const variants = {
        glass: 'glass',
        solid: 'bg-card border border-border',
    }

    return (
        <div className={cn('rounded-2xl p-3 md:p-4 lg:p-6', variants[variant], className)} style={style}>
            {children}
        </div>
    )
}

interface CardHeaderProps {
    children: ReactNode
    className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn('mb-4', className)}>
            {children}
        </div>
    )
}

interface CardTitleProps {
    children: ReactNode
    className?: string
    icon?: ReactNode
}

export function CardTitle({ children, className, icon }: CardTitleProps) {
    return (
        <h3 className={cn('text-xl font-semibold flex items-center gap-2', className)}>
            {icon}
            {children}
        </h3>
    )
}

interface CardContentProps {
    children: ReactNode
    className?: string
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn('space-y-4', className)}>
            {children}
        </div>
    )
}
