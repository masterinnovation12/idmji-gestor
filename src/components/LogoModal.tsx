/**
 * LogoModal - IDMJI Gestor de Púlpito
 *
 * Modal premium para ampliar el logo de la aplicación. Se activa al hacer
 * clic en cualquier instancia del logo en la app.
 *
 * Características:
 * - Logo dentro del marco dorado de marca (mismo lenguaje que splash/login)
 * - Entrada con spring + desenfoque progresivo, halo dorado pulsante
 * - Backdrop navy con blur premium
 * - Cierre con Escape, clic fuera o botón flotante
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import NextImage from 'next/image'
import { useEffect } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LOGO_BADGE_GOLD_GRADIENT } from '@/components/LogoBadge'

interface LogoModalProps {
    isOpen: boolean
    onClose: () => void
}

export function LogoModal({ isOpen, onClose }: LogoModalProps) {
    const { t } = useI18n()
    // Bloquear scroll cuando el modal está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // Cerrar con tecla Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop navy con tinte dorado radial */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9999] cursor-pointer backdrop-blur-xl"
                        style={{
                            background:
                                'radial-gradient(ellipse at center, rgba(184,150,74,0.14) 0%, rgba(11,18,48,0.88) 62%, rgba(7,11,32,0.95) 100%)',
                        }}
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.72, y: 28, filter: 'blur(12px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.86, y: 14, filter: 'blur(8px)' }}
                            transition={{ type: 'spring', damping: 22, stiffness: 260, mass: 0.9 }}
                            className="relative pointer-events-auto"
                        >
                            {/* Close Button */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ delay: 0.18 }}
                                onClick={onClose}
                                className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full bg-white dark:bg-zinc-900 shadow-2xl flex items-center justify-center text-gray-700 dark:text-white hover:bg-[#b8964a] hover:text-white transition-all duration-300 border-2 border-[rgba(184,150,74,0.45)]"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label={t('common.close')}
                            >
                                <X size={24} strokeWidth={3} />
                            </motion.button>

                            <div className="relative">
                                {/* Halo dorado pulsante */}
                                <motion.div
                                    aria-hidden
                                    className="absolute -inset-6 rounded-[2.5rem] pointer-events-none"
                                    style={{
                                        background:
                                            'radial-gradient(ellipse at center, rgba(212,184,106,0.4) 0%, rgba(184,150,74,0.14) 55%, transparent 75%)',
                                        filter: 'blur(26px)',
                                    }}
                                    animate={{ opacity: [0.55, 1, 0.55], scale: [0.96, 1.04, 0.96] }}
                                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                                />

                                {/* Aro dorado expansivo al abrir */}
                                <motion.div
                                    aria-hidden
                                    className="absolute inset-0 rounded-[2rem] border-2 border-[#d4b86a]/70 pointer-events-none"
                                    initial={{ opacity: 0.8, scale: 1 }}
                                    animate={{ opacity: 0, scale: 1.22 }}
                                    transition={{ duration: 1.1, ease: 'easeOut', delay: 0.12 }}
                                />

                                {/* Badge dorado con el logo */}
                                <motion.div
                                    className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-[2rem] p-3 sm:p-3.5 shadow-2xl overflow-hidden"
                                    style={{ background: LOGO_BADGE_GOLD_GRADIENT }}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                                >
                                    <div className="relative w-full h-full rounded-[1.45rem] bg-white overflow-hidden flex items-center justify-center">
                                        <NextImage
                                            src="/logo.jpg"
                                            alt="IDMJI"
                                            fill
                                            sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 384px"
                                            className="object-contain p-3"
                                            priority
                                        />
                                    </div>

                                    {/* Destello que recorre el badge */}
                                    <motion.div
                                        aria-hidden
                                        initial={{ x: '-130%' }}
                                        animate={{ x: '230%' }}
                                        transition={{
                                            duration: 1.6,
                                            repeat: Infinity,
                                            repeatDelay: 3.4,
                                            ease: 'easeInOut',
                                            delay: 0.5,
                                        }}
                                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none"
                                        style={{ transform: 'skewX(-20deg)' }}
                                    />
                                </motion.div>
                            </div>

                            {/* Info Text */}
                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 18 }}
                                transition={{ delay: 0.22, duration: 0.35, ease: 'easeOut' }}
                                className="mt-6 text-center"
                            >
                                <h2
                                    className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white mb-2"
                                    suppressHydrationWarning
                                >
                                    {t('common.appName')}
                                </h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: 0.34, duration: 0.3 }}
                                    className="text-sm font-bold text-[#e8d9a8]/85 uppercase tracking-[0.3em]"
                                    suppressHydrationWarning
                                >
                                    {t('common.appSubTitle')}
                                </motion.p>
                            </motion.div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
