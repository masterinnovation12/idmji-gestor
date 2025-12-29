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

import React, { useState, useEffect } from 'react'
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
    UserCog,
    ChevronRight,
    Search,
    Globe,
    Moon,
    Sun
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { TranslationKey, Language } from '@/lib/i18n/translations'
import Image from 'next/image'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [userProfile, setUserProfile] = useState<{
        nombre: string | null
        apellidos: string | null
        avatar_url: string | null
        email: string | null
        rol: string | null
    } | null>(null)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    // Ocultar scrollbar en páginas específicas
    useEffect(() => {
        const shouldHideScrollbar = pathname?.includes('/admin/users') || pathname?.includes('/hermanos') || pathname?.includes('/profile')
        if (shouldHideScrollbar) {
            document.documentElement.classList.add('no-scrollbar')
            document.body.classList.add('no-scrollbar')
        } else {
            document.documentElement.classList.remove('no-scrollbar')
            document.body.classList.remove('no-scrollbar')
        }
        return () => {
            document.documentElement.classList.remove('no-scrollbar')
            document.body.classList.remove('no-scrollbar')
        }
    }, [pathname])

    // Fetch user profile on mount & Subscribe to Realtime changes
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null

        async function fetchAndSubscribe() {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // 1. Initial Fetch
                const fetchProfile = async () => {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('nombre, apellidos, avatar_url, rol')
                        .eq('id', user.id)
                        .single()

                    if (profile) {
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
                            console.log('Profile updated realtime:', payload)
                            setUserProfile(prev => ({
                                ...prev,
                                ...payload.new as { nombre?: string, apellidos?: string, avatar_url?: string, rol?: string },
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
            if (channel) supabase.removeChannel(channel)
        }
    }, [supabase])

    // Configuración dinámica de items del sidebar con i18n
    const sidebarItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
        { icon: Calendar, label: t('nav.cultos'), href: '/dashboard/cultos' },
        { icon: BookOpen, label: t('nav.lecturas'), href: '/dashboard/lecturas' },
        { icon: Music, label: t('nav.himnario'), href: '/dashboard/himnario' },
        { icon: Users, label: t('nav.hermanos'), href: '/dashboard/hermanos' },
        // Items de administración (solo para ADMIN)
        ...(userProfile?.rol === 'ADMIN' ? [
            { icon: BarChart, label: t('nav.stats'), href: '/dashboard/admin/stats' },
            { icon: UserCog, label: t('nav.users'), href: '/dashboard/admin/users' },
            { icon: FileText, label: t('nav.audit'), href: '/dashboard/admin/audit' },
        ] : [])
    ]

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false)
        }
    }, [pathname])

    // Cerrar menú móvil al redimensionar a desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Bloquear scroll del body cuando sidebar móvil está abierto
    useEffect(() => {
        if (isMobileMenuOpen && window.innerWidth < 768) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = originalOverflow
            }
        }
    }, [isMobileMenuOpen])

    // Gestos con Framer Motion (Pan) para rendimiento de 60fps
    const x = useMotionValue(-300)
    const opacity = useTransform(x, [-300, 0], [0, 1])

    // Sincronizar estado visual con reactivo
    useEffect(() => {
        if (isMobileMenuOpen) {
            animate(x, 0, { type: 'spring', damping: 25, stiffness: 200 })
        } else {
            animate(x, -300, { type: 'spring', damping: 25, stiffness: 200 })
        }
    }, [isMobileMenuOpen, x])

    const handlePanEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100
        const velocityThreshold = 500

        if (isMobileMenuOpen) {
            // Cerrando
            if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
                setIsMobileMenuOpen(false)
            } else {
                animate(x, 0) // Rebotar a abierto
            }
        } else {
            // Abriendo
            if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
                setIsMobileMenuOpen(true)
            } else {
                animate(x, -300) // Rebotar a cerrado
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
                    className="fixed left-0 top-0 w-8 h-full z-[130] md:hidden cursor-grab touch-pan-y"
                    style={{ x: 0 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 300 }}
                    dragElastic={0.1}
                    onDrag={(e, info) => {
                        // Solo mover si vamos hacia la derecha
                        if (info.offset.x > 0) x.set(-300 + info.offset.x)
                    }}
                    onDragEnd={(e, info) => {
                        // Si arrastramos suficiente, abrir
                        if (info.offset.x > 100 || info.velocity.x > 500) {
                            setIsMobileMenuOpen(true)
                        } else {
                            // Si no, resetear
                            animate(x, -300)
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 md:hidden touch-none"
                        onClick={() => setIsMobileMenuOpen(false)}
                        onPan={(e, info) => {
                            // Arrastrar el overlay cierra el menú
                            const newX = Math.max(-300, Math.min(0, 0 + info.offset.x))
                            x.set(newX)
                        }}
                        onPanEnd={handlePanEnd}
                    />
                )}
            </AnimatePresence>

            {/* Sidebars (Mobile) */}
            <motion.aside
                style={{ x }}
                className="fixed left-0 top-0 h-full w-[300px] z-110 flex flex-col md:hidden shadow-2xl touch-pan-y will-change-transform"
                drag="x"
                dragConstraints={{ left: -300, right: 0 }}
                dragElastic={0.05}
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
                />
            </motion.aside>

            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 96 : 280 }}
                className="hidden md:flex fixed left-0 top-0 h-full border-r border-border/50 flex-col z-50 shadow-sm"
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
                />
            </motion.aside>

            {/* Main Area */}
            <main
                className={`min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'md:ml-24' : 'md:ml-[280px]'
                    } ${pathname?.includes('/admin/users') || pathname?.includes('/hermanos') || pathname?.includes('/profile') ? 'no-scrollbar' : ''}`}
            >
                {/* Mobile Floating Header (Glassmorphism) */}
                <header className="sticky top-4 z-90 md:hidden px-4">
                    <div className="glass rounded-4xl border border-white/20 p-4 flex items-center justify-between shadow-xl">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-3 bg-primary/10 rounded-2xl text-primary"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-lg border border-white/20">
                                <Image
                                    src="/logo.jpg"
                                    alt="IDMJI Logo"
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="font-black italic text-sm tracking-tighter text-[#063b7a]">IDMJI Sabadell</span>
                        </div>
                        <button className="p-3 bg-muted rounded-2xl">
                            <Search size={20} className="text-muted-foreground" />
                        </button>
                    </div>
                </header>

                {/* Page Content with Entrance Animation */}
                <div className={`p-6 md:p-10 lg:p-12 max-w-7xl mx-auto ${pathname?.includes('/admin/users') || pathname?.includes('/hermanos') ? 'no-scrollbar' : ''}`}>
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    )
}

/**
 * SidebarContent - Subcomponente estable para el Sidebar
 */
interface NavItem {
    icon: React.ElementType
    label: string
    href: string
}

interface SidebarContentProps {
    isSidebarCollapsed: boolean
    setIsSidebarCollapsed: (collapsed: boolean) => void
    sidebarItems: NavItem[]
    pathname: string
    handleSignOut: () => void
    t: (key: TranslationKey) => string
    language: Language
    setLanguage: (lang: Language) => void
    isDark: boolean
    toggleTheme: () => void
    userProfile: {
        nombre: string | null
        apellidos: string | null
        avatar_url: string | null
        email: string | null
        rol: string | null
    } | null
}

function SidebarContent({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarItems,
    pathname,
    handleSignOut,
    t,
    language,
    setLanguage,
    isDark,
    toggleTheme,
    userProfile
}: SidebarContentProps) {
    return (
        <div className="flex flex-col h-full bg-[#063b7a] dark:bg-black/95 backdrop-blur-xl border-r border-white/10">
            {/* Logo Area */}
            {/* Logo Area */}
            <div className={`py-8 flex flex-col ${isSidebarCollapsed ? 'items-center px-4' : 'px-8'} border-b border-border/10 gap-6`}>
                {/* Logo Section */}
                {!isSidebarCollapsed ? (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-2xl animate-pulse" />
                            <Image
                                src="/logo.jpg"
                                alt="IDMJI Logo"
                                width={48}
                                height={48}
                                className="relative rounded-2xl shadow-2xl border border-white/20"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
                                IDMJI Sabadell
                            </span>
                            <span className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1">
                                Gestor de Púlpito
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <Image
                        src="/logo.jpg"
                        alt="IDMJI Logo"
                        width={44}
                        height={44}
                        className="rounded-xl shadow-xl hover:scale-110 transition-transform cursor-pointer"
                    />
                )}

                {/* Controls (Language & Theme) */}
                {!isSidebarCollapsed && (
                    <div className="flex items-center gap-2 w-full">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setLanguage(language === 'es-ES' ? 'ca-ES' : 'es-ES')}
                            className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-[10px] font-black text-white shadow-sm"
                        >
                            <Globe className="w-4 h-4 text-blue-300" />
                            <span className="tracking-widest">{language === 'es-ES' ? 'ESPAÑOL' : 'CATALÀ'}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white shadow-sm"
                        >
                            {isDark ? (
                                <Sun className="w-4.5 h-4.5 text-amber-400 animate-spin-slow" />
                            ) : (
                                <Moon className="w-4.5 h-4.5 text-blue-200" />
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsSidebarCollapsed(true)}
                            className="hidden md:flex items-center justify-center w-11 h-11 rounded-2xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary"
                        >
                            <Menu size={18} />
                        </motion.button>
                    </div>
                )}

                {/* Collapsed state controls */}
                {isSidebarCollapsed && (
                    <div className="flex flex-col gap-4">
                        <motion.button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white shadow-sm"
                            whileHover={{ scale: 1.1 }}
                        >
                            <Menu size={20} />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto no-scrollbar">
                {sidebarItems.map((item: NavItem, index: number) => {
                    const isActive = pathname === item.href
                    return (
                        <motion.div
                            key={item.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Link
                                href={item.href}
                                className={`flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative overflow-hidden ${isActive
                                    ? 'text-black shadow-2xl shadow-black/10'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {/* Active background with Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white/95 backdrop-blur-md -z-10"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Hover effect for non-active */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
                                )}

                                <item.icon
                                    size={22}
                                    className={`${isActive ? 'text-black scale-110' : 'group-hover:text-white group-hover:scale-110 transition-all duration-300'}`}
                                />

                                {!isSidebarCollapsed && (
                                    <span className={`font-black text-xs tracking-widest uppercase flex-1 ${isActive ? 'text-black' : ''}`}>
                                        {item.label}
                                    </span>
                                )}

                                {isActive && !isSidebarCollapsed && (
                                    <motion.div layoutId="arrow" initial={{ x: -10 }} animate={{ x: 0 }}>
                                        <ChevronRight size={16} className="text-black/50" />
                                    </motion.div>
                                )}
                            </Link>
                        </motion.div>
                    )
                })}
            </nav>

            {/* Footer / User Profile Area */}
            <div className="p-4 border-t border-white/10 space-y-3">
                {/* User Profile */}
                {userProfile && (
                    <Link
                        href="/dashboard/profile"
                        className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        {userProfile.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border-2 border-white/20"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                                {userProfile.nombre?.[0]}{userProfile.apellidos?.[0]}
                            </div>
                        )}
                        {!isSidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {userProfile.nombre} {userProfile.apellidos}
                                </p>
                                <p className="text-[10px] text-white/50 truncate">
                                    {userProfile.email}
                                </p>
                            </div>
                        )}
                    </Link>
                )}

                {/* Logout button */}
                <motion.button
                    onClick={handleSignOut}
                    className={`flex items-center gap-3 px-4 py-3 w-full rounded-2xl text-red-300 hover:text-red-100 hover:bg-red-500/20 transition-all group font-bold text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    whileHover={{ x: isSidebarCollapsed ? 0 : 5 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                    {!isSidebarCollapsed && <span>{t('nav.logout')}</span>}
                </motion.button>

                {/* Versión de la Aplicación */}
                {!isSidebarCollapsed && (
                    <div className="pt-2 mt-2 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-center">
                            v1.0 • IDMJI Sabadell
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
