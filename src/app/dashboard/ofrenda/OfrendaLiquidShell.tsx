'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { OfrServicio } from './actions'
import { lockOfrendaDocumentScroll, unlockOfrendaDocumentScroll } from './ofrendaScrollLock'

export const OFRENDA_LIQUID_Z_BACKDROP = 10050
export const OFRENDA_LIQUID_Z_SHEET = 10051
import { useOfrendaMobileOrTablet } from './ofrendaViewport'

export { OFRENDA_MOBILE_TABLET_MQ, useOfrendaMobileOrTablet } from './ofrendaViewport'

export type OfrendaLiquidPanelSize = 'default' | 'sm' | 'md'

export type OfrendaLiquidAccent =
    | 'emerald'
    | 'sky'
    | 'violet'
    | 'gold'
    | 'blue'
    | 'navy'

const ACCENT_HEADLINE: Record<OfrendaLiquidAccent, string> = {
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
    violet: 'text-violet-300',
    gold: 'text-[#e8d9a8]',
    blue: 'text-sky-300',
    navy: 'text-[#e8d9a8]',
}

function subscribe() { return () => {} }
function getSnapshot() { return true }
function getServerSnapshot() { return false }

export function diaTipoToAccent(diaTipo: OfrServicio['dia_tipo'] | undefined): OfrendaLiquidAccent {
    switch (diaTipo) {
        case 'jueves':
            return 'emerald'
        case 'domingo':
            return 'sky'
        case 'domingo_tarde':
            return 'violet'
        default:
            return 'gold'
    }
}

export interface OfrendaLiquidShellProps {
    open: boolean
    onClose: () => void
    ariaLabel: string
    title: string
    headline: string
    subtitle?: string | null
    currentLabel?: string
    currentValue?: string
    accent?: OfrendaLiquidAccent
    panelSize?: OfrendaLiquidPanelSize
    testIdPrefix?: string
    currentTestId?: string
    unstyledBody?: boolean
    closeLabel?: string
    /** Si false, solo cierra con X, Entendido o Escape (evita cierre accidental al abrir tras otro clic). */
    closeOnBackdropClick?: boolean
    children: ReactNode
    footer?: ReactNode
}

function panelSizeClass(size: OfrendaLiquidPanelSize): string {
    switch (size) {
        case 'sm':
            return 'ofrenda-liquid-panel ofrenda-liquid-panel--sm'
        case 'md':
            return 'ofrenda-liquid-panel ofrenda-liquid-panel--md'
        default:
            return 'ofrenda-liquid-panel'
    }
}

function LiquidHeader({
    layout,
    title,
    headline,
    subtitle,
    currentLabel,
    currentValue,
    currentTestId,
    accent,
    onClose,
    closeLabel,
}: Readonly<{
    layout: 'sheet' | 'panel'
    title: string
    headline: string
    subtitle?: string | null
    currentLabel?: string
    currentValue?: string
    currentTestId?: string
    accent: OfrendaLiquidAccent
    onClose: () => void
    closeLabel: string
}>) {
    const headerRound = layout === 'panel' ? 'rounded-t-[1.5rem]' : 'rounded-t-[1.75rem]'

    return (
        <div className={`ofrenda-liquid-picker__header shrink-0 ${headerRound}`}>
            {layout === 'sheet' && (
                <div className="flex justify-center pt-3 pb-1">
                    <div className="ofrenda-liquid-handle h-1 w-11 rounded-full" />
                </div>
            )}
            <div className={`flex items-start justify-between gap-3 px-4 pb-3 ${layout === 'sheet' ? 'pt-1' : 'pt-4'}`}>
                <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
                        {title}
                    </p>
                    <p className={`mt-1 text-lg font-bold leading-tight ${ACCENT_HEADLINE[accent]}`}>
                        {headline}
                    </p>
                    {subtitle ? (
                        <p className="mt-1 text-xs font-medium text-white/70">{subtitle}</p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="ofrenda-liquid-close flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl touch-manipulation"
                    aria-label={closeLabel}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            {currentLabel && currentValue !== undefined ? (
                <div className="ofrenda-liquid-picker__current mx-4 mb-4 rounded-2xl px-3.5 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#b68f2f]">
                        {currentLabel}
                    </p>
                    <p
                        className="truncate text-sm font-bold text-[#1f2e85]"
                        data-testid={currentTestId}
                    >
                        {currentValue}
                    </p>
                </div>
            ) : (
                <div className="mb-1" />
            )}
        </div>
    )
}

export function OfrendaLiquidShell({
    open,
    onClose,
    ariaLabel,
    title,
    headline,
    subtitle,
    currentLabel,
    currentValue,
    accent = 'gold',
    panelSize = 'default',
    testIdPrefix = 'ofrenda-liquid',
    currentTestId,
    unstyledBody = false,
    closeLabel = 'Cerrar',
    closeOnBackdropClick = true,
    children,
    footer,
}: Readonly<OfrendaLiquidShellProps>) {
    const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const isMobileOrTablet = useOfrendaMobileOrTablet()
    const layout = isMobileOrTablet ? 'sheet' : 'panel'

    useEffect(() => {
        if (!open) return
        lockOfrendaDocumentScroll()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            unlockOfrendaDocumentScroll()
            window.removeEventListener('keydown', onKey)
        }
    }, [open, onClose])

    if (!isClient || !open) return null

    const header = (
        <LiquidHeader
            layout={layout}
            title={title}
            headline={headline}
            subtitle={subtitle}
            currentLabel={currentLabel}
            currentValue={currentValue}
            currentTestId={currentTestId}
            accent={accent}
            onClose={onClose}
            closeLabel={closeLabel}
        />
    )

    const body = (
        <>
            <div
                className={`ofrenda-liquid-picker__body min-h-0 flex-1 overflow-y-auto overscroll-contain ${
                    unstyledBody ? '' : 'text-[#0f172a]'
                }`}
            >
                {unstyledBody ? children : <div className="px-4 py-4">{children}</div>}
            </div>
            {footer ? (
                <div className="ofrenda-liquid-picker__body shrink-0 border-t border-slate-100 px-4 py-3">
                    {footer}
                </div>
            ) : null}
        </>
    )

    const sheetPanelClass =
        layout === 'sheet'
            ? 'ofrenda-liquid-surface ofrenda-liquid-sheet w-full max-h-[min(92vh,720px)] flex flex-col rounded-t-[1.75rem] pb-[env(safe-area-inset-bottom)]'
            : `ofrenda-liquid-surface ${panelSizeClass(panelSize)} flex max-h-[min(92vh,720px)] w-full max-w-[calc(100vw-2rem)] flex-col`

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key={`${testIdPrefix}-root`}
                    data-testid={`${testIdPrefix}-root`}
                    className="ofrenda-liquid-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: OFRENDA_LIQUID_Z_BACKDROP,
                        width: '100%',
                        height: '100dvh',
                        overflow: 'hidden',
                    }}
                >
                    <motion.div
                        key={`${testIdPrefix}-backdrop`}
                        data-testid={`${testIdPrefix}-backdrop`}
                        className="ofrenda-liquid-backdrop absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeOnBackdropClick ? onClose : undefined}
                        aria-hidden
                    />
                    <div
                        className={`ofrenda-liquid-root__stage pointer-events-none ${
                            layout === 'sheet' ? 'ofrenda-liquid-root__stage--sheet' : 'ofrenda-liquid-root__stage--panel'
                        }`}
                        style={{ zIndex: OFRENDA_LIQUID_Z_SHEET }}
                    >
                        <motion.div
                            key={layout === 'sheet' ? 'sheet' : 'panel'}
                            role="dialog"
                            aria-modal="true"
                            aria-label={ariaLabel}
                            data-testid={layout === 'sheet' ? `${testIdPrefix}-sheet` : `${testIdPrefix}-panel`}
                            initial={
                                layout === 'sheet'
                                    ? { y: '100%', opacity: 1 }
                                    : { opacity: 0, y: 16, scale: 0.96 }
                            }
                            animate={
                                layout === 'sheet'
                                    ? { y: 0, opacity: 1 }
                                    : { opacity: 1, y: 0, scale: 1 }
                            }
                            exit={
                                layout === 'sheet'
                                    ? { y: '100%', opacity: 1 }
                                    : { opacity: 0, y: 12, scale: 0.97 }
                            }
                            transition={{ type: 'spring', damping: 28, stiffness: 420 }}
                            className={`pointer-events-auto ${sheetPanelClass}`}
                            onClick={e => e.stopPropagation()}
                        >
                            {header}
                            {body}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}
