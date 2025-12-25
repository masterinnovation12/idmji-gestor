/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente para invitar al usuario a instalar la PWA.
 * Mejorada la visibilidad y diseño premium.
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Button } from './ui/Button'
import { useTheme } from '@/lib/theme/ThemeProvider'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
        if (/android/.test(userAgent)) return 'android'
        return 'other'
    }, [])

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            
            const isClosed = sessionStorage.getItem('pwa_prompt_closed')
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
            
            if (!isClosed && !isStandalone) {
                setShowPrompt(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        if (typeof window !== 'undefined') {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
            if (platform === 'ios' && !isStandalone) {
                const isClosed = sessionStorage.getItem('pwa_prompt_closed')
                if (!isClosed) {
                    const timer = setTimeout(() => setShowPrompt(true), 3000)
                    return () => clearTimeout(timer)
                }
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [platform])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setShowPrompt(false)
        setDeferredPrompt(null)
    }

    const closePrompt = () => {
        setShowPrompt(false)
        sessionStorage.setItem('pwa_prompt_closed', 'true')
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-4 right-4 z-[9999] md:left-auto md:right-6 md:w-96"
            >
                {/* Contenedor con diseño sólido y premium para evitar transparencia excesiva */}
                <div className={`relative overflow-hidden rounded-3xl border-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 ${
                    isDark 
                        ? 'bg-[#0f172a] border-slate-800' 
                        : 'bg-white border-blue-100'
                }`}>
                    {/* Decoración de fondo sutil - El resplandor es ahora más controlado */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                    
                    <button 
                        onClick={closePrompt}
                        className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${
                            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}
                    >
                        <X size={20} />
                    </button>

                    <div className="flex gap-5 items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl border ${
                            isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'
                        }`}>
                            <Smartphone className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div className="space-y-1 pr-4">
                            <h4 className={`font-black text-lg uppercase tracking-tight leading-tight ${
                                isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                                IDMJI Sabadell
                            </h4>
                            <p className={`text-[11px] leading-relaxed font-bold tracking-wide uppercase opacity-70 ${
                                isDark ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                                Instalar Aplicación
                            </p>
                        </div>
                    </div>

                    <p className={`mt-4 text-xs font-medium leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                        Instala IDMJI Sabadell en tu pantalla de inicio para una experiencia premium y acceso instantáneo.
                    </p>

                    <div className="mt-6">
                        {platform === 'ios' ? (
                            <div className={`rounded-2xl p-4 flex flex-col items-center gap-3 border shadow-inner ${
                                isDark 
                                    ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' 
                                    : 'bg-blue-50 border-blue-100 text-blue-700'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-lg">
                                        <Share className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-center">
                                        Pasos para iPhone
                                    </span>
                                </div>
                                <div className="h-px w-full bg-current opacity-10" />
                                <p className="text-[10px] font-bold text-center leading-tight">
                                    Pulsa el botón compartir y luego selecciona <br/>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-md font-black ${isDark ? 'bg-blue-500/20' : 'bg-blue-600 text-white'}`}>
                                        &quot;Añadir a pantalla de inicio&quot;
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <Button 
                                onClick={handleInstall}
                                className={`w-full rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-[11px] shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 ${
                                    isDark 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                <Download className="w-5 h-5 mr-3" />
                                Instalar ahora
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
