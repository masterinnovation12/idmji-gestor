'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
        if (open) {
            const originalOverflow = document.body.style.overflow
            const originalHtmlOverflow = document.documentElement.style.overflow
            
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
            
            return () => {
                document.body.style.overflow = originalOverflow
                document.documentElement.style.overflow = originalHtmlOverflow
            }
        }
    }, [open])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
                    <DialogOverlay onClick={() => onOpenChange(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full max-w-lg z-[1000] relative"
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

function DialogOverlay({ onClick }: { onClick: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
            onClick={onClick}
        />
    )
}

export function DialogContent({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("relative w-full bg-background border border-border shadow-lg rounded-xl overflow-hidden", className)}>
            {children}
        </div>
    )
}

export function DialogHeader({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6", className)}>
            {children}
        </div>
    )
}

export function DialogFooter({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0 gap-2", className)}>
            {children}
        </div>
    )
}

export function DialogTitle({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
            {children}
        </h2>
    )
}

export function DialogDescription({ className, children }: { className?: string, children: React.ReactNode }) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    )
}
