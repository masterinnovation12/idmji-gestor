'use client'

import { useState } from 'react'
import { List, ChevronUp, ChevronDown, Download, Eraser, RotateCcw, Save, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { OfrendaLiquidShell, useOfrendaMobileOrTablet } from '../OfrendaLiquidShell'
import { colorDeBloque } from './planoData'
import type { PlanoPosicion, PlanoVistaResuelta } from './planoTypes'

interface Props {
    data: PlanoVistaResuelta
    canEdit: boolean
    mobileOpen: boolean
    onMobileOpenChange: (open: boolean) => void
    onEditPosicion: (pos: PlanoPosicion) => void
    layoutStatus?: 'idle' | 'saving' | 'saved'
    onSaveLayout?: () => void
    onExportPng?: () => void
    onClearNombres?: () => void
    onResetLayout?: () => void
    exporting?: boolean
}

function EditorRows({
    data,
    canEdit,
    onEditPosicion,
    rolLabel,
}: Readonly<{
    data: PlanoVistaResuelta
    canEdit: boolean
    onEditPosicion: (pos: PlanoPosicion) => void
    rolLabel: (rol: 'ofrendario' | 'apoyo') => string
}>) {
    const { t } = useI18n()
    const sorted = [...data.posiciones].sort((a, b) => a.bloque - b.bloque || a.rol.localeCompare(b.rol))

    return (
        <ul className="space-y-1.5" data-testid="plano-editor-rows">
            {sorted.map(p => {
                const color = colorDeBloque(data.bloques, p.bloque)
                const nombre = p.nombre?.trim() || t('ofrenda.plano.nombrePlaceholder')
                return (
                    <li key={p.id}>
                        <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => canEdit && onEditPosicion(p)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[48px] rounded-xl border border-border/60 bg-background/80 text-left transition-colors touch-manipulation ${
                                canEdit ? 'hover:bg-muted/80 active:scale-[0.99]' : 'opacity-90 cursor-default'
                            }`}
                        >
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                                style={{ background: color }}
                            >
                                {p.bloque}
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                    {rolLabel(p.rol)}
                                </span>
                                <span className={`block text-sm font-semibold truncate ${!p.nombre?.trim() ? 'text-muted-foreground' : ''}`}>
                                    {nombre}
                                </span>
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

function EditorActions({
    canEdit,
    layoutStatus,
    onSaveLayout,
    onExportPng,
    onClearNombres,
    onResetLayout,
    exporting,
}: Readonly<{
    canEdit: boolean
    layoutStatus?: 'idle' | 'saving' | 'saved'
    onSaveLayout?: () => void
    onExportPng?: () => void
    onClearNombres?: () => void
    onResetLayout?: () => void
    exporting?: boolean
}>) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)
    const btn =
        'w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl border border-border/60 text-sm font-semibold transition-colors touch-manipulation hover:bg-muted/70 disabled:opacity-50'

    return (
        <div className="mt-4 border-t border-border/50 pt-3">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide py-2 touch-manipulation"
            >
                {t('ofrenda.plano.editor.actions')}
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && (
                <div className="space-y-1.5 mt-1">
                    <button type="button" className={btn} onClick={onExportPng} disabled={exporting}>
                        <Download className="w-4 h-4 shrink-0" />
                        {exporting ? t('ofrenda.plano.exporting') : t('ofrenda.plano.exportPng')}
                    </button>
                    {canEdit && (
                        <>
                            <button
                                type="button"
                                className={btn}
                                onClick={onSaveLayout}
                                disabled={layoutStatus === 'saving'}
                            >
                                {layoutStatus === 'saved' ? (
                                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                                ) : (
                                    <Save className="w-4 h-4 shrink-0" />
                                )}
                                {layoutStatus === 'saving'
                                    ? t('ofrenda.plano.saving')
                                    : layoutStatus === 'saved'
                                      ? t('ofrenda.plano.saved')
                                      : t('ofrenda.plano.saveLayout')}
                            </button>
                            <button type="button" className={btn} onClick={onClearNombres}>
                                <Eraser className="w-4 h-4 shrink-0" />
                                {t('ofrenda.plano.clearNombres')}
                            </button>
                            <button type="button" className={`${btn} text-amber-800 dark:text-amber-200 border-amber-500/40`} onClick={onResetLayout}>
                                <RotateCcw className="w-4 h-4 shrink-0" />
                                {t('ofrenda.plano.resetLayout')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function EditorPanelContent(props: Readonly<Props>) {
    const { t } = useI18n()
    const rolLabel = (rol: 'ofrendario' | 'apoyo') =>
        rol === 'ofrendario' ? t('ofrenda.plano.rol.ofrendario') : t('ofrenda.plano.rol.apoyo')

    return (
        <>
            <EditorRows
                data={props.data}
                canEdit={props.canEdit}
                onEditPosicion={props.onEditPosicion}
                rolLabel={rolLabel}
            />
            <EditorActions
                canEdit={props.canEdit}
                layoutStatus={props.layoutStatus}
                onSaveLayout={props.onSaveLayout}
                onExportPng={props.onExportPng}
                onClearNombres={props.onClearNombres}
                onResetLayout={props.onResetLayout}
                exporting={props.exporting}
            />
        </>
    )
}

export function PlanoEditorSheet(props: Readonly<Props>) {
    const { t } = useI18n()
    const isMobile = useOfrendaMobileOrTablet()
    const { mobileOpen, onMobileOpenChange, canEdit } = props

    const panel = (
        <div className="ofrenda-liquid-surface rounded-2xl border border-border/60 p-4 hidden xl:block">
            <h3 className="text-sm font-bold mb-3">{t('ofrenda.plano.editor.title')}</h3>
            <EditorPanelContent {...props} />
        </div>
    )

    if (!isMobile) return panel

    return (
        <>
            <button
                type="button"
                onClick={() => onMobileOpenChange(true)}
                className="xl:hidden fixed right-4 z-30 flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl bg-slate-900/90 text-white text-sm font-bold shadow-lg backdrop-blur touch-manipulation"
                style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                aria-label={t('ofrenda.plano.editor.open')}
            >
                <List className="w-4 h-4" />
                {t('ofrenda.plano.editor.open')}
            </button>

            <OfrendaLiquidShell
                open={mobileOpen}
                onClose={() => onMobileOpenChange(false)}
                ariaLabel={t('ofrenda.plano.editor.title')}
                title={t('ofrenda.plano.editor.title')}
                headline={t('ofrenda.plano.editor.title')}
                accent="navy"
                testIdPrefix="plano-editor"
                unstyledBody
            >
                <div className="px-4 pb-4">
                    <EditorPanelContent {...props} />
                </div>
                <div className="flex justify-center pb-2">
                    <ChevronUp className="w-5 h-5 text-muted-foreground opacity-50" aria-hidden />
                </div>
            </OfrendaLiquidShell>
        </>
    )
}
