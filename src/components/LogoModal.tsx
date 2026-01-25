/**
 * LogoModal - IDMJI Gestor de Púlpito
 * 
 * Modal premium para ampliar el logo de la aplicación con animaciones fluidas.
 * Se activa al hacer clic en cualquier instancia del logo en la app.
 * 
 * Características:
 * - Animación de entrada/salida suave con Framer Motion
 * - Backdrop blur premium
 * - Botón de cierre flotante
 * - Responsive y accesible
 * 
 * @author Antigravity AI
 * @date 2026-01-25
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import NextImage from 'next/image'
import { useEffect } from 'react'

interface LogoModalProps {
    isOpen: boolean
    onClose: () => void
}

export function LogoModal({ isOpen, onClose }: LogoModalProps) {
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] cursor-pointer"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                            transition={{
                                type: 'spring',
                                damping: 25,
                                stiffness: 300,
                                mass: 0.8
                            }}
                            className="relative pointer-events-auto"
                            style={{ perspective: '1000px' }}
                        >
                            {/* Close Button */}
                            <motion.button
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ delay: 0.2 }}
                                onClick={onClose}
                                className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full bg-white dark:bg-zinc-900 shadow-2xl flex items-center justify-center text-gray-700 dark:text-white hover:bg-red-500 hover:text-white transition-all duration-300 border-2 border-white/20"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Cerrar"
                            >
                                <X size={24} strokeWidth={3} />
                            </motion.button>

                            {/* Logo Container with Glow Effect */}
                            <div className="relative">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-3xl rounded-3xl animate-pulse" />

                                {/* Logo Image */}
                                <motion.div
                                    className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20"
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                >
                                    <NextImage
                                        src="/logo.jpg"
                                        alt="IDMJI Logo"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </motion.div>

                                {/* Shine effect */}
                                <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '200%' }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 3,
                                        ease: 'easeInOut'
                                    }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                                    style={{ transform: 'skewX(-20deg)' }}
                                />
                            </div>

                            {/* Info Text */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ delay: 0.3 }}
                                className="mt-6 text-center"
                            >
                                <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                                    IDMJI Sabadell
                                </h2>
                                <p className="text-sm font-bold text-white/60 uppercase tracking-[0.3em]">
                                    Gestor de Púlpito
                                </p>
                            </motion.div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
