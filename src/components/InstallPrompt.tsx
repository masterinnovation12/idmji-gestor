/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente mejorado para invitar al usuario a instalar la PWA.
 * 
 * MEJORAS DE FRECUENCIA:
 * - Solo muestra UNA VEZ por sesión (sessionStorage)
 * - Si cierra el prompt, no vuelve a aparecer hasta próxima sesión
 * - Respeta 7 días si el usuario lo cierra explícitamente
 * - No aparece si ya está instalada la app
 * 
 * COMPATIBILIDAD:
 * - iOS 12+: Instrucciones manuales para "Añadir a pantalla de inicio"
 * - Android 14+: Usa beforeinstallprompt nativo con manifest mejorado
 * 
 * @author Antigravity AI
 * @date 2024-12-28
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Claves de localStorage para persistencia
const PROMPT_DISMISS_KEY = 'pwa_prompt_dismissed_at'
const PROMPT_INSTALLED_KEY = 'pwa_installed'

// Clave de sessionStorage para control de frecuencia dentro de la sesión
const SESSION_SHOWN_KEY = 'pwa_prompt_shown_this_session'

// Días para volver a mostrar después de cerrar explícitamente
const REPROMPT_DAYS = 14

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const { isDark } = useTheme()
    const { t } = useI18n()

    // Detectar plataforma
    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
        if (/android/.test(userAgent)) return 'android'
        return 'other'
    }, [])

    // Detectar si ya está en modo standalone
    const isStandalone = useMemo(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true
    }, [])

    // Función para verificar si debemos mostrar el prompt
    const shouldShowPrompt = useCallback(() => {
        if (typeof window === 'undefined') return false

        // Ya está en modo standalone (instalada)
        if (isStandalone) return false

        // Ya instaló la app
        const installed = localStorage.getItem(PROMPT_INSTALLED_KEY)
        if (installed === 'true') return false

        // YA SE MOSTRÓ EN ESTA SESIÓN - no volver a mostrar
        const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY)
        if (shownThisSession === 'true') return false

        // Verificar si cerró el prompt recientemente (localStorage)
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

            // Marcar como mostrado en esta sesión
            sessionStorage.setItem(SESSION_SHOWN_KEY, 'true')

            // Esperar un poco antes de mostrar para no interrumpir la carga inicial
            setTimeout(() => {
                setShowPrompt(true)
            }, 5000) // 5 segundos después del evento
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Para iOS, mostrar después de un tiempo prudencial
        if (platform === 'ios') {
            const timer = setTimeout(() => {
                // Solo mostrar si no se ha mostrado en esta sesión
                if (!sessionStorage.getItem(SESSION_SHOWN_KEY)) {
                    sessionStorage.setItem(SESSION_SHOWN_KEY, 'true')
                    setShowPrompt(true)
                }
            }, 10000) // 10 segundos para iOS

            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [platform, shouldShowPrompt])

    // Detectar si se instaló la app
    useEffect(() => {
        const handleAppInstalled = () => {
            localStorage.setItem(PROMPT_INSTALLED_KEY, 'true')
            setShowPrompt(false)
        }

        window.addEventListener('appinstalled', handleAppInstalled)
        return () => window.removeEventListener('appinstalled', handleAppInstalled)
    }, [])

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
        // Guardar timestamp de cierre para respetar los días de espera
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
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-4 left-3 right-3 z-50 md:left-auto md:right-6 md:w-[380px]"
            >
                <div className={`relative overflow-hidden rounded-2xl border shadow-2xl ${isDark
                    ? 'bg-slate-900/95 backdrop-blur-xl border-slate-700/50'
                    : 'bg-white/95 backdrop-blur-xl border-slate-200'
                    }`}>
                    {/* Close button */}
                    <button
                        onClick={closePrompt}
                        className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                        aria-label={t('common.close')}
                    >
                        <X size={18} />
                    </button>

                    {!showIOSInstructions ? (
                        // Prompt principal
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'
                                    }`}>
                                    <img
                                        src="/icons/icon-192x192.png"
                                        alt="IDMJI"
                                        className="w-10 h-10 rounded-lg"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/logo.jpg'
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'
                                        }`}>
                                        {t('pwa.installTitle') || '¿Instalar IDMJI Sabadell?'}
                                    </h4>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                        {t('pwa.installDesc') || 'Acceso rápido y offline desde tu dispositivo'}
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
                                    {t('pwa.later') || 'Ahora no'}
                                </Button>
                                <Button
                                    onClick={platform === 'ios' ? handleIOSConfirm : handleInstall}
                                    className="flex-1 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {t('pwa.install') || 'Instalar'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Instrucciones iOS mejoradas
                        <div className="p-5">
                            <h4 className={`font-bold text-base text-center mb-4 ${isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                {t('pwa.iosTitle') || 'Instalar en iPhone/iPad'}
                            </h4>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                                        }`}>
                                        <Share className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {t('pwa.iosStep1') || 'Pulsa el botón'} <strong>{t('pwa.share') || 'Compartir'}</strong> {t('pwa.inSafari') || 'en Safari'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                                        }`}>
                                        <Plus className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {t('pwa.iosStep2') || 'Selecciona'} <strong>&quot;{t('pwa.addToHome') || 'Añadir a pantalla de inicio'}&quot;</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-100'
                                        }`}>
                                        <Download className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {t('pwa.iosStep3') || 'Pulsa'} <strong>&quot;{t('pwa.add') || 'Añadir'}&quot;</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={closePrompt}
                                className="w-full mt-5 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {t('pwa.understood') || 'Entendido'}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
