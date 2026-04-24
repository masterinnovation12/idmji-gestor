/**
 * DashboardLayout - IDMJI Gestor de Púlpito
 * 
 * Layout principal de la aplicación autenticada. Proporciona la navegación
 * lateral (sidebar), el marco responsivo y la integración de temas/idiomas.
 * 
 * Características:
 * - Sidebar colapsable en desktop y off-canvas en mobile
 * - Navegación inteligente con estados activos resaltados
 * - Soporte multiidioma dinámico (ES/CA)
 * - Diseño ultra-premium con Glassmorphism y micro-interacciones
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    Music,
    Users,
    BarChart,
    LogOut,
    Menu,
    FileText,
    FileSpreadsheet,
    UserCog,
    ChevronRight,
    Search,
    Moon,
    Sun,
    BookMarked
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import type { TranslationKey, Language } from '@/lib/i18n/types'
import NextImage from 'next/image'
import { LogoModal } from '@/components/LogoModal'
import { LanguageMenu } from '@/components/language/LanguageMenu'
import { NotificationPrompt } from '@/components/NotificationPrompt'
import { isSonidoUser } from '@/lib/utils/isSonido'
import { SidebarContent, NavItem } from '@/components/dashboard/SidebarContent'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
    const [userProfile, setUserProfile] = useState<{
        nombre: string | null
        apellidos: string | null
        avatar_url: string | null
        email: string | null
        rol: string | null
    } | null>(null)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    // Verificar que estamos en el cliente
    useEffect(() => {
        setMounted(true)
    }, [])

    // Ocultar scrollbar en páginas específicas
    useEffect(() => {
        if (!mounted) return
        const shouldHideScrollbar = pathname?.includes('/admin/users') || pathname?.includes('/hermanos') || pathname?.includes('/profile')
        if (shouldHideScrollbar) {
            document.documentElement.classList.add('no-scrollbar')
            if (document.body) {
                document.body.classList.add('no-scrollbar')
            }
        } else {
            document.documentElement.classList.remove('no-scrollbar')
            if (document.body) {
                document.body.classList.remove('no-scrollbar')
            }
        }
        return () => {
            document.documentElement.classList.remove('no-scrollbar')
            if (document.body) {
                document.body.classList.remove('no-scrollbar')
            }
        }
    }, [pathname, mounted])

    // Fetch user profile on mount & Subscribe to Realtime changes
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null
        let isMounted = true

        async function fetchAndSubscribe() {
            const { data: { user } } = await supabase.auth.getUser()

            if (!isMounted) return

            if (user) {
                // 1. Initial Fetch
                const fetchProfile = async () => {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('nombre, apellidos, avatar_url, rol')
                        .eq('id', user.id)
                        .single()

                    if (profile && isMounted) {
                        setUserProfile({
                            nombre: profile.nombre || null,
                            apellidos: profile.apellidos || null,
                            avatar_url: profile.avatar_url || null,
                            email: user.email || null,
                            rol: profile.rol || null
                        })
                    }
                }

                await fetchProfile()

                if (!isMounted) return

                // 2. Realtime Subscription
                channel = supabase
                    .channel('profile-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${user.id}`
                        },
                        (payload) => {
                            if (!isMounted) return
                            console.log('Profile updated realtime:', payload)
                            const newData = payload.new as { nombre?: string, apellidos?: string, avatar_url?: string, rol?: string }
                            setUserProfile(prev => ({
                                nombre: newData.nombre ?? prev?.nombre ?? null,
                                apellidos: newData.apellidos ?? prev?.apellidos ?? null,
                                avatar_url: newData.avatar_url ?? prev?.avatar_url ?? null,
                                rol: newData.rol ?? prev?.rol ?? null,
                                // Mantener el email ya que no viene en la tabla profiles
                                email: prev?.email || user.email || null
                            }))
                        }
                    )
                    .subscribe()
            }
        }

        fetchAndSubscribe()

        return () => {
            isMounted = false
            if (channel) supabase.removeChannel(channel)
        }
    }, [supabase])

    // Configuración dinámica de items del sidebar con i18n (memoizado para evitar problemas de hidratación)
    // Archivos: visible para cualquier rol (ADMIN, EDITOR, VIEWER, etc.)
    const isSonido = isSonidoUser(userProfile ?? {})
    const sidebarItems = useMemo(() => [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
        { icon: Calendar, label: t('nav.cultos'), href: '/dashboard/cultos' },
        { icon: BookOpen, label: t('nav.historial'), href: '/dashboard/historial/lecturas' },
        { icon: Music, label: t('nav.himnario'), href: '/dashboard/himnario' },
        { icon: Users, label: t('nav.hermanos'), href: '/dashboard/hermanos' },
        { icon: FileSpreadsheet, label: t('nav.archivos'), href: '/dashboard/archivos' },
        // Instrucciones: solo para usuarios de púlpito (no SONIDO)
        ...(!isSonido ? [{ icon: BookMarked, label: t('nav.instrucciones'), href: '/dashboard/instrucciones' }] : []),
        // Items de administración (solo para ADMIN)
        ...(userProfile?.rol === 'ADMIN' ? [
            { icon: BarChart, label: t('nav.stats'), href: '/dashboard/admin/stats' },
            { icon: UserCog, label: t('nav.users'), href: '/dashboard/admin/users' },
            { icon: FileText, label: t('nav.audit'), href: '/dashboard/admin/audit' },
        ] : [])
     
    ], [t, userProfile?.rol, isSonido])

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMobileMenuOpen(false)
        }, 0)
        return () => clearTimeout(timer)
    }, [pathname])

    // Cerrar menú móvil y auto-colapsar sidebar en tablet
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false)
            }
        }
        
        if (typeof window !== 'undefined') {
            // Auto-colapsar en tablet inicialmente
            if (window.innerWidth >= 768 && window.innerWidth < 1024) {
                setIsSidebarCollapsed(true)
            }
        }
        
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Bloquear scroll del body cuando sidebar móvil está abierto
    useEffect(() => {
        if (!mounted) return
        if (isMobileMenuOpen && window.innerWidth < 768) {
            if (document.body) {
                const originalOverflow = document.body.style.overflow
                document.body.style.overflow = 'hidden'
                return () => {
                    if (document.body) {
                        document.body.style.overflow = originalOverflow
                    }
                }
            }
        }
    }, [isMobileMenuOpen, mounted])

    // Gestos con Framer Motion (Pan) para rendimiento de 60fps
    const x = useMotionValue(-280)
    const opacity = useTransform(x, [-280, 0], [0, 1])

    // Sincronizar estado visual con reactivo
    useEffect(() => {
        if (isMobileMenuOpen) {
            animate(x, 0, { type: 'spring', damping: 25, stiffness: 200 })
        } else {
            animate(x, -280, { type: 'spring', damping: 25, stiffness: 200 })
        }
    }, [isMobileMenuOpen, x])

    const handlePanEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 40 // Mucho más sensible
        const velocityThreshold = 200 // Requiere menos velocidad para cerrar

        if (isMobileMenuOpen) {
            // Cerrando (arrastre hacia la izquierda = valor negativo)
            if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
                setIsMobileMenuOpen(false)
            } else {
                animate(x, 0, { type: 'spring', bounce: 0.2 }) // Rebotar a abierto
            }
        } else {
            // Abriendo (arrastre hacia la derecha = valor positivo)
            if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
                setIsMobileMenuOpen(true)
            } else {
                animate(x, -280, { type: 'spring', bounce: 0 }) // Rebotar a cerrado
            }
        }
    }

    /**
     * Maneja el cierre de sesión de forma segura
     */
    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden no-scrollbar">

            {/* Gesture Trigger Zone (Left Edge) */}
            {/* Usamos touch-action: pan-y para bloquear el gesto nativo horizontal (back/forward) del navegador */}
            {!isMobileMenuOpen && (
                <motion.div
                    className="fixed left-0 top-0 w-12 h-full z-130 md:hidden cursor-grab touch-pan-y"
                    style={{ x: 0 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 280 }}
                    dragElastic={0.1}
                    onDrag={(e, info) => {
                        // Solo mover si vamos hacia la derecha y limitar a 0
                        if (info.offset.x > 0) {
                            const newX = -280 + info.offset.x
                            x.set(Math.min(0, newX))
                        }
                    }}
                    onDragEnd={(e, info) => {
                        // Si arrastramos suficiente, abrir
                        if (info.offset.x > 80 || info.velocity.x > 300) {
                            setIsMobileMenuOpen(true)
                        } else {
                            // Si no, resetear
                            animate(x, -280)
                        }
                    }}
                />
            )}

            {/* Mesh Gradient Background */}
            <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ opacity }}
                        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-100 md:hidden touch-none"
                        onClick={() => setIsMobileMenuOpen(false)}
                        // Bloquear scroll de fondo agresivamente
                        onTouchMove={(e) => {
                            if (isMobileMenuOpen) e.preventDefault()
                        }}
                        onPan={(e, info) => {
                            // Sincronización fluida del cierre al arrastrar el fondo
                            const newX = Math.max(-280, Math.min(0, 0 + info.offset.x))
                            x.set(newX)
                        }}
                        onPanEnd={handlePanEnd}
                    />
                )}
            </AnimatePresence>

            {/* Sidebars (Mobile) */}
            <motion.aside
                style={{ x }}
                className="fixed left-0 top-0 z-110 flex h-full w-[280px] flex-col overflow-visible shadow-2xl touch-pan-y will-change-transform md:hidden"
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -280, right: 0 }}
                dragElastic={0.05} // Reducir elasticidad para sensación más sólida
                onDragEnd={handlePanEnd}
            >
                <SidebarContent
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    sidebarItems={sidebarItems}
                    pathname={pathname}
                    handleSignOut={handleSignOut}
                    t={t}
                    language={language}
                    setLanguage={setLanguage}
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    userProfile={userProfile}
                    onMobileNav={() => setIsMobileMenuOpen(false)}
                    isMobile={true}
                    onLogoClick={() => setIsLogoModalOpen(true)}
                />
            </motion.aside>

            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 96 : 280 }}
                className="fixed left-0 top-0 z-50 hidden h-full flex-col overflow-visible border-r border-border/50 shadow-sm md:flex"
            >
                <SidebarContent
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    sidebarItems={sidebarItems}
                    pathname={pathname}
                    handleSignOut={handleSignOut}
                    t={t}
                    language={language}
                    setLanguage={setLanguage}
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    userProfile={userProfile}
                    onLogoClick={() => setIsLogoModalOpen(true)}
                />
            </motion.aside>

            {/* Main Area */}
            <main
                className={`min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'md:ml-24' : 'md:ml-[280px]'
                    } ${pathname?.includes('/admin/users') || pathname?.includes('/hermanos') || pathname?.includes('/profile') ? 'no-scrollbar' : ''}`}
            >
                {/* Mobile Floating Header (Glassmorphism) */}
                <header className="sticky top-4 z-90 md:hidden px-4">
                    <div className="glass rounded-[2.5rem] border border-white/20 p-2 flex items-center justify-between shadow-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-2xl text-primary shrink-0 transition-transform active:scale-90"
                        >
                            <Menu size={22} />
                        </button>

                        <button
                            onClick={() => setIsLogoModalOpen(true)}
                            className="flex items-center gap-3 flex-1 justify-center pr-2 transition-transform active:scale-95 cursor-pointer"
                        >
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl border border-white/20 shrink-0 hover:scale-110 transition-transform">
                                <NextImage
                                    src="/logo.jpg"
                                    alt="IDMJI Logo"
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black italic text-sm tracking-tighter text-[#063b7a] dark:text-blue-400 leading-none">
                                    {t('common.appName')}
                                </span>
                                <span className="text-[8px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                                    {t('common.appSubTitle')}
                                </span>
                            </div>
                        </button>

                        {/* Espaciador para centrar el logo perfecto */}
                        <div className="w-12 shrink-0" />
                    </div>
                </header>

                {/* Page Content — entrance animation is handled by template.tsx */}
                <div className={`px-3 py-4 md:p-10 lg:p-12 max-w-7xl mx-auto ${pathname?.includes('/admin/users') || pathname?.includes('/hermanos') ? 'no-scrollbar' : ''}`}>
                    {children}
                </div>
            </main>

            {/* Logo Modal */}
            <LogoModal isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} />

            {/* Notification prompt: solo tras iniciar sesión (layout dashboard) */}
            <NotificationPrompt />
        </div>
    )
}

