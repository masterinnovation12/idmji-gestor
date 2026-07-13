'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Menu, Sun, Moon, ChevronRight, LogOut } from 'lucide-react'
import NextImage from 'next/image'
import { LogoBadge } from '@/components/LogoBadge'
import { LanguageMenu } from '@/components/language/LanguageMenu'
import { SedeSwitcher } from '@/components/dashboard/SedeSwitcher'
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
        <div className="flex flex-col h-full bg-gradient-to-b from-[#1f2e85] via-[#1b2a72] to-[#151f5c] backdrop-blur-xl border-r-2 border-[rgba(184,150,74,0.35)]">
            {/* Logo Area */}
            <div
                className={`py-4 flex flex-col overflow-visible ${isSidebarCollapsed ? 'items-center px-4' : (isMobile ? 'px-5' : 'px-6')} border-b border-[rgba(184,150,74,0.22)] gap-3`}
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
                            <div className="absolute inset-0 bg-[#b8964a]/35 blur-lg rounded-2xl animate-pulse" />
                            <LogoBadge size={48} className="relative" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter uppercase italic text-white leading-none">
                                {t('common.appName')}
                            </span>
                            <span className="text-[10px] font-bold text-[#e8d9a8]/85 tracking-[0.2em] uppercase mt-1">
                                {t('common.appSubTitle')}
                            </span>
                        </div>
                    </motion.button>
                ) : (
                    <button onClick={onLogoClick} className="cursor-pointer hover:scale-110 transition-transform">
                        <LogoBadge size={44} />
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
                            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-[rgba(184,150,74,0.3)] transition-all text-white shadow-sm"
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
                            className="hidden md:flex items-center justify-center w-11 h-11 rounded-2xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                        >
                            <Menu size={18} />
                        </motion.button>
                    </div>
                )}

                {/* Selector de sede activa (solo ADMIN con varias sedes) */}
                {!isSidebarCollapsed && <SedeSwitcher t={t} />}

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
                        <SedeSwitcher t={t} collapsed />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-2.5 space-y-1.5 overflow-y-auto no-scrollbar">
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
                                className={`flex items-center gap-3.5 px-3.5 ${isMobile ? 'min-h-12 py-2.5' : 'py-2'} rounded-2xl transition-all duration-300 group relative ${isActive
                                    ? 'text-[#1f2e85] shadow-lg shadow-black/20'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {/* Active background with Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId={isMobile ? "activeTab-mobile" : "activeTab-desktop-v2"}
                                        className="absolute inset-0 bg-[#f8f3e8] border-[1.5px] border-[#b8964a] shadow-[0_2px_10px_rgba(184,150,74,0.35)] rounded-xl -z-10"
                                        initial={isMobile ? { opacity: 0, scale: 0.95 } : false}
                                        animate={isMobile ? { opacity: 1, scale: 1 } : undefined}
                                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                    />
                                )}

                                {/* Hover effect for non-active */}
                                {!isActive && (
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl -z-10" />
                                )}

                                <item.icon
                                    size={isMobile ? 24 : 22}
                                    className={`${isActive ? 'text-[#1f2e85] scale-110' : 'text-white/60 group-hover:text-white group-hover:scale-110'} relative z-10 transition-all duration-300`}
                                />

                                {!isSidebarCollapsed && (
                                    <span className={`flex-1 font-extrabold ${isMobile ? 'text-sm tracking-wide normal-case leading-5' : 'text-xs tracking-wide normal-case'} relative z-10 ${isActive ? 'text-[#1f2e85]' : 'text-white/70 group-hover:text-white'} transition-colors`}>
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
                                        <ChevronRight size={16} className="text-[#b68f2f]" />
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
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-[rgba(184,150,74,0.45)]">
                                <NextImage
                                    src={userProfile.avatar_url}
                                    alt={userProfile.nombre || 'Avatar'}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-[rgba(184,150,74,0.45)]">
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
                    className={`flex items-center gap-3 px-4 ${isMobile ? 'min-h-12 py-2.5 rounded-2xl' : 'py-2.5 rounded-xl'} w-full text-red-300 hover:text-red-100 hover:bg-red-500/20 transition-all group font-bold text-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}
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
