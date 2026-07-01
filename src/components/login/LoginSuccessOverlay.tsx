'use client'

import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface Props {
    open: boolean
}

export function LoginSuccessOverlay({ open }: Readonly<Props>) {
    const { t } = useI18n()

    if (!open) return null

    return (
        <motion.div
            data-testid="login-success-overlay"
            className="login-success-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="polite"
            aria-busy="true"
        >
            <div className="login-success-backdrop" aria-hidden />
            <motion.div
                className="login-success-card ofrenda-liquid-card"
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
                <div className="login-success-badge" aria-hidden>
                    <CheckCircle className="h-9 w-9 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="login-success-title" suppressHydrationWarning>
                    {t('login.success')}
                </h2>
                <p className="login-success-detail" suppressHydrationWarning>
                    {t('login.successDetail')}
                </p>
                <p className="login-success-redirect" suppressHydrationWarning>
                    {t('login.redirecting')}
                </p>
            </motion.div>
        </motion.div>
    )
}
