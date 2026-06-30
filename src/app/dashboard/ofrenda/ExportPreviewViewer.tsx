'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, Maximize2, MoveHorizontal, Expand, X, Hand } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { EXPORT_LAYOUT_WIDTH } from './exportCapture'

const ZOOM_MIN = 0.15
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.1
const FULLSCREEN_MIN_ZOOM = 0.55
/** Por encima de sidebar, pickers y toasts del dashboard */
const FULLSCREEN_Z_INDEX = 2147483000

type InputMode = 'touch' | 'pointer'

interface ExportPreviewViewerProps {
    imageUrl: string
    alt: string
}

function clampZoom(z: number) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

function computeFitZoom(containerWidth: number) {
    const padding = 32
    const available = Math.max(containerWidth - padding, 120)
    return clampZoom(available / EXPORT_LAYOUT_WIDTH)
}

function touchDistance(touches: TouchList) {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
}

function useInputMode(): InputMode {
    const [mode, setMode] = useState<InputMode>('touch')

    useEffect(() => {
        const update = () => {
            const coarse = window.matchMedia('(pointer: coarse)').matches
            const fine = window.matchMedia('(pointer: fine)').matches
            if (fine && !coarse) setMode('pointer')
            else if (coarse) setMode('touch')
            else setMode('pointer')
        }
        update()
        const q1 = window.matchMedia('(pointer: coarse)')
        const q2 = window.matchMedia('(pointer: fine)')
        q1.addEventListener('change', update)
        q2.addEventListener('change', update)
        return () => {
            q1.removeEventListener('change', update)
            q2.removeEventListener('change', update)
        }
    }, [])

    return mode
}

function useCanScrollHorizontal(ref: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
    const [canScroll, setCanScroll] = useState(false)

    const measure = useCallback(() => {
        const el = ref.current
        if (!el) return
        setCanScroll(el.scrollWidth > el.clientWidth + 2)
    }, [ref])

    useEffect(() => {
        measure()
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` se difunde a propósito (API del hook reutilizable)
    }, [measure, ref, ...deps])

    return { canScroll, remeasure: measure }
}

interface PreviewControlsProps {
    zoom: number
    onZoomIn: () => void
    onZoomOut: () => void
    onFit: () => void
    onFullscreen?: () => void
    scrollHint: string
    hintMode: InputMode
    zoomInLabel: string
    zoomOutLabel: string
    fitLabel: string
    fullscreenLabel?: string
}

function PreviewControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onFit,
    onFullscreen,
    scrollHint,
    hintMode,
    zoomInLabel,
    zoomOutLabel,
    fitLabel,
    fullscreenLabel,
}: Readonly<PreviewControlsProps>) {
    const HintIcon = hintMode === 'pointer' ? Hand : MoveHorizontal

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-border/50 bg-muted/50 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-0">
                <HintIcon className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                <span className="truncate">{scrollHint}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={onZoomOut}
                    disabled={zoom <= ZOOM_MIN + 0.001}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors touch-manipulation disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={zoomOutLabel}
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold tabular-nums w-10 text-center text-muted-foreground">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    type="button"
                    onClick={onZoomIn}
                    disabled={zoom >= ZOOM_MAX - 0.001}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors touch-manipulation disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={zoomInLabel}
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onFit}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors touch-manipulation"
                    aria-label={fitLabel}
                    title={fitLabel}
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {onFullscreen && fullscreenLabel && (
                    <button
                        type="button"
                        onClick={onFullscreen}
                        className="p-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/15 transition-colors touch-manipulation"
                        aria-label={fullscreenLabel}
                        title={fullscreenLabel}
                    >
                        <Expand className="w-3.5 h-3.5 text-primary" />
                    </button>
                )}
            </div>
        </div>
    )
}

interface PanDragOverlayProps {
    label: string
    onDismiss: () => void
}

function PanDragOverlay({ label, onDismiss }: Readonly<PanDragOverlayProps>) {
    return (
        <button
            type="button"
            onClick={onDismiss}
            className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 cursor-pointer border-0 p-0"
            aria-label={label}
        >
            <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl bg-foreground/80 text-background shadow-xl pointer-events-none">
                <Hand className="w-9 h-9 ofrenda-export-pan-hand" strokeWidth={1.75} />
                <span className="text-xs font-semibold tracking-wide text-center max-w-[220px]">
                    {label}
                </span>
            </div>
        </button>
    )
}

interface PreviewCanvasProps {
    imageUrl: string
    alt: string
    zoom: number
    onZoomChange: (zoom: number, userInitiated?: boolean) => void
    scrollRef: React.RefObject<HTMLDivElement | null>
    maxHeightClass?: string
    isFullscreen?: boolean
    panOverlayLabel: string
    onPanDismiss?: () => void
    showPanOverlay: boolean
}

function PreviewCanvas({
    imageUrl,
    alt,
    zoom,
    onZoomChange,
    scrollRef,
    maxHeightClass = 'max-h-[min(70vh,560px)]',
    isFullscreen = false,
    panOverlayLabel,
    onPanDismiss,
    showPanOverlay,
}: Readonly<PreviewCanvasProps>) {
    const displayWidth = Math.round(EXPORT_LAYOUT_WIDTH * zoom)
    const inputMode = useInputMode()
    const zoomRef = useRef(zoom)
    const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
    const { canScroll, remeasure } = useCanScrollHorizontal(scrollRef, [zoom, imageUrl, displayWidth, scrollEl])
    const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 })
    const pinchRef = useRef({ active: false, startDistance: 0, startZoom: zoom })
    const [isDragging, setIsDragging] = useState(false)
    const [isPinching, setIsPinching] = useState(false)

    const mergeScrollRef = useCallback(
        (node: HTMLDivElement | null) => {
            scrollRef.current = node
            setScrollEl(node)
        },
        [scrollRef],
    )

    useEffect(() => {
        zoomRef.current = zoom
    }, [zoom])

    const dismissPan = useCallback(() => {
        onPanDismiss?.()
    }, [onPanDismiss])

    const enableDragPan = canScroll && (inputMode === 'pointer' || isFullscreen)

    useEffect(() => {
        remeasure()
    }, [displayWidth, remeasure])

    const handleScroll = useCallback(() => {
        dismissPan()
    }, [dismissPan])

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!enableDragPan || e.button !== 0) return
        const el = scrollRef.current
        if (!el) return
        dragRef.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft }
        setIsDragging(true)
        dismissPan()
    }, [enableDragPan, scrollRef, dismissPan])

    useEffect(() => {
        if (!enableDragPan) return

        const onMove = (e: MouseEvent) => {
            if (!dragRef.current.active) return
            const el = scrollRef.current
            if (!el) return
            e.preventDefault()
            el.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.startX)
        }

        const onUp = () => {
            if (dragRef.current.active) {
                dragRef.current.active = false
                setIsDragging(false)
            }
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [enableDragPan, scrollRef])

    // Pinch-to-zoom (vista embebida y pantalla completa) + trackpad Ctrl/⌘ + rueda
    useEffect(() => {
        const el = scrollEl
        if (!el) return

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                pinchRef.current = {
                    active: true,
                    startDistance: touchDistance(e.touches),
                    startZoom: zoomRef.current,
                }
                setIsPinching(true)
                dismissPan()
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!pinchRef.current.active || e.touches.length !== 2) return
            const dist = touchDistance(e.touches)
            if (pinchRef.current.startDistance <= 0) return
            e.preventDefault()
            const scale = dist / pinchRef.current.startDistance
            onZoomChange(clampZoom(pinchRef.current.startZoom * scale), true)
        }

        const endPinch = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchRef.current.active = false
                setIsPinching(false)
            }
        }

        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return
            e.preventDefault()
            const factor = e.deltaY > 0 ? 0.94 : 1.06
            onZoomChange(clampZoom(zoomRef.current * factor), true)
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: false })
        el.addEventListener('touchend', endPinch)
        el.addEventListener('touchcancel', endPinch)
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', endPinch)
            el.removeEventListener('touchcancel', endPinch)
            el.removeEventListener('wheel', onWheel)
        }
    }, [scrollEl, onZoomChange, dismissPan])

    const showOverlay = showPanOverlay && canScroll && isFullscreen

    return (
        <div className="relative ofrenda-export-preview flex flex-col min-h-0 flex-1 bg-muted/20">
            <div
                className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10 bg-gradient-to-r from-background to-transparent"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-background to-transparent"
                aria-hidden
            />

            <div
                ref={mergeScrollRef}
                onScroll={handleScroll}
                onMouseDown={handleMouseDown}
                className={[
                    'ofrenda-export-preview__scroll overflow-x-auto overflow-y-auto overscroll-contain p-4 scroll-smooth flex-1 min-h-0 bg-background',
                    maxHeightClass,
                    enableDragPan ? (isDragging ? 'cursor-grabbing select-none' : 'cursor-grab') : '',
                    isPinching ? 'touch-none' : '',
                ].filter(Boolean).join(' ')}
                style={{
                    maxWidth: '100%',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: isPinching ? 'none' : 'pan-x pinch-zoom',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={alt}
                    draggable={false}
                    className="block h-auto select-none rounded-md border border-border/40 shadow-md mx-auto ofrenda-export-preview__img pointer-events-none"
                    style={{
                        width: displayWidth,
                        minWidth: displayWidth,
                        maxWidth: 'none',
                    }}
                />
            </div>

            {showOverlay && (
                <PanDragOverlay label={panOverlayLabel} onDismiss={dismissPan} />
            )}
        </div>
    )
}

export function ExportPreviewViewer({ imageUrl, alt }: Readonly<ExportPreviewViewerProps>) {
    const { t } = useI18n()
    const inputMode = useInputMode()
    const scrollRef = useRef<HTMLDivElement>(null)
    const fullscreenScrollRef = useRef<HTMLDivElement>(null)
    const userAdjustedRef = useRef(false)
    const [zoom, setZoom] = useState(0.42)
    const [fullscreenOpen, setFullscreenOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [panHintDismissed, setPanHintDismissed] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        setPanHintDismissed(false)
    }, [imageUrl, fullscreenOpen])

    const applyZoom = useCallback((next: number, userInitiated = false) => {
        if (userInitiated) userAdjustedRef.current = true
        setZoom(clampZoom(next))
    }, [])

    const fitToWidth = useCallback((container?: HTMLDivElement | null) => {
        const el = container ?? scrollRef.current
        if (!el || el.clientWidth < 40) return
        userAdjustedRef.current = false
        setZoom(computeFitZoom(el.clientWidth))
    }, [])

    const zoomIn = useCallback(() => {
        setZoom(z => clampZoom(z + ZOOM_STEP))
        userAdjustedRef.current = true
    }, [])

    const zoomOut = useCallback(() => {
        setZoom(z => clampZoom(z - ZOOM_STEP))
        userAdjustedRef.current = true
    }, [])

    const openFullscreen = useCallback(() => {
        setFullscreenOpen(true)
    }, [])

    const closeFullscreen = useCallback(() => {
        setFullscreenOpen(false)
    }, [])

    useEffect(() => {
        if (fullscreenOpen) return
        const el = scrollRef.current
        if (!el) return

        const runFit = () => {
            if (!userAdjustedRef.current) fitToWidth(el)
        }

        runFit()
        const ro = new ResizeObserver(runFit)
        ro.observe(el)
        return () => ro.disconnect()
    }, [fitToWidth, imageUrl, fullscreenOpen])

    useEffect(() => {
        if (!fullscreenOpen) return
        let cancelled = false
        const applyFullscreenZoom = () => {
            if (cancelled) return
            const el = fullscreenScrollRef.current
            const w = el && el.clientWidth > 40 ? el.clientWidth : window.innerWidth
            const fitZoom = computeFitZoom(w)
            setZoom(clampZoom(Math.max(fitZoom, FULLSCREEN_MIN_ZOOM)))
            userAdjustedRef.current = false
        }
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(applyFullscreenZoom)
        })
        return () => {
            cancelled = true
            cancelAnimationFrame(id)
        }
    }, [fullscreenOpen, imageUrl])

    // Bloquear scroll del dashboard detrás del visor a pantalla completa
    useEffect(() => {
        if (!fullscreenOpen) return
        const prevHtml = document.documentElement.style.overflow
        const prevBody = document.body.style.overflow
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeFullscreen()
        }
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.documentElement.style.overflow = prevHtml
            document.body.style.overflow = prevBody
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [fullscreenOpen, closeFullscreen])

    const toolbarHintMode: InputMode =
        fullscreenOpen && inputMode === 'pointer' ? 'pointer' : inputMode
    const scrollHint = toolbarHintMode === 'pointer'
        ? t('ofrenda.export.previewDragHint')
        : t('ofrenda.export.previewScrollHint')

    const panOverlayLabel = inputMode === 'pointer'
        ? t('ofrenda.export.previewPanOverlay')
        : t('ofrenda.export.previewPanOverlayTouch')

    const labels = {
        scrollHint,
        panOverlay: panOverlayLabel,
        zoomIn: t('ofrenda.export.previewZoomIn'),
        zoomOut: t('ofrenda.export.previewZoomOut'),
        fit: t('ofrenda.export.previewFit'),
        fullscreen: t('ofrenda.export.previewOpen'),
        close: t('ofrenda.export.previewClose'),
    }

    const canvasProps = {
        imageUrl,
        alt,
        zoom,
        onZoomChange: applyZoom,
        panOverlayLabel: labels.panOverlay,
        onPanDismiss: () => setPanHintDismissed(true),
        showPanOverlay: !panHintDismissed,
    }

    const inlineScrollHint = inputMode === 'pointer'
        ? t('ofrenda.export.previewDragHint')
        : t('ofrenda.export.previewScrollHint')

    const inlineControls = {
        zoom,
        onZoomIn: zoomIn,
        onZoomOut: zoomOut,
        onFit: () => fitToWidth(),
        onFullscreen: openFullscreen,
        scrollHint: inlineScrollHint,
        hintMode: inputMode,
        zoomInLabel: labels.zoomIn,
        zoomOutLabel: labels.zoomOut,
        fitLabel: labels.fit,
        fullscreenLabel: labels.fullscreen,
    }

    const fullscreenControls = {
        zoom,
        onZoomIn: zoomIn,
        onZoomOut: zoomOut,
        onFit: () => fitToWidth(fullscreenScrollRef.current),
        scrollHint: fullscreenOpen && inputMode === 'pointer'
            ? labels.scrollHint
            : t('ofrenda.export.previewScrollHintTouchFullscreen'),
        hintMode: toolbarHintMode,
        zoomInLabel: labels.zoomIn,
        zoomOutLabel: labels.zoomOut,
        fitLabel: labels.fit,
    }

    const fullscreenModal = fullscreenOpen && mounted
        ? createPortal(
            <div
                className="fixed inset-0 flex flex-col overscroll-none"
                role="dialog"
                aria-modal="true"
                aria-label={labels.fullscreen}
                style={{
                    zIndex: FULLSCREEN_Z_INDEX,
                    backgroundColor: 'hsl(var(--background))',
                }}
            >
                <div
                    className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border shrink-0 bg-background"
                    style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
                >
                    <p className="text-sm font-semibold truncate">{alt}</p>
                    <button
                        type="button"
                        onClick={closeFullscreen}
                        className="p-2 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors touch-manipulation shrink-0"
                        aria-label={labels.close}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <PreviewControls {...fullscreenControls} />

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
                    <PreviewCanvas
                        {...canvasProps}
                        scrollRef={fullscreenScrollRef}
                        maxHeightClass="h-full max-h-none"
                        isFullscreen
                    />
                </div>
            </div>,
            document.body
        )
        : null

    return (
        <>
            {!fullscreenOpen && (
                <div className="rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm">
                    <PreviewControls {...inlineControls} />
                    <PreviewCanvas
                        {...canvasProps}
                        scrollRef={scrollRef}
                    />
                </div>
            )}
            {fullscreenModal}
        </>
    )
}
