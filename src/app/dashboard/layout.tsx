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
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Calendar,
    BookOpen,
    Music,
    Users,
    BarChart,
    Settings,
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
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    // Configuración dinámica de items del sidebar con i18n
    const sidebarItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
        { icon: Calendar, label: t('nav.cultos'), href: '/dashboard/cultos' },
        { icon: BookOpen, label: t('nav.lecturas'), href: '/dashboard/lecturas' },
        { icon: Music, label: t('nav.himnario'), href: '/dashboard/himnario' },
        { icon: Users, label: t('nav.hermanos'), href: '/dashboard/hermanos' },
        { icon: BarChart, label: t('nav.stats'), href: '/dashboard/admin/stats' },
        { icon: UserCog, label: t('nav.users'), href: '/dashboard/admin/users' },
        { icon: FileText, label: t('nav.audit'), href: '/dashboard/admin/audit' },
        { icon: Settings, label: t('nav.settings'), href: '/dashboard/settings' },
    ]

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setIsMobileMenuOpen(false)
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

    /**
     * Maneja el cierre de sesión de forma segura
     */
    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebars (Mobile & Desktop) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.aside
                        initial={{ x: -300 }}
                        animate={{ x: 0 }}
                        exit={{ x: -300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 h-full w-[300px] z-110 flex flex-col md:hidden shadow-2xl"
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
                        />
                    </motion.aside>
                )}
            </AnimatePresence>

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
                />
            </motion.aside>

            {/* Main Area */}
            <main
                className={`min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'md:ml-24' : 'md:ml-[280px]'
                    }`}
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
                            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                                <span className="text-white font-black text-sm">I</span>
                            </div>
                            <span className="font-black italic text-sm tracking-tight">IDMJI.</span>
                        </div>
                        <button className="p-3 bg-muted rounded-2xl">
                            <Search size={20} className="text-muted-foreground" />
                        </button>
                    </div>
                </header>

                {/* Page Content with Entrance Animation */}
                <div className="p-6 md:p-10 lg:p-12 max-w-7xl mx-auto">
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
    toggleTheme
}: SidebarContentProps) {
    return (
        <div className="flex flex-col h-full bg-white/80 dark:bg-black/80 backdrop-blur-xl">
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
                                src="/logo.jpeg"
                                alt="IDMJI Logo"
                                width={48}
                                height={48}
                                className="relative rounded-2xl shadow-2xl border border-white/20"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter uppercase italic text-foreground leading-none">
                                IDMJI<span className="text-primary not-italic">.</span>
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase mt-1">
                                Gestor de Púlpito
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <Image
                        src="/logo.jpeg"
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
                            className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all text-xs font-black text-foreground shadow-sm"
                        >
                            <Globe className="w-4 h-4 text-primary" />
                            <span>{language === 'es-ES' ? 'ESPAÑOL' : 'CATALÀ'}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all text-foreground shadow-sm"
                        >
                            {isDark ? (
                                <Sun className="w-4.5 h-4.5 text-amber-500 animate-spin-slow" />
                            ) : (
                                <Moon className="w-4.5 h-4.5 text-indigo-500 hover:rotate-12 transition-transform" />
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
                            className="p-3 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-primary shadow-sm"
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
                                    ? 'text-white shadow-2xl shadow-primary/30'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {/* Active background with Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-linear-to-r from-primary via-primary to-accent -z-10"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                )}

                                {/* Hover effect for non-active */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
                                )}

                                <item.icon
                                    size={22}
                                    className={`${isActive ? 'text-white scale-110' : 'group-hover:text-primary group-hover:scale-110 transition-all duration-300'}`}
                                />

                                {!isSidebarCollapsed && (
                                    <span className={`font-black text-xs tracking-widest uppercase flex-1 ${isActive ? 'text-white' : ''}`}>
                                        {item.label}
                                    </span>
                                )}

                                {isActive && !isSidebarCollapsed && (
                                    <motion.div layoutId="arrow" initial={{ x: -10 }} animate={{ x: 0 }}>
                                        <ChevronRight size={16} className="text-white/80" />
                                    </motion.div>
                                )}
                            </Link>
                        </motion.div>
                    )
                })}
            </nav>

            {/* Footer / User Profile Area */}
            <div className="p-6 border-t border-border/50">
                <motion.button
                    onClick={handleSignOut}
                    className={`flex items-center gap-4 px-4 py-3.5 w-full rounded-2xl text-red-500 hover:bg-red-500/5 transition-all group font-bold text-sm ${isSidebarCollapsed ? 'justify-center' : ''
                        }`}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogOut size={22} className="group-hover:rotate-12 transition-transform" />
                    {!isSidebarCollapsed && <span>{t('nav.logout')}</span>}
                </motion.button>
            </div>
        </div>
    )
}
