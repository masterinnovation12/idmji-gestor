/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 *
 * Flujos por plataforma:
 * - Android Chrome + beforeinstallprompt → WebAPK real (botón Instalar).
 * - Android Chrome SIN BIP (cooldown WebAPK) → guía de recuperación paso a paso.
 * - Android Brave/Edge/etc. → manual + aviso de usar Chrome.
 * - iOS/iPadOS → Compartir → Añadir a pantalla de inicio.
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Download,
    Plus,
    Share,
    X,
    MoreVertical,
    RefreshCw,
    Trash2,
    Settings,
    Timer,
    CheckCircle2,
} from 'lucide-react'
import { LogoBadge } from '@/components/LogoBadge'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { usePrompts } from '@/lib/PromptsContext'
import {
    ANDROID_MANUAL_FALLBACK_DELAY_MS,
    IOS_PROMPT_DELAY_MS,
    INSTALL_PROMPT_DELAY_MS,
    PWA_SW_READY_EVENT,
    buildPwaInstallStartUrl,
    dismissInstallPromptForSession,
    dismissInstallPromptLongTerm,
    detectPlatform,
    isPwaStandalone,
    markPromptShownThisSession,
    markPwaInstalled,
    readInstallPromptStorage,
    resetInstallPromptForRetry,
    resolveAndroidFallbackView,
    shouldShowInstallPrompt,
    shouldUseNativeInstallFlow,
    syncPwaInstalledStorage,
    waitForInstallServiceWorker,
    type AndroidFallbackView,
    type RelatedAppInstallState,
} from '@/lib/pwa-install-prompt'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PromptView = 'banner' | 'ios-steps' | AndroidFallbackView

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

    const showNoWebApkWarning =
        platform?.name === 'android' && platform.supportsWebApk === false

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

    useEffect(() => {
        revealPromptRef.current = revealPrompt
    }, [revealPrompt])

    useEffect(() => {
        installReadyRef.current = installCheckReady && swReady
    }, [installCheckReady, swReady])

    useEffect(() => {
        if (typeof window === 'undefined') return

        let showTimer: ReturnType<typeof setTimeout> | null = null

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            const bip = e as BeforeInstallPromptEvent
            deferredPromptRef.current = bip
            setDeferredPrompt(bip)
            setView((current) =>
                current === 'android-manual' || current === 'android-chrome-recovery'
                    ? 'banner'
                    : current
            )

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
                if (!isMounted || typeof window === 'undefined') return
                const fallbackView = resolveAndroidFallbackView({
                    platform: platform.name,
                    hasDeferredPrompt: deferredPromptRef.current !== null,
                    isStandalone,
                    relatedAppInstalled,
                    userAgent: window.navigator.userAgent,
                })
                if (fallbackView) revealPrompt(fallbackView)
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

    const handleRetryInstall = async () => {
        if (typeof window === 'undefined') return

        resetInstallPromptForRetry(window)
        showScheduledRef.current = false

        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration('/')
                await reg?.update()
            } catch {
                /* noop */
            }
        }

        window.location.href = buildPwaInstallStartUrl(window.location.origin)
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
                <div className="relative overflow-hidden rounded-2xl border border-[rgba(184,150,74,0.45)] shadow-2xl bg-gradient-to-b from-[#1f2e85] via-[#1b2a72] to-[#151f5c] backdrop-blur-xl max-h-[85vh] overflow-y-auto">
                    <div
                        aria-hidden
                        className="h-1 sticky top-0 z-10"
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
                                    <h4 className="font-bold text-base text-white" suppressHydrationWarning>
                                        {t('pwa.installTitle')}
                                    </h4>
                                    <p className="text-sm mt-1 text-[#c9d3ee]" suppressHydrationWarning>
                                        {t('pwa.installDesc')}
                                    </p>
                                </div>
                            </div>

                            {showNoWebApkWarning && (
                                <div
                                    className="mt-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl"
                                    data-testid="pwa-no-webapk-warning"
                                >
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                        {t('pwa.noWebApkWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={handleLater}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-white/85 border border-white/25 hover:bg-white/10 transition-colors"
                                    data-testid="pwa-install-later"
                                >
                                    <span suppressHydrationWarning>{t('pwa.later')}</span>
                                </button>
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all inline-flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                    data-testid="pwa-install-confirm"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    <span suppressHydrationWarning>{t('pwa.install')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'ios-steps' && (
                        <div className="p-5">
                            <h4 className="font-bold text-base text-center mb-4 text-white" suppressHydrationWarning>
                                {t('pwa.iosTitle')}
                            </h4>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                        {t('pwa.iosInAppWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <InstallStep icon={<Share className="w-5 h-5 text-[#e8d9a8]" />}>
                                    <span suppressHydrationWarning>
                                        {t('pwa.iosStep1')} <strong>{t('pwa.share')}</strong> {t('pwa.inSafari')}
                                    </span>
                                </InstallStep>
                                <InstallStep icon={<Plus className="w-5 h-5 text-[#e8d9a8]" />}>
                                    <span suppressHydrationWarning>
                                        {t('pwa.iosStep2')} <strong>&quot;{t('pwa.addToHome')}&quot;</strong>
                                    </span>
                                </InstallStep>
                                <InstallStep icon={<Download className="w-5 h-5 text-[#e8d9a8]" />}>
                                    <span suppressHydrationWarning>
                                        {t('pwa.iosStep3')} <strong>&quot;{t('pwa.add')}&quot;</strong>
                                    </span>
                                </InstallStep>
                            </div>

                            <button
                                onClick={handleLater}
                                className="w-full mt-5 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all"
                                style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                data-testid="pwa-ios-understood"
                            >
                                <span suppressHydrationWarning>{t('pwa.understood')}</span>
                            </button>
                        </div>
                    )}

                    {view === 'android-chrome-recovery' && (
                        <div className="p-5" data-testid="pwa-android-chrome-recovery">
                            <div className="flex items-start gap-4 mb-4">
                                <LogoBadge size={56} />
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className="font-bold text-base text-white" suppressHydrationWarning>
                                        {t('pwa.recoveryTitle')}
                                    </h4>
                                    <p className="text-sm mt-1 text-[#c9d3ee]" suppressHydrationWarning>
                                        {t('pwa.recoveryDesc')}
                                    </p>
                                </div>
                            </div>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                        {t('pwa.androidInAppWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl" data-testid="pwa-recovery-shortcut-warning">
                                <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                    {t('pwa.recoveryShortcutWarning')}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <InstallStep icon={<Trash2 className="w-5 h-5 text-[#e8d9a8]" />} testId="pwa-recovery-step-1">
                                    <span suppressHydrationWarning>{t('pwa.recoveryStep1')}</span>
                                </InstallStep>
                                <InstallStep icon={<Settings className="w-5 h-5 text-[#e8d9a8]" />} testId="pwa-recovery-step-2">
                                    <span suppressHydrationWarning>{t('pwa.recoveryStep2')}</span>
                                </InstallStep>
                                <InstallStep icon={<MoreVertical className="w-5 h-5 text-[#e8d9a8]" />} testId="pwa-recovery-step-3">
                                    <span suppressHydrationWarning>{t('pwa.recoveryStep3')}</span>
                                </InstallStep>
                                <InstallStep icon={<Timer className="w-5 h-5 text-[#e8d9a8]" />} testId="pwa-recovery-step-4">
                                    <span suppressHydrationWarning>{t('pwa.recoveryStep4')}</span>
                                </InstallStep>
                                <InstallStep icon={<CheckCircle2 className="w-5 h-5 text-[#e8d9a8]" />} testId="pwa-recovery-step-5">
                                    <span suppressHydrationWarning>{t('pwa.recoveryStep5')}</span>
                                </InstallStep>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={handleRetryInstall}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-white/85 border border-white/25 hover:bg-white/10 transition-colors"
                                    data-testid="pwa-manual-retry"
                                >
                                    <span suppressHydrationWarning>{t('pwa.retryInstall')}</span>
                                </button>
                                <button
                                    onClick={handleLater}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                    data-testid="pwa-manual-understood"
                                >
                                    <span suppressHydrationWarning>{t('pwa.understood')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'android-manual' && (
                        <div className="p-5" data-testid="pwa-android-manual">
                            <div className="flex items-start gap-4 mb-4">
                                <LogoBadge size={56} />
                                <div className="flex-1 min-w-0 pr-6">
                                    <h4 className="font-bold text-base text-white" suppressHydrationWarning>
                                        {t('pwa.manualTitle')}
                                    </h4>
                                    <p className="text-sm mt-1 text-[#c9d3ee]" suppressHydrationWarning>
                                        {t('pwa.manualDesc')}
                                    </p>
                                </div>
                            </div>

                            {platform?.isInApp && (
                                <div className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                        {t('pwa.androidInAppWarning')}
                                    </p>
                                </div>
                            )}

                            {showNoWebApkWarning && (
                                <div
                                    className="mb-4 p-3 bg-amber-400/15 border border-amber-300/30 rounded-xl"
                                    data-testid="pwa-no-webapk-warning"
                                >
                                    <p className="text-[11px] font-bold text-amber-200 text-center uppercase tracking-wider" suppressHydrationWarning>
                                        {t('pwa.noWebApkWarning')}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <InstallStep icon={<MoreVertical className="w-5 h-5 text-[#e8d9a8]" />}>
                                    <span suppressHydrationWarning>{t('pwa.manualStep1')}</span>
                                </InstallStep>
                                <InstallStep icon={<Download className="w-5 h-5 text-[#e8d9a8]" />}>
                                    <span suppressHydrationWarning>{t('pwa.manualStep2')}</span>
                                </InstallStep>
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={handleRetryInstall}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-white/85 border border-white/25 hover:bg-white/10 transition-colors"
                                    data-testid="pwa-manual-retry"
                                >
                                    <span suppressHydrationWarning>{t('pwa.retryInstall')}</span>
                                </button>
                                <button
                                    onClick={handleLater}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-[#1f2e85] shadow-lg hover:brightness-105 transition-all"
                                    style={{ background: 'linear-gradient(135deg, #d4b86a 0%, #e3cc92 50%, #b8964a 100%)' }}
                                    data-testid="pwa-manual-understood"
                                >
                                    <span suppressHydrationWarning>{t('pwa.understood')}</span>
                                </button>
                            </div>
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
