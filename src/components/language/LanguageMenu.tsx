'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Language, TranslationKey } from '@/lib/i18n/types'
import { FlagSpain } from './FlagSpain'
import { FlagCatalonia } from './FlagCatalonia'

export type LanguageMenuVariant = 'login' | 'sidebar' | 'sidebarCollapsed' | 'profile'

export interface LanguageMenuProps {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey) => string
    variant?: LanguageMenuVariant
    className?: string
}

interface PanelPos {
    top: number
    left: number
}

export function LanguageMenu({
    language,
    setLanguage,
    t,
    variant = 'login',
    className = '',
}: Readonly<LanguageMenuProps>) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<PanelPos | null>(null)

    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const menuId = useId()

    const close = useCallback(() => setOpen(false), [])

    /**
     * Calcula la posición `fixed` del panel una vez que está en el DOM.
     * Runs after DOM commit → antes del paint → sin flash de posición incorrecta.
     */
    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return

        const calc = () => {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            const OFFSET = 8
            const top = rect.bottom + OFFSET
            const panelW = menuRef.current?.offsetWidth ?? 192
            const vw = window.innerWidth
            const MARGIN = 8
            // Centrar horizontalmente sobre el botón, sin salir de la pantalla
            let left = rect.left + rect.width / 2 - panelW / 2
            left = Math.max(MARGIN, Math.min(left, vw - panelW - MARGIN))
            setPos({ top, left })
        }

        calc()
        window.addEventListener('scroll', calc, true)
        window.addEventListener('resize', calc)
        return () => {
            window.removeEventListener('scroll', calc, true)
            window.removeEventListener('resize', calc)
        }
    }, [open])

    // Segundo pase para refinar left una vez que menuRef.current tiene offsetWidth real
    useLayoutEffect(() => {
        if (!open || !triggerRef.current || !menuRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const OFFSET = 8
        const top = rect.bottom + OFFSET
        const panelW = menuRef.current.offsetWidth
        const vw = window.innerWidth
        const MARGIN = 8
        let left = rect.left + rect.width / 2 - panelW / 2
        left = Math.max(MARGIN, Math.min(left, vw - panelW - MARGIN))
        setPos({ top, left })
    }, [open])

    // Cerrar al hacer clic fuera
    useEffect(() => {
        if (!open) return
        const onDoc = (e: MouseEvent | TouchEvent) => {
            const node = e.target as Node | null
            if (!node) return
            if (rootRef.current?.contains(node)) return
            if (menuRef.current?.contains(node)) return
            close()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('touchstart', onDoc, { passive: true })
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('touchstart', onDoc)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, close])

    // Foco al primer ítem tras abrir
    useEffect(() => {
        if (!open) return
        const id = requestAnimationFrame(() => {
            menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()
        })
        return () => cancelAnimationFrame(id)
    }, [open])

    const pick = (lang: Language) => {
        setLanguage(lang)
        close()
        triggerRef.current?.focus()
    }

    const triggerAriaLabel = `${t('common.language.openMenu' as TranslationKey)}: ${
        language === 'es-ES'
            ? t('common.language.nameEs' as TranslationKey)
            : t('common.language.nameCa' as TranslationKey)
    }`

    const triggerFlagClass =
        variant === 'sidebar' || variant === 'sidebarCollapsed'
            ? 'h-4 w-6 shrink-0 rounded-sm border border-white/30 shadow-sm'
            : 'h-4 w-6 shrink-0 rounded-sm border border-black/12 shadow-sm dark:border-zinc-600/90'

    // ─── Estilos del trigger ────────────────────────────────────────────────
    let triggerBase: string
    if (variant === 'login') {
        triggerBase = 'glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground transition hover:bg-white/80 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
    } else if (variant === 'profile') {
        triggerBase = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground shadow-sm transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
    } else {
        triggerBase = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
    }

    let triggerOpen: string
    if (variant === 'login') {
        triggerOpen = 'bg-white/80 dark:bg-white/10 ring-2 ring-primary/25'
    } else if (variant === 'profile') {
        triggerOpen = 'ring-2 ring-primary/25'
    } else {
        triggerOpen = 'bg-white/20 ring-2 ring-white/30'
    }

    // ─── Estilos del panel ──────────────────────────────────────────────────
    const panelBase = 'min-w-[12rem] w-max max-w-[calc(100vw-1rem)] rounded-2xl border p-1.5 shadow-2xl'
    const panelVariant = 'bg-white text-slate-900 border-slate-200 dark:bg-zinc-900 dark:text-white dark:border-zinc-700'

    const itemBase = 'flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-all focus-visible:outline-none rounded-xl'
    const itemInactive = 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200'
    const itemActive = 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-300 font-semibold'

    const isSidebarCollapsed = variant === 'sidebarCollapsed'
    const panelAnim = isSidebarCollapsed
        ? { initial: { opacity: 0, x: -4, scale: 0.97 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -4, scale: 0.97 } }
        : { initial: { opacity: 0, y: -4, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.97 } }

    return (
        <div ref={rootRef} className={`relative overflow-visible ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                data-testid="language-menu-trigger"
                className={`${triggerBase} ${open ? triggerOpen : ''}`}
                aria-expanded={open}
                aria-haspopup="true"
                aria-controls={menuId}
                aria-label={triggerAriaLabel}
                onClick={() => setOpen((v) => !v)}
            >
                {language === 'es-ES' ? (
                    <span data-testid="language-trigger-flag-es" className="flex items-center justify-center">
                        <FlagSpain className={triggerFlagClass} />
                    </span>
                ) : (
                    <span data-testid="language-trigger-flag-ca" className="flex items-center justify-center">
                        <FlagCatalonia className={triggerFlagClass} />
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={menuRef}
                        id={menuId}
                        role="menu"
                        aria-label={t('common.language.ariaGroup' as TranslationKey)}
                        {...panelAnim}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={
                            pos
                                ? { position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }
                                /* Panel invisible mientras se calculan coords (sin flash y accesible) */
                                : { position: 'fixed', top: 0, left: 0, zIndex: 9999, opacity: 0, pointerEvents: 'none' }
                        }
                        className={`${panelBase} ${panelVariant}`}
                    >
                        <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={language === 'es-ES'}
                            data-testid="language-select-es"
                            className={`${itemBase} ${language === 'es-ES' ? itemActive : itemInactive}`}
                            onClick={() => pick('es-ES')}
                        >
                            <FlagSpain className="h-4 w-6 shrink-0 rounded-sm border border-black/10 shadow-sm" />
                            <span className="min-w-0 flex-1 whitespace-nowrap">{t('common.language.nameEs')}</span>
                            {language === 'es-ES' && (
                                <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-current" aria-hidden />
                            )}
                        </button>
                        <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={language === 'ca-ES'}
                            data-testid="language-select-ca"
                            className={`${itemBase} ${language === 'ca-ES' ? itemActive : itemInactive}`}
                            onClick={() => pick('ca-ES')}
                        >
                            <FlagCatalonia className="h-4 w-6 shrink-0 rounded-sm border border-black/10 shadow-sm" />
                            <span className="min-w-0 flex-1 whitespace-nowrap">{t('common.language.nameCa')}</span>
                            {language === 'ca-ES' && (
                                <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-current" aria-hidden />
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
