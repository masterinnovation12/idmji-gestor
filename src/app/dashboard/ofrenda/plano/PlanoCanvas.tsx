/**
 * PlanoCanvas.tsx — Lienzo pan/zoom con drag de elementos (Fase 4).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { colorDeBloque } from './planoData'
import { PlanoSvgTemplo } from './PlanoSvgTemplo'
import { PlanoBlockLabel } from './PlanoBlockLabel'
import { PlanoFigure } from './PlanoFigure'
import { PlanoCard } from './PlanoCard'
import type { PlanoBloque, PlanoLayout2d, PlanoPosicion, PlanoPunto, PlanoVistaResuelta } from './planoTypes'

interface Props {
    data: PlanoVistaResuelta
    canEdit?: boolean
    canDrag?: boolean
    layoutEditMode?: boolean
    editingOpen?: boolean
    dragging?: boolean
    onDragStart?: () => void
    onDragEnd?: (moved: boolean) => void
    onEditPosicion?: (pos: PlanoPosicion) => void
    onEditBlockLabel?: (bloque: PlanoBloque) => void
    onMoveCard?: (id: string, p: PlanoPunto) => void
    onMoveFigure?: (id: string, p: PlanoPunto) => void
    onMoveBlockLabel?: (bloqueN: number, p: PlanoPunto) => void
}

function CanvasToolbar() {
    const { t } = useI18n()
    const { zoomIn, zoomOut, resetTransform } = useControls()
    const btn =
        'flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-white/90 text-[#1f2e85] backdrop-blur border-[1.5px] border-[rgba(184,150,74,0.32)] shadow-md hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors touch-manipulation'
    return (
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 safe-top">
            <button type="button" className={btn} onClick={() => zoomIn()} aria-label={t('ofrenda.plano.zoomIn')}>
                <ZoomIn className="w-4 h-4" />
            </button>
            <button type="button" className={btn} onClick={() => zoomOut()} aria-label={t('ofrenda.plano.zoomOut')}>
                <ZoomOut className="w-4 h-4" />
            </button>
            <button type="button" className={btn} onClick={() => resetTransform()} aria-label={t('ofrenda.plano.fit')}>
                <Maximize className="w-4 h-4" />
            </button>
        </div>
    )
}

export function PlanoCanvas({
    data,
    canEdit = false,
    canDrag = false,
    layoutEditMode = false,
    editingOpen = false,
    dragging = false,
    onDragStart,
    onDragEnd,
    onEditPosicion,
    onEditBlockLabel,
    onMoveCard,
    onMoveFigure,
    onMoveBlockLabel,
}: Readonly<Props>) {
    const { t } = useI18n()
    const containerRef = useRef<HTMLDivElement>(null)
    const lienzoRef = useRef<HTMLDivElement>(null)
    const [fitScale, setFitScale] = useState<number | null>(null)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const measure = () => {
            const scale = Math.min(
                el.clientWidth / data.lienzo.w,
                el.clientHeight / data.lienzo.h,
            ) * 0.98
            setFitScale(scale > 0 ? scale : null)
        }
        measure()
        const obs = new ResizeObserver(measure)
        obs.observe(el)
        return () => obs.disconnect()
    }, [data.lienzo.w, data.lienzo.h])

    const rolLabel = (rol: 'ofrendario' | 'apoyo') =>
        rol === 'ofrendario' ? t('ofrenda.plano.rol.ofrendario') : t('ofrenda.plano.rol.apoyo')

    const panDisabled = editingOpen || dragging || layoutEditMode

    return (
        <div
            ref={containerRef}
            className="relative w-full min-h-[52dvh] h-[calc(100dvh-18rem)] max-h-[72dvh] sm:h-[calc(100dvh-16rem)] sm:max-h-[68dvh] md:max-h-[70dvh] xl:h-[calc(100dvh-14rem)] xl:max-h-[min(72dvh,820px)] overflow-hidden rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.35)] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 touch-none select-none overscroll-none"
            style={{ touchAction: 'none' }}
            role="application"
            aria-label={t('ofrenda.plano.canvasLabel')}
            data-testid="plano-canvas"
        >
            {fitScale !== null && (
                <TransformWrapper
                    key={`${data.vista}-${data.modo}-${fitScale.toFixed(3)}`}
                    initialScale={fitScale}
                    minScale={fitScale * 0.5}
                    maxScale={5}
                    centerOnInit
                    doubleClick={{ disabled: canEdit }}
                    wheel={{ step: 0.12 }}
                    panning={{ disabled: panDisabled }}
                >
                    <CanvasToolbar />
                    <TransformComponent
                        wrapperStyle={{ width: '100%', height: '100%' }}
                        contentStyle={{ maxWidth: 'none' }}
                    >
                        <div
                            ref={lienzoRef}
                            className="relative overflow-hidden rounded-xl shadow-2xl"
                            style={{
                                width: data.lienzo.w,
                                height: data.lienzo.h,
                                maxWidth: 'none',
                                background: '#e6e0d2',
                                colorScheme: 'light',
                            }}
                        >
                            {data.fondoUrl ? (
                                <Image
                                    src={data.fondoUrl}
                                    alt=""
                                    width={data.lienzo.w}
                                    height={data.lienzo.h}
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    priority={false}
                                    unoptimized
                                />
                            ) : (
                                <div className="absolute inset-0 pointer-events-none">
                                    <PlanoSvgTemplo
                                        layout={data.layout as PlanoLayout2d}
                                        modo={data.modo}
                                        bloques={data.bloques}
                                    />
                                </div>
                            )}

                            {data.bloques.map(b => (
                                <PlanoBlockLabel
                                    key={`bl-${b.n}`}
                                    bloque={b}
                                    lienzo={data.lienzo}
                                    etiqueta={data.layout.etiquetaBloque}
                                    lienzoRef={lienzoRef}
                                    canEdit={canEdit}
                                    canDrag={canDrag}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onMove={p => onMoveBlockLabel?.(b.n, p)}
                                    onEditText={onEditBlockLabel}
                                />
                            ))}

                            {data.posiciones.map(p => (
                                <PlanoFigure
                                    key={`fig-${p.id}`}
                                    pos={p.figura}
                                    lienzo={data.lienzo}
                                    color={colorDeBloque(data.bloques, p.bloque)}
                                    scale={data.layout.figuraScale}
                                    lienzoRef={lienzoRef}
                                    canDrag={canDrag}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onMove={pt => onMoveFigure?.(p.id, pt)}
                                />
                            ))}

                            {data.posiciones.map(p => (
                                <PlanoCard
                                    key={`card-${p.id}`}
                                    pos={p.card}
                                    lienzo={data.lienzo}
                                    color={colorDeBloque(data.bloques, p.bloque)}
                                    bloque={p.bloque}
                                    rolLabel={rolLabel(p.rol)}
                                    nombre={p.nombre ?? ''}
                                    nombrePlaceholder={t('ofrenda.plano.nombrePlaceholder')}
                                    tarjetas={data.layout.tarjetas}
                                    lienzoRef={lienzoRef}
                                    canEdit={canEdit}
                                    canDrag={canDrag}
                                    onDragStart={onDragStart}
                                    onDragEnd={onDragEnd}
                                    onMove={pt => onMoveCard?.(p.id, pt)}
                                    onEditNombre={() => onEditPosicion?.(p)}
                                />
                            ))}
                        </div>
                    </TransformComponent>
                </TransformWrapper>
            )}

            {layoutEditMode && (
                <div
                    className="absolute left-3 right-14 z-20 px-3 py-1.5 rounded-full bg-amber-500/95 text-amber-950 text-[11px] font-bold backdrop-blur text-center pointer-events-none shadow-md"
                    style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
                    data-testid="plano-layout-mode-banner"
                >
                    {t('ofrenda.plano.layoutEditActive')}
                </div>
            )}
            <div
                className="absolute left-3 z-20 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-[11px] font-bold backdrop-blur pointer-events-none sm:hidden"
                style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
                {layoutEditMode ? t('ofrenda.plano.hintLayout') : t('ofrenda.plano.hint')}
            </div>
        </div>
    )
}
