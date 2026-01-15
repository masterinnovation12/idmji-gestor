'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'

interface BackButtonProps {
    /** Fallback URL if no history exists */
    fallbackUrl?: string
    /** Custom label (optional) */
    label?: string
    /** Additional CSS classes */
    className?: string
}

/**
 * BackButton - Unified back navigation component
 * 
 * Uses browser history to return to the actual previous page.
 * Falls back to a specified URL if history is empty.
 * 
 * @example
 * <BackButton fallbackUrl="/dashboard" />
 * <BackButton label="Volver al inicio" fallbackUrl="/dashboard" />
 */
export default function BackButton({
    fallbackUrl = '/dashboard',
    label,
    className = ''
}: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        // Check if there's history to go back to
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            router.push(fallbackUrl)
        }
    }

    return (
        <motion.button
            suppressHydrationWarning
            onClick={handleBack}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
                bg-muted/50 hover:bg-primary/10
                text-muted-foreground hover:text-primary 
                border border-border/50 hover:border-primary/30
                transition-all duration-200
                font-bold text-xs uppercase tracking-widest
                group shadow-sm hover:shadow-md
                ${className}`}
        >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {label && <span>{label}</span>}
        </motion.button>
    )
}
