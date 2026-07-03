'use client'

import { useRef, useState, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Download, Image as ImageIcon, FileText, Gift,
    AlertCircle, Share2, CheckCircle2, Loader2,
    ChevronDown, Info
} from 'lucide-react'
import { format } from 'date-fns'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from './ofrendaFeedback'
import { ExportLayout } from './ExportLayout'
import { ExportPreviewViewer } from './ExportPreviewViewer'
import { captureExportLayoutToPng } from './exportCapture'
import { ExportScopeControls, type ExportScope } from './ExportScopeControls'
import { ExportPeopleScopeControls } from './ExportPeopleScopeControls'
import {
    type ExportPeopleScope,
    exportPeopleScopeFileSuffix,
    exportIncludesGroup1,
    exportIncludesSacosRows,
} from './exportPeopleScope'
import {
    exportPdfColumnLayout,
    exportPdfHeaderHeightMm,
    exportLayoutWidthPx,
} from './exportLayoutMetrics'
import {
    buildWeekFileSlug,
    formatWeekRangeLabel,
    groupServiciosByWeek,
} from './exportWeekUtils'
import { IDMJI_BRAND, SERVICE_EXPORT_COLORS, EXPORT_CELL } from './exportBrand'
import { buildExportLegend, formatExportPeriodLabel } from './exportHeaderShared'
import { drawExportPdfHeader } from './drawExportPdfHeader'
import { getDateFnsLocale, getExportLabels, getMonthLabel, interpolate } from './ofrendaLocale'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'
import { rolGrupo2AplicaEnTurno } from '@/lib/utils/ofrendaEngine'

// ─── Tipos y constantes ────────────────────────────────────────────────────────

interface ExportPanelProps {
    plan: PlanCompleto | null
    miembros: OfrMiembro[]
    tituloMes: string
    anio: number
    mes: number
}

type ExportStep = 'idle' | 'rendering' | 'encoding' | 'downloading' | 'done'
type ExportType = 'png' | 'pdf' | 'share' | null

function subscribeMount() { return () => {} }
function getMountSnapshot() { return true }
function getServerMountSnapshot() { return false }

// Helper para convertir hex a RGB para jsPDF
function hexToRgb(hex: string) {
    const clean = hex.replace('#', '')
    const num = Number.parseInt(clean, 16)
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ExportPanel({ plan, miembros, tituloMes, anio, mes }: Readonly<ExportPanelProps>) {
    const { t, language } = useI18n()
    const feedback = useOfrendaToast()
    const labels = getExportLabels(language)
    const mesSlug = getMonthLabel(language, mes).toLowerCase().replace(/\s+/g, '-')
    const mesFileBase = `labor-ofrenda-${mesSlug}-${anio}`
    const dateLocale = getDateFnsLocale(language)
    const [exportScope, setExportScope] = useState<ExportScope>('month')
    const [peopleScope, setPeopleScope] = useState<ExportPeopleScope>('all')
    const [extraRoles, setExtraRoles] = useState<string[]>([]) // roles G1 extra, desmarcados por defecto
    const [weekIndex, setWeekIndex] = useState(0)

    // Roles G1 opcionales para el export (orden canónico).
    const EXTRA_G1_ROLES: { key: string; label: string }[] = [
        { key: 'primera_vez', label: t('ofrenda.roles.colaborador1vez') },
        { key: 'segunda_tercera_vez', label: t('ofrenda.roles.colaborador23vez') },
        { key: 'imposicion_manos', label: t('ofrenda.roles.imposicionManos') },
    ]
    const toggleExtraRole = (key: string) =>
        setExtraRoles(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
    const stepLabels: Record<ExportStep, string> = {
        idle: '',
        rendering: t('ofrenda.export.step.rendering'),
        encoding: t('ofrenda.export.step.encoding'),
        downloading: t('ofrenda.export.step.downloading'),
        done: t('ofrenda.export.step.done'),
    }

    const isClient = useSyncExternalStore(subscribeMount, getMountSnapshot, getServerMountSnapshot)
    const layoutRef   = useRef<HTMLDivElement>(null)
    const [exportType, setExportType]   = useState<ExportType>(null)
    const [step,       setStep]         = useState<ExportStep>('idle')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [canShare, setCanShare]       = useState(false)

    const weeks = useMemo(
        () => (plan ? groupServiciosByWeek(plan.servicios) : []),
        [plan],
    )

    const weekRangeLabels = useMemo(
        () => weeks.map(w => formatWeekRangeLabel(w, dateLocale)),
        [weeks, dateLocale],
    )

    useEffect(() => {
        if (weekIndex >= weeks.length) setWeekIndex(0)
    }, [weekIndex, weeks.length])

    const activeServicios = useMemo((): OfrServicio[] => {
        if (!plan) return []
        if (exportScope === 'month') return plan.servicios
        return weeks[weekIndex] ?? []
    }, [plan, exportScope, weeks, weekIndex])

    const layoutWidth = useMemo(
        () => exportLayoutWidthPx(activeServicios.length),
        [activeServicios.length],
    )

    const periodSubtitle = useMemo(() => {
        if (exportScope !== 'week' || weeks.length === 0) return undefined
        const range = weekRangeLabels[weekIndex]
        const weekOf = interpolate(t('ofrenda.week.of'), {
            current: weekIndex + 1,
            total: weeks.length,
        })
        return range ? `${weekOf} · ${range}` : weekOf
    }, [exportScope, weekIndex, weeks.length, weekRangeLabels, t])

    const fileBase = useMemo(() => {
        const peopleSuffix = exportPeopleScopeFileSuffix(peopleScope)
        if (exportScope === 'month') return `${mesFileBase}${peopleSuffix}`
        const slug = buildWeekFileSlug(weekIndex, weekRangeLabels[weekIndex] ?? '')
        return `${mesFileBase}-${slug}${peopleSuffix}`
    }, [exportScope, peopleScope, mesFileBase, weekIndex, weekRangeLabels])

    // Detectar Web Share API con soporte de archivos
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
            setCanShare(true)
        }
    }, [])

    // Vista previa WYSIWYG: misma captura que el PNG exportado
    useEffect(() => {
        if (!previewOpen || !plan) {
            setPreviewUrl(null)
            return
        }
        let cancelled = false
        setPreviewLoading(true)
        setPreviewUrl(null)
        ;(async () => {
            await new Promise(r => setTimeout(r, 120))
            if (!layoutRef.current || cancelled) return
            try {
                const dataUrl = await captureExportLayoutToPng(layoutRef.current, {
                    pixelRatio: 1.5,
                    layoutWidth,
                })
                if (!cancelled) setPreviewUrl(dataUrl)
            } catch (e) {
                console.error('Preview capture error:', e)
            } finally {
                if (!cancelled) setPreviewLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [previewOpen, plan, mes, anio, language, exportScope, peopleScope, extraRoles, weekIndex, activeServicios, layoutWidth, periodSubtitle])

    // ── Helper: capturar el layout oculto como PNG data URL ──────────────────
    const captureLayoutPNG = useCallback(async (): Promise<string | null> => {
        if (!layoutRef.current) return null
        setStep('rendering')

        // Forzar pintado del DOM antes de capturar
        await new Promise(r => setTimeout(r, 120))

        setStep('encoding')
        return captureExportLayoutToPng(layoutRef.current, {
            pixelRatio: exportScope === 'week' ? 2 : 2.5,
            layoutWidth,
        })
    }, [exportScope, layoutWidth])

    // ── Exportar PNG (descarga directa) ──────────────────────────────────────
    const handleExportPNG = useCallback(async () => {
        if (!plan) return
        setExportType('png')
        try {
            const dataUrl = await captureLayoutPNG()
            if (!dataUrl) return

            setStep('downloading')
            const link = document.createElement('a')
            link.download = `${fileBase}.png`
            link.href = dataUrl
            document.body.appendChild(link)
            link.click()
            link.remove()

            setStep('done')
            feedback.quickSuccess(t('ofrenda.toast.pngOk'), t('ofrenda.toast.pngOkDesc'))
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e) {
            console.error('Export PNG error:', e)
            feedback.planError(t('ofrenda.toast.exportError'), t('ofrenda.toast.exportErrorDesc'))
            setStep('idle'); setExportType(null)
        }
    }, [plan, fileBase, captureLayoutPNG, t, feedback])

    // ── Exportar PDF VECTORIAL (jsPDF Puro — Nítido, < 100KB, sin popups) ───
    const handleExportPDF = useCallback(async () => {
        if (!plan || activeServicios.length === 0) return
        setExportType('pdf')
        setStep('rendering')
        try {
            const { jsPDF } = await import('jspdf')

            await new Promise(r => setTimeout(r, 150))
            setStep('encoding')

            const isWeek = exportScope === 'week'
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: isWeek ? 'a4' : 'a3',
            })
            const pageW = isWeek ? 297 : 420
            const marginX = isWeek ? 12 : 16

            // Cargar Logo del sistema
            let base64Logo: string | null = null
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                const img = new Image()
                img.src = '/logo.jpg'
                await new Promise((resolve) => {
                    img.onload = () => {
                        canvas.width = img.width
                        canvas.height = img.height
                        ctx?.drawImage(img, 0, 0)
                        base64Logo = canvas.toDataURL('image/jpeg')
                        resolve(null)
                    }
                    img.onerror = () => resolve(null)
                })
            } catch (e) {
                console.error('Error loading logo in PDF generator:', e)
            }

            const servicios = activeServicios
            const { asignaciones } = plan
            const numCols = servicios.length
            const { firstColW, colW, tableX } = exportPdfColumnLayout(
                pageW,
                marginX,
                numCols,
            )

            const headerBlockH = exportPdfHeaderHeightMm(!!periodSubtitle)
            const periodLabel = formatExportPeriodLabel(tituloMes, anio)
            const startY = drawExportPdfHeader(doc, {
                pageW,
                headerBlockH,
                base64Logo,
                churchName: labels.churchName,
                titleDoc: labels.titleDoc,
                periodLabel,
                periodSubtitle,
                legend: buildExportLegend(labels),
                isWeek,
            })
            const headerH = 16
            const seqH = 9
            const rowH = 10.5
            const dividerH = 2
            const footerH = 7

            const getFechaLabel = (fecha: string): string => {
                const d = new Date(fecha + 'T00:00:00')
                return format(d, 'dd-MMM', { locale: dateLocale })
            }

            const fitLines = (text: string, maxWidth: number, maxLines = 2): string[] => {
                const rawLines = doc.splitTextToSize(text, maxWidth) as string[]
                if (rawLines.length <= maxLines) return rawLines

                const visible = rawLines.slice(0, maxLines)
                const lastLine = visible[maxLines - 1]
                visible[maxLines - 1] = lastLine.length > 3 ? `${lastLine.slice(0, -2)}…` : lastLine
                return visible
            }

            const drawCell = (
                text: string,
                x: number,
                y: number,
                w: number,
                h: number,
                bgHex: string | null,
                textHex: string,
                fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
                fontSize: number = 8,
                align: 'left' | 'center' = 'center',
                drawThickLeftBorder = false
            ) => {
                if (bgHex) {
                    const bgRGB = hexToRgb(bgHex)
                    doc.setFillColor(bgRGB.r, bgRGB.g, bgRGB.b)
                    doc.rect(x, y, w, h, 'F')
                }
                doc.setLineWidth(0.1)
                doc.setDrawColor(209, 213, 219) // #d1d5db
                doc.rect(x, y, w, h, 'S')

                if (drawThickLeftBorder) {
                    // Separador sutil navy (igual que ExportLayout)
                    doc.setLineWidth(0.5)
                    doc.setDrawColor(31, 46, 133, 0.22)
                    doc.line(x, y, x, y + h)
                }

                const textRGB = hexToRgb(textHex)
                doc.setTextColor(textRGB.r, textRGB.g, textRGB.b)
                doc.setFont('helvetica', fontStyle)
                doc.setFontSize(fontSize)

                const fontHeightMm = fontSize * 0.3528
                const textY = y + (h / 2) + (fontHeightMm / 3)

                const paddingX = align === 'center' ? 3 : 4
                const lines = fitLines(text, w - (paddingX * 2))
                if (lines.length === 1) {
                    if (align === 'center') {
                        doc.text(lines[0], x + w / 2, textY, { align: 'center' })
                    } else {
                        doc.text(lines[0], x + paddingX, textY, { align: 'left' })
                    }
                    return
                }

                const lineGap = fontHeightMm * 0.82
                const firstY = y + (h / 2) - (lineGap / 2) + (fontHeightMm / 3)
                lines.forEach((line, index) => {
                    const lineY = firstY + (index * lineGap)
                    if (align === 'center') {
                        doc.text(line, x + w / 2, lineY, { align: 'center' })
                    } else {
                        doc.text(line, x + paddingX, lineY, { align: 'left' })
                    }
                })
            }

            const drawHeaderCell = (
                srv: OfrServicio,
                x: number,
                y: number,
                w: number,
                h: number,
                drawThickLeftBorder = false
            ) => {
                const svc = SERVICE_EXPORT_COLORS[srv.dia_tipo]
                const colors = {
                    bg: svc.headerBg,
                    badgeBg: svc.badgeBg,
                    badgeTxt: srv.dia_tipo === 'domingo' ? labels.manana : srv.dia_tipo === 'domingo_tarde' ? labels.tarde : null,
                }

                doc.setFillColor(hexToRgb(colors.bg).r, hexToRgb(colors.bg).g, hexToRgb(colors.bg).b)
                doc.rect(x, y, w, h, 'F')

                doc.setLineWidth(0.1)
                doc.setDrawColor(209, 213, 219)
                doc.rect(x, y, w, h, 'S')

                if (drawThickLeftBorder) {
                    // Separador sutil navy (igual que ExportLayout)
                    doc.setLineWidth(0.5)
                    doc.setDrawColor(31, 46, 133, 0.22)
                    doc.line(x, y, x, y + h)
                }

                // Textos
                doc.setTextColor(255, 255, 255)
                const dayLabel = srv.dia_tipo === 'jueves' ? labels.jueves : labels.domingo

                if (srv.dia_tipo === 'jueves') {
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(7.5)
                    doc.text(dayLabel, x + w / 2, y + 4.5, { align: 'center' })

                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(8)
                    doc.text(getFechaLabel(srv.fecha), x + w / 2, y + 9, { align: 'center' })
                } else {
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(7)
                    doc.text(dayLabel, x + w / 2, y + 3.8, { align: 'center' })

                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(7.5)
                    doc.text(getFechaLabel(srv.fecha), x + w / 2, y + 7.2, { align: 'center' })

                    if (colors.badgeBg && colors.badgeTxt) {
                        const bRGB = hexToRgb(colors.badgeBg)
                        doc.setFillColor(bRGB.r, bRGB.g, bRGB.b)
                        
                        const badgeW = w - 3
                        const badgeH = 3.2
                        const badgeX = x + (w - badgeW) / 2
                        const badgeY = y + 8.5
                        doc.rect(badgeX, badgeY, badgeW, badgeH, 'F')

                        const txtRGB = hexToRgb(svc.seqText)
                        doc.setTextColor(txtRGB.r, txtRGB.g, txtRGB.b)
                        doc.setFont('helvetica', 'bold')
                        doc.setFontSize(6)
                        doc.text(colors.badgeTxt, x + w / 2, badgeY + 2.3, { align: 'center' })
                    }
                }
            }

            // Fila 1: Header
            drawCell(labels.rolFecha, tableX, startY, firstColW, headerH, IDMJI_BRAND.tableMeta, '#ffffff', 'bold', 9, 'left')
            servicios.forEach((srv, idx) => {
                const isWeekStart = idx % 3 === 0 && idx > 0
                drawHeaderCell(srv, tableX + firstColW + idx * colW, startY, colW, headerH, isWeekStart)
            })

            const showSacos = exportIncludesSacosRows(peopleScope)
            const showG1 = exportIncludesGroup1(peopleScope)

            let nextY = startY + headerH
            if (showSacos) {
                drawCell(labels.secuencia, tableX, nextY, firstColW, seqH, IDMJI_BRAND.goldPale, IDMJI_BRAND.navy, 'bold', 8.5, 'left')
                servicios.forEach((srv, idx) => {
                    const isWeekStart = idx % 3 === 0 && idx > 0
                    const svc = SERVICE_EXPORT_COLORS[srv.dia_tipo]
                    drawCell(srv.secuencia_texto, tableX + firstColW + idx * colW, nextY, colW, seqH, svc.seqBg, svc.seqText, 'bold', 9.5, 'center', isWeekStart)
                })
                nextY += seqH
            }

            if (showG1) {
                const g1 = SERVICE_EXPORT_COLORS.jueves
                const extraG1Defs = [
                    { key: 'primera_vez', label: labels.primeraVez },
                    { key: 'segunda_tercera_vez', label: labels.segundaTerceraVez },
                    { key: 'imposicion_manos', label: labels.imposicionManos },
                ].filter(r => extraRoles.includes(r.key))
                const ROLES_G1: { key: string; label: string; bgEven: string; bgOdd: string; labelTxt: string }[] = [
                    { key: 'realiza',    label: labels.realiza,    bgEven: g1.labelBgEven, bgOdd: g1.labelBgOdd, labelTxt: g1.labelText },
                    { key: 'apoyo',      label: labels.apoyo,      bgEven: g1.labelBgEven, bgOdd: g1.labelBgOdd, labelTxt: g1.labelText },
                    { key: 'vigilancia', label: labels.vigilancia, bgEven: g1.labelBgEven, bgOdd: g1.labelBgOdd, labelTxt: g1.labelText },
                    ...extraG1Defs.map(r => ({ key: r.key, label: r.label, bgEven: g1.labelBgEven, bgOdd: g1.labelBgOdd, labelTxt: g1.labelText })),
                ]

                ROLES_G1.forEach((rol, rIdx) => {
                    const rowY = nextY + rIdx * rowH
                    const bgLabel = rIdx % 2 === 0 ? rol.bgEven : rol.bgOdd
                    drawCell(rol.label, tableX, rowY, firstColW, rowH, bgLabel, rol.labelTxt, 'bold', 8.5, 'left')

                    servicios.forEach((srv, idx) => {
                        const isWeekStart = idx % 3 === 0 && idx > 0
                        const asig = asignaciones.find(a => a.servicio_id === srv.id && a.rol === rol.key)
                        const nombre = asig?.miembro?.nombre ?? '—'
                        const cellBg = rIdx % 2 === 0 ? EXPORT_CELL.bodyEven : EXPORT_CELL.bodyOdd
                        drawCell(nombre, tableX + firstColW + idx * colW, rowY, colW, rowH, cellBg, IDMJI_BRAND.text, 'bold', 7.2, 'center', isWeekStart)
                    })
                })

                nextY += ROLES_G1.length * rowH
                const tableW = firstColW + numCols * colW
                drawCell('', tableX, nextY, tableW, dividerH, EXPORT_CELL.divider, EXPORT_CELL.divider)
                nextY += dividerH
            }

            // Filas de Grupo 2 (Colaboradores)
            const g2 = SERVICE_EXPORT_COLORS.domingo
            const ROLES_G2 = [
                { key: 'colaborador_1' as const, label: labels.colaborador1, bgEven: g2.labelBgEven, bgOdd: g2.labelBgOdd, labelTxt: g2.labelText },
                { key: 'colaborador_2' as const, label: labels.colaborador2, bgEven: g2.labelBgEven, bgOdd: g2.labelBgOdd, labelTxt: g2.labelText },
                { key: 'colaborador_3' as const, label: labels.colaborador3, bgEven: g2.labelBgEven, bgOdd: g2.labelBgOdd, labelTxt: g2.labelText },
            ]

            ROLES_G2.forEach((rol, rIdx) => {
                const rowY = nextY + rIdx * rowH
                const bgLabel = rIdx % 2 === 0 ? rol.bgEven : rol.bgOdd
                drawCell(rol.label, tableX, rowY, firstColW, rowH, bgLabel, rol.labelTxt, 'bold', 8.5, 'left')

                servicios.forEach((srv, idx) => {
                    const isWeekStart = idx % 3 === 0 && idx > 0
                    const aplica = rolGrupo2AplicaEnTurno(rol.key, srv.dia_tipo)
                    const asig = aplica
                        ? asignaciones.find(a => a.servicio_id === srv.id && a.rol === rol.key)
                        : null
                    const nombre = aplica ? (asig?.miembro?.nombre ?? '—') : '—'
                    const cellBg = rIdx % 2 === 0 ? EXPORT_CELL.bodyEven : EXPORT_CELL.bodyOdd
                    drawCell(nombre, tableX + firstColW + idx * colW, rowY, colW, rowH, cellBg, IDMJI_BRAND.text, 'bold', 7.2, 'center', isWeekStart)
                })
            })

            // Fila de Semana ISO
            nextY += ROLES_G2.length * rowH
            drawCell(labels.semanaIso, tableX, nextY, firstColW, footerH, IDMJI_BRAND.tableMeta, '#b8c0cc', 'bold', 7.5, 'left')
            servicios.forEach((srv, idx) => {
                const isWeekStart = idx % 3 === 0 && idx > 0
                drawCell(`S${srv.semana_iso}`, tableX + firstColW + idx * colW, nextY, colW, footerH, IDMJI_BRAND.navyDark, '#e2e8f0', 'bold', 8, 'center', isWeekStart)
            })

            // 3. Pie de página de metadatos
            const footerY = nextY + footerH + 10
            const goldLine = hexToRgb(IDMJI_BRAND.gold)
            doc.setDrawColor(goldLine.r, goldLine.g, goldLine.b)
            doc.setLineWidth(0.35)
            doc.line(marginX, footerY - 5, pageW - marginX, footerY - 5)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(122, 122, 122)
            const localeTag = language === 'ca-ES' ? 'ca-ES' : 'es-ES'
            const creationDate = new Date().toLocaleDateString(localeTag, { day: '2-digit', month: 'long', year: 'numeric' })
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(122, 122, 122)
            const footerAlign = peopleScope === 'g2' ? 'center' : 'left'
            doc.text(`${labels.footer} · ${creationDate}`, peopleScope === 'g2' ? pageW / 2 : tableX, footerY, { align: footerAlign })

            if (peopleScope === 'all') {
                const { sacos_jueves: sJ, sacos_domingo: sD, sacos_domingo_tarde: sDT } = plan.plan
                const sSemana = (sJ ?? 4) + (sD ?? 8) + (sDT ?? 4)
                doc.text(labels.sacosMeta(sSemana, sJ ?? 4, sD ?? 8, sDT ?? 4), pageW - marginX, footerY, { align: 'right' })
            }

            setStep('downloading')
            doc.save(`${fileBase}.pdf`)

            setStep('done')
            feedback.quickSuccess(t('ofrenda.toast.pdfOk'), t('ofrenda.toast.pdfOkDesc'))
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e) {
            console.error('Export Vector PDF error:', e)
            feedback.planError(t('ofrenda.toast.exportError'), t('ofrenda.toast.exportErrorDesc'))
            setStep('idle'); setExportType(null)
        }
    }, [
        plan,
        activeServicios,
        exportScope,
        peopleScope,
        extraRoles,
        periodSubtitle,
        tituloMes,
        anio,
        fileBase,
        labels,
        dateLocale,
        language,
        t,
        feedback,
    ])

    // ── Compartir vía Web Share API (nativo móvil → WhatsApp, etc.) ──────────
    const handleShare = useCallback(async () => {
        if (!plan || !canShare) return
        setExportType('share')
        try {
            const dataUrl = await captureLayoutPNG()
            if (!dataUrl) return

            setStep('downloading')

            const res = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File(
                [blob],
                `${fileBase}.png`,
                { type: 'image/png' }
            )

            if (!navigator.canShare({ files: [file] })) {
                feedback.quickWarning(t('ofrenda.export.shareWarn'), t('ofrenda.export.shareWarnDesc'))
                setStep('idle'); setExportType(null)
                return
            }

            const shareLine = interpolate(t('ofrenda.export.shareText'), { month: tituloMes, year: String(anio) })
            await navigator.share({
                title: shareLine,
                text: `📋 ${shareLine}\n${labels.churchName}`,
                files: [file],
            })

            setStep('done')
            feedback.quickSuccess(t('ofrenda.toast.shareOk'), t('ofrenda.toast.shareOkDesc'))
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.error('Share error:', e)
                feedback.planError(t('ofrenda.toast.shareError'), t('ofrenda.toast.exportErrorDesc'))
            }
            setStep('idle'); setExportType(null)
        }
    }, [plan, canShare, fileBase, tituloMes, anio, labels, captureLayoutPNG, t, feedback])

    // ── Estado vacío ──────────────────────────────────────────────────────────
    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
                <div className="p-5 bg-muted rounded-3xl">
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-bold mb-1">{t('ofrenda.export.empty.title')}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {t('ofrenda.export.empty.desc')}
                    </p>
                </div>
            </div>
        )
    }

    const isExporting = exportType !== null && step !== 'done'

    return (
        <div className="relative z-10 space-y-5 bg-background">
            {/* ── Banner informativo ───────────────────────────────────── */}
            <div className="flex gap-3 p-3.5 bg-gradient-to-br from-[#f8f3e8] to-white border border-[rgba(184,150,74,0.35)] rounded-2xl">
                <Gift className="w-4 h-4 text-[#b68f2f] mt-0.5 shrink-0" />
                <p className="text-xs text-[#1f2e85] font-medium leading-relaxed">
                    {t('ofrenda.export.banner')}
                </p>
            </div>

            <ExportScopeControls
                scope={exportScope}
                onScopeChange={setExportScope}
                weekIndex={weekIndex}
                weeks={weeks}
                weekRangeLabels={weekRangeLabels}
                onWeekChange={setWeekIndex}
                disabled={isExporting}
                labels={{
                    scopeMonth: t('ofrenda.export.scope.month'),
                    scopeWeek: t('ofrenda.export.scope.week'),
                    weekPicker: t('ofrenda.export.scope.label'),
                    weekChip: (n, total) =>
                        interpolate(t('ofrenda.export.scope.weekChip'), { n, total }),
                }}
            />

            <ExportPeopleScopeControls
                scope={peopleScope}
                onScopeChange={setPeopleScope}
                disabled={isExporting}
                labels={{
                    label: t('ofrenda.export.people.label'),
                    all: t('ofrenda.export.people.all'),
                    g2: t('ofrenda.export.people.g2'),
                }}
            />

            {peopleScope === 'g2' ? (
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-0.5">
                    {t('ofrenda.export.people.g2Hint')}
                </p>
            ) : (
                <div className="space-y-2" data-testid="ofrenda-export-extra-roles">
                    <p className="text-xs font-semibold text-slate-500">
                        {t('ofrenda.export.extraRoles.label')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {EXTRA_G1_ROLES.map(({ key, label }) => {
                            const on = extraRoles.includes(key)
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={on}
                                    disabled={isExporting}
                                    data-testid={`ofrenda-export-extra-${key}`}
                                    onClick={() => toggleExtraRole(key)}
                                    className={`inline-flex items-center gap-1.5 min-h-[40px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                                        on
                                            ? 'bg-[#1f2e85] text-white border-[#b8964a] shadow-sm'
                                            : 'bg-white border-[rgba(184,150,74,0.3)] text-slate-500 hover:bg-[#f8f3e8] hover:border-[#b8964a]'
                                    }`}
                                >
                                    <span
                                        className={`flex h-4 w-4 items-center justify-center rounded-[5px] border ${
                                            on ? 'border-white bg-white/20' : 'border-[rgba(184,150,74,0.4)]'
                                        }`}
                                    >
                                        {on && <CheckCircle2 className="h-3 w-3" />}
                                    </span>
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-0.5">
                        {t('ofrenda.export.extraRoles.hint')}
                    </p>
                </div>
            )}

            {/* ── Lista de opciones de exportación (Premium y Justas) ────── */}
            <div className="space-y-3">
                {/* PNG */}
                <ExportOptionRow
                    icon={<ImageIcon className="w-4.5 h-4.5 text-blue-500" />}
                    badge={t('ofrenda.export.badge.whatsapp')}
                    badgeColor="blue"
                    title={t('ofrenda.export.png.title')}
                    description={t('ofrenda.export.png.desc')}
                    actionLabel={t('ofrenda.export.png.btn')}
                    isActive={exportType === 'png'}
                    isDisabled={isExporting && exportType !== 'png'}
                    step={exportType === 'png' ? step : 'idle'}
                    stepLabels={stepLabels}
                    processingLabel={t('ofrenda.export.processing')}
                    doneLabel={t('ofrenda.export.doneBtn')}
                    onAction={handleExportPNG}
                    color="blue"
                />

                <ExportOptionRow
                    icon={<FileText className="w-4.5 h-4.5 text-red-500" />}
                    badge={t('ofrenda.export.badge.vector')}
                    badgeColor="red"
                    title={t('ofrenda.export.pdf.title')}
                    description={
                        exportScope === 'week'
                            ? t('ofrenda.export.pdf.descWeek')
                            : t('ofrenda.export.pdf.desc')
                    }
                    actionLabel={t('ofrenda.export.pdf.btn')}
                    isActive={exportType === 'pdf'}
                    isDisabled={isExporting && exportType !== 'pdf'}
                    step={exportType === 'pdf' ? step : 'idle'}
                    stepLabels={stepLabels}
                    processingLabel={t('ofrenda.export.processing')}
                    doneLabel={t('ofrenda.export.doneBtn')}
                    onAction={handleExportPDF}
                    color="red"
                />

                {canShare && (
                    <ExportOptionRow
                        icon={<Share2 className="w-4.5 h-4.5 text-emerald-500" />}
                        badge={t('ofrenda.export.badge.mobile')}
                        badgeColor="green"
                        title={t('ofrenda.export.share.title')}
                        description={t('ofrenda.export.share.desc')}
                        actionLabel={t('ofrenda.export.share.btn')}
                        isActive={exportType === 'share'}
                        isDisabled={isExporting && exportType !== 'share'}
                        step={exportType === 'share' ? step : 'idle'}
                        stepLabels={stepLabels}
                        processingLabel={t('ofrenda.export.processing')}
                        doneLabel={t('ofrenda.export.doneBtn')}
                        onAction={handleShare}
                        color="green"
                    />
                )}
            </div>

            {/* ── Vista previa ─────────────────────────────────────────── */}
            <div className="ofrenda-liquid-card overflow-hidden">
                <button
                    onClick={() => setPreviewOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#f8f3e8]/60 hover:bg-[#f8f3e8] transition-colors text-left"
                    aria-expanded={previewOpen}
                >
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Info className="w-3.5 h-3.5" />
                        {t('ofrenda.export.preview')}
                    </div>
                    <motion.div
                        animate={{ rotate: previewOpen ? 180 : 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                </button>

                <AnimatePresence initial={false}>
                    {previewOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 bg-white/50 space-y-2">
                                {previewLoading && (
                                    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('ofrenda.export.previewLoading')}
                                    </div>
                                )}
                                {!previewLoading && previewUrl && (
                                    <ExportPreviewViewer
                                        imageUrl={previewUrl}
                                        alt={t('ofrenda.export.preview')}
                                    />
                                )}
                                {!previewLoading && !previewUrl && (
                                    <p className="text-center py-8 text-sm text-slate-500">
                                        {t('ofrenda.toast.exportError')}
                                    </p>
                                )}
                                <p className="text-center text-[10px] text-slate-500 font-medium px-1">
                                    {t('ofrenda.export.previewNote')}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Layout en portal (body) para captura PNG completa en móvil */}
            {isClient && plan && createPortal(
                <div
                    id="ofrenda-export-capture-root"
                    aria-hidden="true"
                    data-export-capture="true"
                    style={{
                        position: 'fixed',
                        left: '-10000px',
                        top: 0,
                        width: layoutWidth,
                        minWidth: layoutWidth,
                        maxWidth: 'none',
                        pointerEvents: 'none',
                        overflow: 'visible',
                    }}
                >
                    <ExportLayout
                        ref={layoutRef}
                        plan={plan}
                        miembros={miembros}
                        mesTitulo={getMonthLabel(language, mes)}
                        anio={anio}
                        labels={labels}
                        servicios={activeServicios}
                        periodSubtitle={periodSubtitle}
                        exportScope={exportScope}
                        peopleScope={peopleScope}
                        extraG1Roles={extraRoles}
                    />
                </div>,
                document.body
            )}
        </div>
    )
}

// ─── Fila de opción de exportación elegante y compacta ────────────────────────

type CardColor = 'blue' | 'red' | 'green'

const CARD_COLORS: Record<CardColor, {
    bg: string; border: string; badgeBg: string; badgeText: string; btnBg: string; progressBg: string
}> = {
    blue: {
        bg:         'hover:bg-[#f8f3e8]/40',
        border:     'border-blue-500/15',
        badgeBg:    'bg-blue-500/10',
        badgeText:  'text-blue-700',
        btnBg:      'bg-gradient-to-br from-[#1f2e85] to-[#283593] border-2 border-[#b8964a] hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] focus:ring-[#b8964a]/30',
        progressBg: 'bg-blue-500',
    },
    red: {
        bg:         'hover:bg-[#f8f3e8]/40',
        border:     'border-red-500/15',
        badgeBg:    'bg-red-500/10',
        badgeText:  'text-red-700',
        btnBg:      'bg-gradient-to-br from-[#1f2e85] to-[#283593] border-2 border-[#b8964a] hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] focus:ring-[#b8964a]/30',
        progressBg: 'bg-red-500',
    },
    green: {
        bg:         'hover:bg-[#f8f3e8]/40',
        border:     'border-emerald-500/15',
        badgeBg:    'bg-emerald-500/10',
        badgeText:  'text-emerald-700',
        btnBg:      'bg-gradient-to-br from-[#1f2e85] to-[#283593] border-2 border-[#b8964a] hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] focus:ring-[#b8964a]/30',
        progressBg: 'bg-emerald-500',
    },
}

function getBtnClass(isDone: boolean, isDisabled: boolean, btnBg: string): string {
    if (isDone) return 'bg-emerald-600 border-2 border-emerald-600 opacity-90'
    if (isDisabled) return 'bg-slate-200 text-slate-400 border-2 border-slate-200 cursor-not-allowed'
    return `${btnBg} text-white`
}

const STEP_PROGRESS: Record<ExportStep, number> = {
    idle:        0,
    rendering:   33,
    encoding:    66,
    downloading: 90,
    done:        100,
}

function ExportOptionRow({
    icon,
    badge,
    badgeColor,
    title,
    description,
    actionLabel,
    isActive,
    isDisabled,
    step,
    stepLabels,
    processingLabel,
    doneLabel,
    onAction,
    color,
}: Readonly<{
    icon: React.ReactNode
    badge: string
    badgeColor: CardColor
    title: string
    description: string
    actionLabel: string
    isActive: boolean
    isDisabled: boolean
    step: ExportStep
    stepLabels: Record<ExportStep, string>
    processingLabel: string
    doneLabel: string
    onAction: () => void
    color: CardColor
}>) {
    const c  = CARD_COLORS[color]
    const bc = CARD_COLORS[badgeColor]
    const isDone = step === 'done'
    const isLoading = isActive && step !== 'idle' && step !== 'done'
    const progress = STEP_PROGRESS[step]

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 ofrenda-liquid-card gap-4 transition-all ${c.bg}`}>
            {/* Info */}
            <div className="flex gap-3 items-start sm:items-center flex-1 min-w-0">
                <div className="p-2.5 bg-[#f8f3e8] border border-[rgba(184,150,74,0.3)] rounded-xl shrink-0 shadow-sm">
                    {icon}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-800">{title}</h4>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${bc.badgeBg} ${bc.badgeText}`}>
                            {badge}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed truncate-3-lines">{description}</p>
                    
                    {/* Barra de progreso incrustada */}
                    <AnimatePresence>
                        {isActive && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1 pt-1.5 max-w-sm"
                            >
                                <div className="h-1 bg-border rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${c.progressBg} rounded-full`}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                    />
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium">
                                    {stepLabels[step]}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
                <motion.button
                    whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                    onClick={onAction}
                    disabled={isDisabled || isLoading || isDone}
                    className={`w-full sm:w-36 flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold rounded-xl transition-all touch-manipulation min-h-[38px] ${getBtnClass(isDone, isDisabled, c.btnBg)}`}
                    aria-label={actionLabel}
                >
                    <AnimatePresence mode="wait">
                        {isDone && (
                            <motion.span
                                key="done"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {doneLabel}
                            </motion.span>
                        )}
                        {isLoading && !isDone && (
                            <motion.span
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-1.5"
                            >
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {processingLabel}
                            </motion.span>
                        )}
                        {!isDone && !isLoading && (
                            <motion.span
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {actionLabel}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    )
}
