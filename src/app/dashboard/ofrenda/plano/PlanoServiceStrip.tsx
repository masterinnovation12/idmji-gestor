'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaClientMounted, useOfrendaMobileOrTablet } from '../ofrendaViewport'
import type { OfrServicio } from '../actions'
import { usePlanoStripTouchScroll } from './usePlanoStripTouchScroll'
import './plano-service-strip.css'

const SCROLL_EDGE = 8

export type PlanoServiceAccent = Record<
    OfrServicio['dia_tipo'],
    { on: string; off: string; dot: string }
>

interface Props {
    servicios: OfrServicio[]
    activeId: string
    accent: PlanoServiceAccent
    diaLabel: (s: OfrServicio) => string
    onSelect: (id: string) => void
}

export function PlanoServiceStrip({
    servicios,
    activeId,
    accent,
    diaLabel,
    onSelect,
}: Readonly<Props>) {
    const { t } = useI18n()
    const mounted = useOfrendaClientMounted()
    const isCompact = useOfrendaMobileOrTablet()
    const isTouchLayout = mounted && isCompact

    const scrollRef = useRef<HTMLDivElement>(null)
    const suppressChipClickRef = useRef(false)
    const [overflow, setOverflow] = useState(false)
    const [edges, setEdges] = useState({ left: false, right: false })
    const [touchDragging, setTouchDragging] = useState(false)

    const onStripDragEnd = useCallback((wasDragging: boolean) => {
        if (wasDragging) {
            suppressChipClickRef.current = true
            queueMicrotask(() => {
                suppressChipClickRef.current = false
            })
        }
    }, [])

    usePlanoStripTouchScroll(scrollRef, {
        enabled: isTouchLayout,
        onDragChange: setTouchDragging,
        onDragEnd: onStripDragEnd,
    })

    const updateEdges = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const hasOverflow = el.scrollWidth - el.clientWidth > SCROLL_EDGE
        setOverflow(prev => (prev === hasOverflow ? prev : hasOverflow))
        const left = el.scrollLeft > SCROLL_EDGE
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_EDGE
        setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
    }, [])

    useEffect(() => {
        updateEdges()
        const el = scrollRef.current
        if (!el) return

        const ro = new ResizeObserver(() => updateEdges())
        ro.observe(el)
        el.addEventListener('scroll', updateEdges, { passive: true })
        return () => {
            ro.disconnect()
            el.removeEventListener('scroll', updateEdges)
        }
    }, [servicios.length, updateEdges])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        const chip = el.querySelector<HTMLElement>(`[data-servicio-id="${activeId}"]`)
        if (!chip) return
        const chipLeft = chip.offsetLeft
        const chipRight = chipLeft + chip.offsetWidth
        const viewLeft = el.scrollLeft
        const viewRight = viewLeft + el.clientWidth
        if (chipLeft < viewLeft + 12 || chipRight > viewRight - 12) {
            chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [activeId, servicios.length])

    const scrollBy = (dir: -1 | 1) => {
        const el = scrollRef.current
        if (!el) return
        el.scrollBy({
            left: dir * Math.max(160, Math.round(el.clientWidth * 0.6)),
            behavior: 'smooth',
        })
    }

    const showArrows = !isTouchLayout && overflow

    const arrowBase =
        'hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full border border-[rgba(184,150,74,0.35)] bg-background/95 text-foreground shadow-[0_4px_14px_-4px_rgba(31,46,133,0.35)] backdrop-blur transition-all duration-200 hover:scale-105 hover:border-[rgba(184,150,74,0.6)]'

    const scrollPad = showArrows ? 'px-12' : 'px-3'
    const snapCls = isTouchLayout ? 'snap-x snap-mandatory' : ''

    return (
        <div className="min-w-0 max-w-full" data-testid="plano-service-strip">
            <div className="plano-service-strip-shell relative rounded-2xl overflow-hidden">
                {overflow && (
                    <>
                        <div
                            className={`plano-strip-fade-l pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 md:w-14 transition-opacity duration-200 ${
                                edges.left ? 'opacity-100' : 'opacity-0'
                            }`}
                            aria-hidden
                        />
                        <div
                            className={`plano-strip-fade-r pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 md:w-14 transition-opacity duration-200 ${
                                edges.right ? 'opacity-100' : 'opacity-0'
                            }`}
                            aria-hidden
                        />
                    </>
                )}

                {showArrows && (
                    <>
                        <button
                            type="button"
                            onClick={() => scrollBy(-1)}
                            aria-label={t('ofrenda.plano.servicePrev')}
                            data-testid="plano-service-strip-prev"
                            className={`${arrowBase} left-2 ${
                                edges.left ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollBy(1)}
                            aria-label={t('ofrenda.plano.serviceNext')}
                            data-testid="plano-service-strip-next"
                            className={`${arrowBase} right-2 ${
                                edges.right ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}

                <div
                    ref={scrollRef}
                    className={`plano-service-strip-scroll flex w-full max-w-full items-center gap-2 py-2.5 overflow-x-auto scroll-smooth ${scrollPad} ${snapCls} ${
                        touchDragging ? 'plano-service-strip-scroll--dragging' : ''
                    }`}
                    role="tablist"
                    aria-label={t('ofrenda.plano.serviceSelector')}
                    data-testid="plano-service-strip-scroll"
                >
                    {servicios.map(s => {
                        const active = s.id === activeId
                        const styles = accent[s.dia_tipo]
                        const stateCls = active
                            ? styles.on
                            : 'bg-background/80 ' + styles.off
                        const snapItem = isTouchLayout ? 'snap-start snap-always' : ''
                        return (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                data-servicio-id={s.id}
                                aria-selected={active}
                                onClick={() => {
                                    if (suppressChipClickRef.current) return
                                    onSelect(s.id)
                                }}
                                className={`plano-service-strip-chip group shrink-0 inline-flex items-center gap-2 pl-3 pr-3.5 py-2 min-h-[44px] rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200 touch-manipulation ${snapItem} ${stateCls}`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                        active ? 'bg-white/85' : styles.dot
                                    }`}
                                    aria-hidden
                                />
                                {diaLabel(s)}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
