/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 *
 * Invita a instalar la PWA. Coordinado con NotificationPrompt vía PromptsContext.
 *
 * Reglas:
 * - Fuente de verdad: standalone + getInstalledRelatedApps (no localStorage obsoleto)
 * - "Más tarde" / "Entendido": ocultar hasta recargar (sessionStorage)
 * - Cerrar (X): no mostrar durante REPROMPT_DAYS
 * - Android sin beforeinstallprompt: instrucciones del menú del navegador
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Plus, Share, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from './ui/Button'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { usePrompts } from '@/lib/PromptsContext'
import {
    ANDROID_FALLBACK_DELAY_MS,
    IOS_PROMPT_DELAY_MS,
    INSTALL_PROMPT_DELAY_MS,
    dismissInstallPromptForSession,
    dismissInstallPromptLongTerm,
    detectPlatform,
    isPwaStandalone,
    markPromptShownThisSession,
    markPwaInstalled,
    readInstallPromptStorage,
    shouldShowInstallPrompt,
    syncPwaInstalledStorage,
    type RelatedAppInstallState,
} from '@/lib/pwa-install-prompt'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)
    const [showManualInstall, setShowManualInstall] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [relatedAppInstalled, setRelatedAppInstalled] = useState<RelatedAppInstallState>(null)
    const [installCheckReady, setInstallCheckReady] = useState(false)
    const { isDark } = useTheme()
    const { t } = useI18n()
    const prompts = usePrompts()
    const showScheduledRef = useRef(false)

    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        return detectPlatform(window.navigator.userAgent)
    }, [])

    const isStandalone = useMemo(() => {
        if (typeof window === 'undefined') return false
        return isPwaStandalone(window)
    }, [])

    const canOfferInstallPrompt = useCallback(() => {
        if (typeof window === 'undefined') return false
        const storage = readInstallPromptStorage(window)
        return shouldShowInstallPrompt({
            isStandalone,
            relatedAppInstalled,
            sessionShown: storage.sessionShown,
            dismissedAt: storage.dismissedAt,
        })
    }, [isStandalone, relatedAppInstalled])

    const revealPrompt = useCallback(() => {
        if (!canOfferInstallPrompt() || showScheduledRef.current) return
        if (prompts?.activePrompt !== null && prompts.activePrompt !== 'install') return

        showScheduledRef.current = true
        markPromptShownThisSession(window)
        prompts?.setActivePrompt('install')
        setShowPrompt(true)
    }, [canOfferInstallPrompt, prompts])

    useEffect(() => {
        let cancelled = false

        void (async () => {
            const related = await syncPwaInstalledStorage(window)
            if (!cancelled) {
                setRelatedAppInstalled(related)
                setInstallCheckReady(true)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!installCheckReady || !canOfferInstallPrompt()) return

        let isMounted = true
        let showTimer: ReturnType<typeof setTimeout> | null = null
        let iosTimer: ReturnType<typeof setTimeout> | null = null
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            if (!isMounted) return
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowManualInstall(false)

            if (showTimer) clearTimeout(showTimer)
            showTimer = setTimeout(() => {
                if (isMounted) revealPrompt()
            }, INSTALL_PROMPT_DELAY_MS)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        if (platform?.name === 'ios') {
            iosTimer = setTimeout(() => {
                if (isMounted) revealPrompt()
            }, IOS_PROMPT_DELAY_MS)
        } else if (platform?.name === 'android' || platform?.name === 'other') {
            fallbackTimer = setTimeout(() => {
                if (!isMounted || showScheduledRef.current) return
                setShowManualInstall(true)
                revealPrompt()
            }, ANDROID_FALLBACK_DELAY_MS)
        }

        return () => {
            isMounted = false
            if (showTimer) clearTimeout(showTimer)
            if (iosTimer) clearTimeout(iosTimer)
            if (fallbackTimer) clearTimeout(fallbackTimer)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [installCheckReady, canOfferInstallPrompt, platform, revealPrompt])

    useEffect(() => {
        const handleAppInstalled = () => {
            markPwaInstalled(window)
            setRelatedAppInstalled(true)
            setShowPrompt(false)
            prompts?.onInstallPromptClosed()
        }

        window.addEventListener('appinstalled', handleAppInstalled)
        return () => window.removeEventListener('appinstalled', handleAppInstalled)
    }, [prompts])

    const handleInstall = async () => {
        if (platform?.name === 'ios') {
            setShowIOSInstructions(true)
            return
        }

        if (!deferredPrompt) {
            setShowManualInstall(true)
            return
        }

        try {
            await deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === 'accepted') {
                markPwaInstalled(window)
                setRelatedAppInstalled(true)
                setShowPrompt(false)
                prompts?.onInstallPromptClosed()
            }
        } catch (error) {
            console.error('Error durante instalación:', error)
            setShowManualInstall(true)
        }

        setDeferredPrompt(null)
    }

    const handleLater = () => {
        dismissInstallPromptForSession(window)
        setShowPrompt(false)
        setShowIOSInstructions(false)
        setShowManualInstall(false)
        prompts?.onInstallPromptClosed()
    }

    const handleDismissLongTerm = () => {
        dismissInstallPromptLongTerm(window)
        setShowPrompt(false)
        setShowIOSInstructions(false)
        setShowManualInstall(false)
        prompts?.onInstallPromptClosed()
    }

    if (!showPrompt) return null

    const manualInstallVisible = showManualInstall && !deferredPrompt && platform?.name !== 'ios'

    return (
        <AnimatePresence>
            <motion.div
                key="install-prompt-modal"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-4 left-3 right-3 z-50 md:left-auto md:right-6 md:w-[380px]"
                data-testid="pwa-install-prompt"
            >
                <div className={`relative overflow-hidden rounded-2xl border shadow-2xl ${isDark
                    ? 'bg-slate-900/95 backdrop-blur-xl border-slate-700/50'
                    : 'bg-white/95 backdrop-blur-xl border-slate-200'
                    }`}>
                    <button
                        onClick={handleDismissLongTerm}
                        className={`absolute top-3 right-3 p-1.5 rounded-full transition-all z-10 ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                        aria-label={t('common.close')}
                        data-testid="pwa-install-close"
                    >
                        <X size={18} />
                    </button>

                    {!showIOSInstructions && !manualInstallVisible ? (
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'
                                    }`}>
                                    <Image
                                        src="/icons/icon-192x192.png"
                                        alt="IDMJI Sabadell"
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'
                                        }`}>
                                        {t('pwa.installTitle')}
                                    </h4>
                                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                        {t('pwa.installDesc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <Button
                                    onClick={handleLater}
                                    variant="outline"
                                    className={`flex-1 h-11 rounded-xl font-medium ${isDark
                                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    data-testid="pwa-install-later"
                                >
                                    {t('pwa.later')}
                                </Button>
                                <Button
                                    onClick={handleInstall}
                                    className="flex-1 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                    data-testid="pwa-install-confirm"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {t('pwa.install')}
                                </Button>
                            </div>
                        </div>
                    ) : manualInstallVisible ? (
                        <div className="p-5">
                            <h4 className={`font-bold text-base text-center mb-3 ${isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                {t('pwa.manualTitle')}
                            </h4>
                            <p className={`text-sm text-center mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                {t('pwa.manualDesc')}
                            </p>
                            <ol className={`space-y-2 text-sm list-decimal list-inside ${isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                <li>{t('pwa.manualStep1')}</li>
                                <li>{t('pwa.manualStep2')}</li>
                            </ol>
                            <Button
                                onClick={handleLater}
                                className="w-full mt-5 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="pwa-manual-understood"
                            >
                                {t('pwa.understood')}
                            </Button>
                        </div>
                    ) : (
                        <div className="p-5">
                            <h4 className={`font-bold text-base text-center mb-4 ${isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                {t('pwa.iosTitle')}
                            </h4>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 text-center uppercase tracking-wider">
                                        {t('pwa.iosInAppWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                                        }`}>
                                        <Share className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {t('pwa.iosStep1')} <strong>{t('pwa.share')}</strong> {t('pwa.inSafari')}
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
                                            {t('pwa.iosStep2')} <strong>&quot;{t('pwa.addToHome')}&quot;</strong>
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
                                            {t('pwa.iosStep3')} <strong>&quot;{t('pwa.add')}&quot;</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleLater}
                                className="w-full mt-5 h-11 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid="pwa-ios-understood"
                            >
                                {t('pwa.understood')}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
