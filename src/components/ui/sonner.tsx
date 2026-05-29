'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/lib/theme/ThemeProvider'

type ToasterProps = React.ComponentProps<typeof Sonner>

export function Toaster({ ...props }: ToasterProps) {
    const { isDark } = useTheme()

    return (
        <Sonner
            theme={isDark ? 'dark' : 'light'}
            className="toaster group pointer-events-none"
            closeButton
            toastOptions={{
                classNames: {
                    toast:
                        'pointer-events-auto group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton:
                        'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton:
                        'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                },
            }}
            {...props}
        />
    )
}
