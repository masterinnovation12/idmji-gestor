'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Menu, Sun, Moon, ChevronRight, LogOut } from 'lucide-react'
import NextImage from 'next/image'
import { LanguageMenu } from '@/components/language/LanguageMenu'
import type { TranslationKey, Language } from '@/lib/i18n/types'

export interface NavItem {
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
    onMobileNav?: () => void
    isMobile?: boolean
    onLogoClick?: () => void
}

export function SidebarContent({
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
    userProfile,
    onMobileNav,
    isMobile = false,
    onLogoClick
}: SidebarContentProps) {
    return (
        <div className="flex flex-col h-full bg-[#063b7a] dark:bg-black/95 backdrop-blur-xl border-r border-white/10">
            {/* Logo Area */}
            <div
                className={`py-4 flex flex-col overflow-visible ${isSidebarCollapsed ? 'items-center px-4' : 'px-8'} border-b border-border/10 gap-3`}
            >
                {/* Logo Section */}
                {!isSidebarCollapsed ? (
                    <motion.button
                        onClick={onLogoClick}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform active:scale-95"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-2xl animate-pulse" />
                            <NextImage
                                src="/logo.jpg"
                                alt="IDMJI Logo"
                                width={48}
                                height={48}
                                className="relative rounded-2xl shadow-2xl border border-white/20"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
                                {t('common.appName')}
                            </span>
                            <span className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1">
                                {t('common.appSubTitle')}
                            </span>
                        </div>
                    </motion.button>
                ) : (
                    <button onClick={onLogoClick} className="cursor-pointer">
                        <NextImage
                            src="/logo.jpg"
                            alt="IDMJI Logo"
                            width={44}
                            height={44}
                            className="rounded-xl shadow-xl hover:scale-110 transition-transform cursor-pointer"
                        />
                    </button>
                )}

                {/* Controls (Language & Theme) */}
                {!isSidebarCollapsed && (
                    <div className="flex w-full items-center gap-2 overflow-visible">
                        <LanguageMenu
                            language={language}
                            setLanguage={setLanguage}
                            t={t}
                            variant="sidebar"
                            className="shrink-0"
                        />

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
                    <div className="flex flex-col gap-4 items-center">
                        <motion.button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white shadow-sm"
                            whileHover={{ scale: 1.1 }}
                        >
                            <Menu size={20} />
                        </motion.button>
                        <LanguageMenu
                            language={language}
                            setLanguage={setLanguage}
                            t={t}
                            variant="sidebarCollapsed"
                            className="shrink-0"
                        />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto no-scrollbar">
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
                                onClick={onMobileNav}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative ${isActive
                                    ? 'text-black shadow-2xl shadow-black/10'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {/* Active background with Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId={isMobile ? "activeTab-mobile" : "activeTab-desktop-v2"}
                                        className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-xl -z-10"
                                        initial={isMobile ? { opacity: 0, scale: 0.95 } : false}
                                        animate={isMobile ? { opacity: 1, scale: 1 } : undefined}
                                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                    />
                                )}

                                {/* Hover effect for non-active */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl -z-10" />
                                )}

                                <item.icon
                                    size={22}
                                    className={`${isActive ? 'text-black scale-110' : 'text-white/60 group-hover:text-white group-hover:scale-110'} relative z-10 transition-all duration-300`}
                                />

                                {!isSidebarCollapsed && (
                                    <span className={`flex-1 font-black text-xs tracking-widest uppercase relative z-10 ${isActive ? 'text-black' : 'text-white/60 group-hover:text-white'} transition-colors`}>
                                        {item.label}
                                    </span>
                                )}

                                {isActive && !isSidebarCollapsed && (
                                    <motion.div
                                        layoutId={isMobile ? "arrow-mobile" : "arrow-desktop-v2"}
                                        initial={isMobile ? { opacity: 0, x: -5 } : { x: -10 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="relative z-10"
                                    >
                                        <ChevronRight size={16} className="text-black/50" />
                                    </motion.div>
                                )}
                            </Link>
                        </motion.div>
                    )
                })}
            </nav>

            {/* Footer / User Profile Area */}
            <div className="p-3 border-t border-white/10 space-y-2">
                {/* User Profile */}
                {userProfile && (
                    <Link
                        href="/dashboard/profile"
                        onClick={onMobileNav}
                        className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        {userProfile.avatar_url ? (
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white/20">
                                <NextImage
                                    src={userProfile.avatar_url}
                                    alt={userProfile.nombre || 'Avatar'}
                                    fill
                                    className="object-cover"
                                />
                            </div>
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
                    className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-red-300 hover:text-red-100 hover:bg-red-500/20 transition-all group font-bold text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    whileHover={{ x: isSidebarCollapsed ? 0 : 5 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                    {!isSidebarCollapsed && <span>{t('nav.logout')}</span>}
                </motion.button>

                {!isSidebarCollapsed && (
                    <div className="pt-2 mt-2 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-center">
                            v2.0 • {t('common.appName')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
