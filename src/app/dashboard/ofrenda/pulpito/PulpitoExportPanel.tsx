'use client'

import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share2, Loader2, LayoutList, Table2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from '../ofrendaFeedback'
import { captureNodeToJpegDataUrl, shareOrDownloadJpeg } from '../exportImageShare'
import {
    PulpitoExportLayout,
    type PulpitoExportOrientation,
    type PulpitoExportCulto,
    type PulpitoExportLabels,
} from './PulpitoExportLayout'
import type { PulpitoCulto } from './actions'
import type { PulpitoRol } from '@/lib/utils/pulpitoAvailability'

interface Props {
    cultos: PulpitoCulto[]
    periodLabel: string
    fileSlug: string
    diaLabel: (fecha: string) => string
    rolLabel: (rol: PulpitoRol) => string
}

export function PulpitoExportPanel({ cultos, periodLabel, fileSlug, diaLabel, rolLabel }: Readonly<Props>) {
    const { t } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [orientation, setOrientation] = useState<PulpitoExportOrientation>('vertical')
    const [busy, setBusy] = useState<null | 'download' | 'share'>(null)
    const layoutRef = useRef<HTMLDivElement>(null)

    // Solo cultos con roles de púlpito
    const cultosConRoles = useMemo(() => cultos.filter(c => c.roles.length > 0), [cultos])

    const labels: PulpitoExportLabels = useMemo(() => ({
        churchName: t('ofrenda.subtitle'),
        titleDoc: t('ofrenda.pulpito.title'),
        roles: {
            introduccion: t('ofrenda.pulpito.roles.introduccion'),
            ensenanza: t('ofrenda.pulpito.roles.ensenanza'),
            testimonios: t('ofrenda.pulpito.roles.testimonios'),
            finalizacion: t('ofrenda.pulpito.roles.finalizacion'),
        },
        sinAsignar: t('ofrenda.pulpito.sinAsignar'),
        rolFecha: t('ofrenda.table.rolFecha'),
        footer: t('ofrenda.pulpito.footer'),
    }), [t])

    const exportCultos: PulpitoExportCulto[] = useMemo(
        () => cultosConRoles.map(c => ({
            id: c.id,
            fecha: c.fecha,
            diaLabel: diaLabel(c.fecha),
            tipoNombre: c.tipo_nombre,
            tipoColor: c.tipo_color,
            roles: c.roles,
            asignaciones: Object.fromEntries(
                c.roles.map(rol => [rol, c.asignaciones[rol]?.nombre ?? '']),
            ) as Partial<Record<PulpitoRol, string>>,
        })),
        [cultosConRoles, diaLabel],
    )

    const runExport = async (mode: 'download' | 'share') => {
        if (!layoutRef.current || busy || exportCultos.length === 0) return
        setBusy(mode)
        try {
            const filename = `labor-pulpito-${orientation}-${fileSlug}.jpg`
            const layoutWidth = layoutRef.current.offsetWidth || 620
            const dataUrl = await captureNodeToJpegDataUrl(layoutRef.current, {
                layoutWidth,
                pixelRatio: orientation === 'vertical' ? 3 : 2.5,
            })
            if (mode === 'share') {
                const res = await shareOrDownloadJpeg(dataUrl, filename, t('ofrenda.pulpito.title'))
                quickSuccess(
                    res.outcome === 'shared'
                        ? t('ofrenda.pulpito.export.shareSuccess')
                        : t('ofrenda.pulpito.export.success'),
                )
            } else {
                const { downloadDataUrl } = await import('../exportImageShare')
                downloadDataUrl(dataUrl, filename)
                quickSuccess(t('ofrenda.pulpito.export.success'))
            }
        } catch {
            planError(t('ofrenda.pulpito.export.error'))
        } finally {
            setBusy(null)
        }
    }

    if (exportCultos.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                {t('ofrenda.pulpito.export.empty')}
            </div>
        )
    }

    return (
        <div className="ofrenda-liquid-card space-y-4 p-4 sm:p-5" data-testid="pulpito-export-panel">
            <h3 className="text-base font-bold flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" />
                {t('ofrenda.pulpito.export.title')}
            </h3>

            {/* Orientación */}
            <div className="inline-flex w-full sm:w-auto rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1" role="group">
                {([
                    { id: 'vertical' as const, label: t('ofrenda.pulpito.export.orientationVertical'), Icon: LayoutList },
                    { id: 'horizontal' as const, label: t('ofrenda.pulpito.export.orientationHorizontal'), Icon: Table2 },
                ]).map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setOrientation(id)}
                        data-testid={`pulpito-orientation-${id}`}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-[0.6rem] text-xs font-bold touch-manipulation transition-all ${
                            orientation === id
                                ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                                : 'text-slate-500 hover:text-[#1f2e85]'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runExport('download')}
                    data-testid="pulpito-export-download"
                    className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white text-sm font-bold shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation"
                >
                    {busy === 'download' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {t('ofrenda.pulpito.export.download')}
                </button>
                <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runExport('share')}
                    data-testid="pulpito-export-share"
                    className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.4)] bg-white text-[#1f2e85] text-sm font-bold hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors disabled:opacity-50 touch-manipulation"
                >
                    {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {t('ofrenda.pulpito.export.share')}
                </button>
            </div>

            {/* Lienzo oculto para la captura (fuera de pantalla, no afecta al layout) */}
            {typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
                    <PulpitoExportLayout
                        ref={layoutRef}
                        orientation={orientation}
                        periodLabel={periodLabel}
                        cultos={exportCultos}
                        labels={labels}
                    />
                </div>,
                document.body,
            )}
        </div>
    )
}
