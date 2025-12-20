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
    Search
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t } = useI18n()
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
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
                        className="fixed left-0 top-0 h-full w-[300px] z-[110] flex flex-col md:hidden shadow-2xl"
                    >
                        <SidebarContent
                            isSidebarCollapsed={isSidebarCollapsed}
                            setIsSidebarCollapsed={setIsSidebarCollapsed}
                            sidebarItems={sidebarItems}
                            pathname={pathname}
                            handleSignOut={handleSignOut}
                            t={t}
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
                />
            </motion.aside>

            {/* Main Area */}
            <main
                className={`min-h-screen transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'md:ml-24' : 'md:ml-[280px]'
                    }`}
            >
                {/* Mobile Floating Header (Glassmorphism) */}
                <header className="sticky top-4 z-[90] md:hidden px-4">
                    <div className="glass rounded-[2rem] border border-white/20 p-4 flex items-center justify-between shadow-xl">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-3 bg-primary/10 rounded-2xl text-primary"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
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
function SidebarContent({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarItems,
    pathname,
    handleSignOut,
    t
}: any) {
    return (
        <div className="flex flex-col h-full bg-white/80 dark:bg-black/80 backdrop-blur-xl">
            {/* Logo Area */}
            <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-6 border-b border-border/50`}>
                {!isSidebarCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-white font-black text-xl">I</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase italic">
                            IDMJI<span className="text-primary not-italic">.</span>
                        </span>
                    </motion.div>
                )}

                {isSidebarCollapsed && (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-black text-xl">I</span>
                    </div>
                )}

                {/* Desktop toggle button */}
                <motion.button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-primary"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Menu size={20} />
                </motion.button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto no-scrollbar">
                {sidebarItems.map((item: any, index: number) => {
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
                                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive
                                    ? 'text-white shadow-xl shadow-primary/20'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {/* Active background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-primary to-accent -z-10"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Hover effect */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                                )}

                                <item.icon
                                    size={22}
                                    className={`${isActive ? 'text-white' : 'group-hover:text-primary transition-colors'}`}
                                />

                                {!isSidebarCollapsed && (
                                    <span className="font-bold text-sm tracking-tight flex-1">
                                        {item.label}
                                    </span>
                                )}

                                {isActive && !isSidebarCollapsed && (
                                    <motion.div layoutId="arrow">
                                        <ChevronRight size={14} className="text-white/70" />
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
