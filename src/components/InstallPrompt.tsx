/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente mejorado para invitar al usuario a instalar la PWA.
 * - iOS: Muestra prompt simplificado con instrucciones manuales
 * - Android: Usa beforeinstallprompt nativo con re-prompt después de 7 días
 * 
 * @author Antigravity AI
 * @date 2024-12-28
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, ArrowUp } from 'lucide-react'
import { Button } from './ui/Button'
import { useTheme } from '@/lib/theme/ThemeProvider'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PROMPT_DISMISS_KEY = 'pwa_prompt_dismissed_at'
const PROMPT_INSTALLED_KEY = 'pwa_installed'
const REPROMPT_DAYS = 7

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const { isDark } = useTheme()

    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
        if (/android/.test(userAgent)) return 'android'
        return 'other'
    }, [])

    const isStandalone = useMemo(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true
    }, [])

    const shouldShowPrompt = useCallback(() => {
        if (typeof window === 'undefined') return false
        if (isStandalone) return false

        // Si ya instaló, no mostrar
        const installed = localStorage.getItem(PROMPT_INSTALLED_KEY)
        if (installed === 'true') return false

        // Verificar si cerró el prompt recientemente
        const dismissedAt = localStorage.getItem(PROMPT_DISMISS_KEY)
        if (dismissedAt) {
            const dismissDate = new Date(parseInt(dismissedAt))
            const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince < REPROMPT_DAYS) return false
        }

        return true
    }, [isStandalone])

    useEffect(() => {
        if (!shouldShowPrompt()) return

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Para iOS, mostrar después de 2 segundos
        if (platform === 'ios') {
            const timer = setTimeout(() => setShowPrompt(true), 2000)
            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [platform, shouldShowPrompt])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        try {
            await deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === 'accepted') {
                localStorage.setItem(PROMPT_INSTALLED_KEY, 'true')
                setShowPrompt(false)
            }
        } catch (error) {
            console.error('Error durante instalación:', error)
        }

        setDeferredPrompt(null)
    }

    const closePrompt = () => {
        setShowPrompt(false)
        setShowIOSInstructions(false)
        localStorage.setItem(PROMPT_DISMISS_KEY, Date.now().toString())
    }

    const handleIOSConfirm = () => {
        setShowIOSInstructions(true)
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-3 right-3 z-[9999] md:left-auto md:right-6 md:w-[380px]"
            >
                <div className={`relative overflow-hidden rounded-2xl border shadow-2xl ${isDark
                    ? 'bg-slate-900 border-slate-700'
                    : 'bg-white border-slate-200'
                    }`}>
                    {/* Close button */}
                    <button
                        onClick={closePrompt}
                        className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                    >
                        <X size={18} />
                    </button>

                    {!showIOSInstructions ? (
                        // Prompt principal simplificado
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'
                                    }`}>
                                    <img
                                        src="/icons/icon-192x192.png"
                                        alt="IDMJI"
                                        className="w-10 h-10 rounded-lg"
                                        onError={(e) => {
                                            // Fallback si no existe el icono
                                            (e.target as HTMLImageElement).src = '/logo.jpg'
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'
                                        }`}>
                                        ¿Instalar IDMJI Sabadell?
                                    </h4>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                        Acceso rápido desde tu pantalla de inicio
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <Button
                                    onClick={closePrompt}
                                    variant="outline"
                                    className={`flex-1 h-11 rounded-xl font-medium ${isDark
                                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={platform === 'ios' ? handleIOSConfirm : handleInstall}
                                    className="flex-1 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Instalar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Instrucciones iOS
                        <div className="p-5">
                            <h4 className={`font-bold text-base text-center mb-4 ${isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                Pasos para instalar en iPhone
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        1
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Pulsa el botón <strong>Compartir</strong>
                                        </p>
                                        <div className={`inline-flex items-center gap-1 mt-1 px-2 py-1 rounded text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            <Share className="w-3 h-3" />
                                            en la barra del navegador
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        2
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Selecciona <strong>&quot;Añadir a pantalla de inicio&quot;</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        3
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Pulsa <strong>&quot;Añadir&quot;</strong> en la esquina superior derecha
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={closePrompt}
                                className="w-full mt-5 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Entendido
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
