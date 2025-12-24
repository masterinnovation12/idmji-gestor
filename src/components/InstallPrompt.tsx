/**
 * InstallPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente para invitar al usuario a instalar la PWA.
 * Detecta automáticamente si el dispositivo es iOS o Android/Chrome.
 * 
 * @author Antigravity AI
 * @date 2024-12-24
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Button } from './ui/Button'

// Definir interfaz para el evento BeforeInstallPrompt
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

    const platform = useMemo(() => {
        if (typeof window === 'undefined') return null
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios'
        if (/android/.test(userAgent)) return 'android'
        return 'other'
    }, [])

    useEffect(() => {
        // Escuchar el evento de instalación de Chrome/Android
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            
            // Solo mostrar si no se ha cerrado antes en esta sesión
            const isClosed = sessionStorage.getItem('pwa_prompt_closed')
            if (!isClosed) {
                setShowPrompt(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Para iOS, mostrar prompt si no está ya en modo standalone
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
        
        if (outcome === 'accepted') {
            setShowPrompt(false)
        }
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
                className="fixed bottom-6 left-4 right-4 z-[200] md:left-auto md:right-6 md:w-96"
            >
                <div className="glass rounded-3xl border border-white/20 p-5 shadow-2xl overflow-hidden relative group">
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />
                    
                    <button 
                        onClick={closePrompt}
                        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Smartphone className="text-primary w-6 h-6" />
                        </div>
                        <div className="space-y-1 pr-6">
                            <h4 className="font-black text-sm uppercase tracking-tight">Instalar Aplicación</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                Instala el Gestor de Púlpito en tu pantalla de inicio para un acceso rápido y notificaciones.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        {platform === 'ios' ? (
                            <div className="bg-primary/5 rounded-2xl p-3 flex items-center justify-center gap-3 border border-primary/10">
                                <Share className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                                    Pulsa compartir y luego &quot;Añadir a pantalla de inicio&quot;
                                </span>
                                <PlusSquare className="w-4 h-4 text-primary" />
                            </div>
                        ) : (
                            <Button 
                                onClick={handleInstall}
                                className="w-full rounded-2xl h-11 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Instalar ahora
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

