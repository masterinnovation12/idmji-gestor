/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 *
 * Banner de instalación PWA con la identidad navy + dorado (LogoBadge).
 *
 * Flujos por plataforma:
 * - Android/desktop Chrome: si hay beforeinstallprompt → diálogo nativo al
 *   pulsar Instalar (WebAPK real en la galería de apps).
 * - Android SIN beforeinstallprompt (típico justo tras desinstalar la WebAPK:
 *   Chrome tarda en refrescar su registro interno): fallback con instrucciones
 *   del menú ⋮ y pista para cerrar Chrome por completo.
 * - iOS/iPadOS: instrucciones Compartir → Añadir a pantalla de inicio (no
 *   existe beforeinstallprompt en Safari).
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Plus, Share, X, MoreVertical, RefreshCw } from 'lucide-react'
import { LogoBadge } from '@/components/LogoBadge'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { usePrompts } from '@/lib/PromptsContext'
import {
    ANDROID_MANUAL_FALLBACK_DELAY_MS,
    IOS_PROMPT_DELAY_MS,
    INSTALL_PROMPT_DELAY_MS,
    PWA_SW_READY_EVENT,
    dismissInstallPromptForSession,
    dismissInstallPromptLongTerm,
    detectPlatform,
    isPwaStandalone,
    markPromptShownThisSession,
    markPwaInstalled,
    readInstallPromptStorage,
    shouldShowInstallPrompt,
    shouldShowManualFallback,
    shouldUseNativeInstallFlow,
    syncPwaInstalledStorage,
    waitForInstallServiceWorker,
    type RelatedAppInstallState,
} from '@/lib/pwa-install-prompt'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PromptView = 'banner' | 'ios-steps' | 'android-manual'

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [view, setView] = useState<PromptView>('banner')
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [relatedAppInstalled, setRelatedAppInstalled] = useState<RelatedAppInstallState>(null)
    const [installCheckReady, setInstallCheckReady] = useState(false)
    const [swReady, setSwReady] = useState(false)
    const { t } = useI18n()
    const prompts = usePrompts()
    const showScheduledRef = useRef(false)
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
    const revealPromptRef = useRef<(mode?: PromptView) => void>(() => {})
    const installReadyRef = useRef(false)

    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        return detectPlatform(window.navigator.userAgent, window.navigator.maxTouchPoints ?? 0)
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

    const revealPrompt = useCallback((mode: PromptView = 'banner') => {
        if (!canOfferInstallPrompt() || showScheduledRef.current) return
        if (prompts && prompts.activePrompt !== null && prompts.activePrompt !== 'install') return

        if (mode === 'banner') {
            const isNativeFlow = platform && shouldUseNativeInstallFlow(platform.name)
            if (isNativeFlow && !deferredPromptRef.current) return
        }

        showScheduledRef.current = true
        markPromptShownThisSession(window)
        prompts?.setActivePrompt('install')
        setView(mode)
        setShowPrompt(true)
    }, [canOfferInstallPrompt, platform, prompts])

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
        if (typeof window === 'undefined') return

        const onSwReady = () => setSwReady(true)
        window.addEventListener(PWA_SW_READY_EVENT, onSwReady)

        void waitForInstallServiceWorker(window.navigator).then((ready) => {
            if (ready) setSwReady(true)
        })

        return () => window.removeEventListener(PWA_SW_READY_EVENT, onSwReady)
    }, [])

    // Refs con los valores vigentes para el listener siempre-activo de abajo.
    useEffect(() => {
        revealPromptRef.current = revealPrompt
    }, [revealPrompt])

    useEffect(() => {
        installReadyRef.current = installCheckReady && swReady
    }, [installCheckReady, swReady])

    // Captura de beforeinstallprompt SIEMPRE activa (independiente de las
    // guardas de visibilidad): si llega tarde con el fallback manual visible,
    // la vista se mejora al flujo nativo. Programa el banner en el momento de
    // capturar el evento; las guardas se aplican dentro de revealPrompt.
    useEffect(() => {
        if (typeof window === 'undefined') return

        let showTimer: ReturnType<typeof setTimeout> | null = null

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            const bip = e as BeforeInstallPromptEvent
            deferredPromptRef.current = bip
            setDeferredPrompt(bip)
            setView((current) => (current === 'android-manual' ? 'banner' : current))

            if (showTimer) clearTimeout(showTimer)
            showTimer = setTimeout(() => {
                if (installReadyRef.current) revealPromptRef.current('banner')
            }, INSTALL_PROMPT_DELAY_MS)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        return () => {
            if (showTimer) clearTimeout(showTimer)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    // Programación del banner (con guardas: instalada, standalone, sesión…).
    useEffect(() => {
        if (!installCheckReady || !swReady || !canOfferInstallPrompt()) return

        let isMounted = true
        let showTimer: ReturnType<typeof setTimeout> | null = null
        let iosTimer: ReturnType<typeof setTimeout> | null = null
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null

        if (deferredPrompt) {
            showTimer = setTimeout(() => {
                if (isMounted) revealPrompt('banner')
            }, INSTALL_PROMPT_DELAY_MS)
        }

        if (platform?.name === 'ios') {
            iosTimer = setTimeout(() => {
                if (isMounted) revealPrompt('banner')
            }, IOS_PROMPT_DELAY_MS)
        }

        if (platform?.name === 'android' && !deferredPrompt) {
            fallbackTimer = setTimeout(() => {
                if (!isMounted) return
                const showFallback = shouldShowManualFallback({
                    platform: platform.name,
                    hasDeferredPrompt: deferredPromptRef.current !== null,
                    isStandalone,
                    relatedAppInstalled,
                })
                if (showFallback) revealPrompt('android-manual')
            }, ANDROID_MANUAL_FALLBACK_DELAY_MS)
        }

        return () => {
            isMounted = false
            if (showTimer) clearTimeout(showTimer)
            if (iosTimer) clearTimeout(iosTimer)
            if (fallbackTimer) clearTimeout(fallbackTimer)
        }
    }, [installCheckReady, swReady, canOfferInstallPrompt, deferredPrompt, platform, isStandalone, relatedAppInstalled, revealPrompt])

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
            setView('ios-steps')
            return
        }

        if (!deferredPrompt) return

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
        }

        deferredPromptRef.current = null
        setDeferredPrompt(null)
    }

    const handleLater = () => {
        dismissInstallPromptForSession(window)
        setShowPrompt(false)
        setView('banner')
        prompts?.onInstallPromptClosed()
    }

    const handleDismissLongTerm = () => {
        dismissInstallPromptLongTerm(window)
        setShowPrompt(false)
        setView('banner')
        prompts?.onInstallPromptClosed()
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                key="install-prompt-modal"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-4 left-3 right-3 z-50 md:left-auto md:right-6 md:w-[390px]"
                data-testid="pwa-install-prompt"
            >
                <div className="relative overflow-hidden rounded-2xl border border-[rgba(184,150,74,0.45)] shadow-2xl bg-gradient-to-b from-[#1f2e85] via-[#1b2a72] to-[#151f5c] backdrop-blur-xl">
                    {/* Franja dorada superior de marca */}
                    <div
                        aria-hidden
                        className="h-1"
                        style={{ background: 'linear-gradient(90deg, #b68f2f 0%, #e3cc92 50%, #b68f2f 100%)' }}
                    />

                    <button
                        onClick={handleDismissLongTerm}
                        className="absolute top-4 right-3 p-1.5 rounded-full transition-all z-10 text-white/60 hover:text-white hover:bg-white/10"
                        aria-label={t('common.close')}
                        data-testid="pwa-install-close"
                    >
                        <X size={18} />
                    </button>

                    {view === 'banner' && (
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <LogoBadge size={56} />
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className="font-bold text-base text-white">
                                        {t('pwa.installTitle')}
                                    </h4>
                                    <p className="text-sm mt-1 text-[#c9d3ee]">
                                        {t('pwa.installDesc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={handleLater}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-white/85 border border-white/25 hover:bg-white/10 transition-colors"
                                    data-testid="pwa-install-later"
                                >
                                    {t('pwa.later')}
                                </button>
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all inline-flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                    data-testid="pwa-install-confirm"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    {t('pwa.install')}
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'ios-steps' && (
                        <div className="p-5">
                            <h4 className="font-bold text-base text-center mb-4 text-white">
                                {t('pwa.iosTitle')}
                            </h4>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider">
                                        {t('pwa.iosInAppWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <InstallStep icon={<Share className="w-5 h-5 text-[#e8d9a8]" />}>
                                    {t('pwa.iosStep1')} <strong>{t('pwa.share')}</strong> {t('pwa.inSafari')}
                                </InstallStep>
                                <InstallStep icon={<Plus className="w-5 h-5 text-[#e8d9a8]" />}>
                                    {t('pwa.iosStep2')} <strong>&quot;{t('pwa.addToHome')}&quot;</strong>
                                </InstallStep>
                                <InstallStep icon={<Download className="w-5 h-5 text-[#e8d9a8]" />}>
                                    {t('pwa.iosStep3')} <strong>&quot;{t('pwa.add')}&quot;</strong>
                                </InstallStep>
                            </div>

                            <button
                                onClick={handleLater}
                                className="w-full mt-5 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all"
                                style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                data-testid="pwa-ios-understood"
                            >
                                {t('pwa.understood')}
                            </button>
                        </div>
                    )}

                    {view === 'android-manual' && (
                        <div className="p-5" data-testid="pwa-android-manual">
                            <div className="flex items-start gap-4 mb-4">
                                <LogoBadge size={56} />
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className="font-bold text-base text-white">
                                        {t('pwa.manualTitle')}
                                    </h4>
                                    <p className="text-sm mt-1 text-[#c9d3ee]">
                                        {t('pwa.manualDesc')}
                                    </p>
                                </div>
                            </div>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider">
                                        {t('pwa.androidInAppWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <InstallStep icon={<MoreVertical className="w-5 h-5 text-[#e8d9a8]" />}>
                                    {t('pwa.manualStep1')}
                                </InstallStep>
                                <InstallStep icon={<Download className="w-5 h-5 text-[#e8d9a8]" />}>
                                    {t('pwa.manualStep2')}
                                </InstallStep>
                                <InstallStep
                                    icon={<RefreshCw className="w-5 h-5 text-[#e8d9a8]" />}
                                    testId="pwa-recent-uninstall-hint"
                                >
                                    {t('pwa.recentUninstallHint')}
                                </InstallStep>
                            </div>

                            <button
                                onClick={handleLater}
                                className="w-full mt-5 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all"
                                style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                data-testid="pwa-manual-understood"
                            >
                                {t('pwa.understood')}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

function InstallStep({
    icon,
    children,
    testId,
}: Readonly<{
    icon: React.ReactNode
    children: React.ReactNode
    testId?: string
}>) {
    return (
        <div className="flex items-center gap-4" data-testid={testId}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/10 border border-[rgba(184,150,74,0.35)]">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm text-white/90">{children}</p>
            </div>
        </div>
    )
}
