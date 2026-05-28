'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Download, Image as ImageIcon, FileText, Gift,
    AlertCircle, Share2, CheckCircle2, Loader2,
    ChevronDown, Info, X, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { ExportLayout } from './ExportLayout'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'

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

const MESES_ES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STEP_LABELS: Record<ExportStep, string> = {
    idle:        '',
    rendering:   'Preparando datos vectoriales…',
    encoding:    'Compilando PDF de alta calidad…',
    downloading: 'Iniciando descarga…',
    done:        '¡Listo!',
}

// ─── Toasts premium con descripción e icono ──────────────────────────────────

function toastOk(title: string, description?: string) {
    toast.success(title, {
        description,
        duration: 4000,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    })
}

function toastWarn(title: string, description?: string) {
    toast.warning(title, {
        description,
        duration: 4500,
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    })
}

function toastErr(title: string, description?: string) {
    toast.error(title, {
        description,
        duration: 5000,
        icon: <X className="w-4 h-4 text-red-500" />,
    })
}

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
    const layoutRef   = useRef<HTMLDivElement>(null)
    const [exportType, setExportType]   = useState<ExportType>(null)
    const [step,       setStep]         = useState<ExportStep>('idle')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [canShare, setCanShare]       = useState(false)

    // Detectar Web Share API con soporte de archivos
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
            setCanShare(true)
        }
    }, [])

    // ── Helper: capturar el layout oculto como PNG data URL ──────────────────
    const captureLayoutPNG = useCallback(async (): Promise<string | null> => {
        if (!layoutRef.current) return null
        setStep('rendering')

        // Forzar pintado del DOM antes de capturar
        await new Promise(r => setTimeout(r, 120))

        setStep('encoding')
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(layoutRef.current, {
            cacheBust: true,
            pixelRatio: 2.5,       // Alta resolución nítida para móviles
            backgroundColor: '#ffffff',
            skipFonts: false,
        })
        return dataUrl
    }, [])

    // ── Exportar PNG (descarga directa) ──────────────────────────────────────
    const handleExportPNG = useCallback(async () => {
        if (!plan) return
        setExportType('png')
        try {
            const dataUrl = await captureLayoutPNG()
            if (!dataUrl) return

            setStep('downloading')
            const link = document.createElement('a')
            link.download = `labor-ofrenda-${MESES_ES[mes].toLowerCase()}-${anio}.png`
            link.href = dataUrl
            document.body.appendChild(link)
            link.click()
            link.remove()

            setStep('done')
            toastOk(
                'Imagen PNG descargada',
                'Perfecta para enviar por grupos de WhatsApp o Telegram.'
            )
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e) {
            console.error('Export PNG error:', e)
            toastErr(
                'Error al generar la imagen',
                'Hubo un problema procesando la vista. Inténtalo de nuevo.'
            )
            setStep('idle'); setExportType(null)
        }
    }, [plan, mes, anio, captureLayoutPNG])

    // ── Exportar PDF VECTORIAL (jsPDF Puro — Nítido, < 100KB, sin popups) ───
    const handleExportPDF = useCallback(async () => {
        if (!plan) return
        setExportType('pdf')
        setStep('rendering')
        try {
            // Importar jsPDF dinámicamente
            const { jsPDF } = await import('jspdf')
            
            // Forzar pequeña pausa para animación fluida de carga
            await new Promise(r => setTimeout(r, 150))
            setStep('encoding')

            // A3 horizontal da el ancho necesario para meses de 5 semanas sin comprimir nombres.
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
            const pageW = 420
            const marginX = 16

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

            // 1. Encabezados generales
            if (base64Logo) {
                doc.addImage(base64Logo, 'JPEG', marginX, 13, 21, 21)
            }

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8.5)
            doc.setTextColor(107, 114, 128) // #6b7280
            doc.text('IGLESIA DE DIOS MINISTERIAL DE JESUCRISTO INTERNACIONAL', pageW / 2, 17, { align: 'center' })

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(22)
            doc.setTextColor(17, 24, 39) // #111827
            doc.text(`Labor Ofrenda — ${MESES_ES[mes]} ${anio}`, pageW / 2, 27, { align: 'center' })

            // Leyenda de colores centrada
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7.5)
            doc.setTextColor(107, 114, 128)

            const legendItems = [
                { color: '#064e3b', label: 'Jueves' },
                { color: '#1e3a5f', label: 'Dom. Mañana' },
                { color: '#3b0764', label: 'Dom. Tarde' },
            ]

            let legendX = (pageW / 2) - 48
            const legendY = 35
            for (const item of legendItems) {
                const rgb = hexToRgb(item.color)
                doc.setFillColor(rgb.r, rgb.g, rgb.b)
                doc.rect(legendX, legendY - 2.2, 2.5, 2.5, 'F') // cuadrado relleno
                doc.text(item.label, legendX + 4, legendY, { align: 'left' })
                legendX += 30
            }

            // 2. Dibujar la Tabla Vectorial
            const { servicios, asignaciones } = plan
            const numCols = servicios.length
            const firstColW = 54
            const printableW = pageW - (marginX * 2)
            const remainingW = printableW - firstColW
            const colW = remainingW / numCols

            // Coordenadas Y
            const startY = 43
            const headerH = 16
            const seqH = 9
            const rowH = 10.5
            const dividerH = 2
            const footerH = 7

            const getFechaLabel = (fecha: string): string => {
                const d = new Date(fecha + 'T00:00:00')
                const dNum = String(d.getDate()).padStart(2, '0')
                const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
                return `${dNum}-${meses[d.getMonth()]}`
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
                    doc.setLineWidth(0.4)
                    doc.setDrawColor(107, 114, 128) // #6b7280
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
                const colors = {
                    jueves:        { bg: '#064e3b', badgeBg: null, badgeTxt: null },
                    domingo:       { bg: '#1e3a5f', badgeBg: '#dbeafe', badgeTxt: 'Mañana' },
                    domingo_tarde: { bg: '#3b0764', badgeBg: '#ede9fe', badgeTxt: 'Tarde' },
                }[srv.dia_tipo]

                doc.setFillColor(hexToRgb(colors.bg).r, hexToRgb(colors.bg).g, hexToRgb(colors.bg).b)
                doc.rect(x, y, w, h, 'F')

                doc.setLineWidth(0.1)
                doc.setDrawColor(209, 213, 219)
                doc.rect(x, y, w, h, 'S')

                if (drawThickLeftBorder) {
                    doc.setLineWidth(0.4)
                    doc.setDrawColor(107, 114, 128)
                    doc.line(x, y, x, y + h)
                }

                // Textos
                doc.setTextColor(255, 255, 255)
                const dayLabel = srv.dia_tipo === 'jueves' ? 'Jueves' : 'Domingo'

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

                        const txtRGB = hexToRgb(srv.dia_tipo === 'domingo' ? '#1e40af' : '#5b21b6')
                        doc.setTextColor(txtRGB.r, txtRGB.g, txtRGB.b)
                        doc.setFont('helvetica', 'bold')
                        doc.setFontSize(6)
                        doc.text(colors.badgeTxt, x + w / 2, badgeY + 2.3, { align: 'center' })
                    }
                }
            }

            // Fila 1: Header
            drawCell('Rol / Fecha', marginX, startY, firstColW, headerH, '#1f2937', '#ffffff', 'bold', 9, 'left')
            servicios.forEach((srv, idx) => {
                const isWeekStart = idx % 3 === 0 && idx > 0
                drawHeaderCell(srv, marginX + firstColW + idx * colW, startY, colW, headerH, isWeekStart)
            })

            // Fila 2: Secuencias de sacos
            let nextY = startY + headerH
            drawCell('Secuencia (sacos)', marginX, nextY, firstColW, seqH, '#f9fafb', '#374151', 'bold', 8.5, 'left')
            servicios.forEach((srv, idx) => {
                const isWeekStart = idx % 3 === 0 && idx > 0
                const colors = {
                    jueves:        { bg: '#ecfdf5', txt: '#065f46' },
                    domingo:       { bg: '#eff6ff', txt: '#1e40af' },
                    domingo_tarde: { bg: '#f5f3ff', txt: '#5b21b6' },
                }[srv.dia_tipo]
                drawCell(srv.secuencia_texto, marginX + firstColW + idx * colW, nextY, colW, seqH, colors.bg, colors.txt, 'bold', 9.5, 'center', isWeekStart)
            })

            // Filas de Grupo 1 (Roles)
            const ROLES_G1 = [
                { key: 'realiza',    label: 'Realiza labor',          bgEven: '#f0fdf4', bgOdd: '#dcfce7', labelTxt: '#065f46' },
                { key: 'apoyo',      label: 'Apoyo',                  bgEven: '#f0fdf4', bgOdd: '#dcfce7', labelTxt: '#065f46' },
                { key: 'vigilancia', label: 'Vigilancia Orientación', bgEven: '#f0fdf4', bgOdd: '#dcfce7', labelTxt: '#065f46' },
            ]

            nextY += seqH
            ROLES_G1.forEach((rol, rIdx) => {
                const rowY = nextY + rIdx * rowH
                const bgLabel = rIdx % 2 === 0 ? rol.bgEven : rol.bgOdd
                drawCell(rol.label, marginX, rowY, firstColW, rowH, bgLabel, rol.labelTxt, 'bold', 8.5, 'left')

                servicios.forEach((srv, idx) => {
                    const isWeekStart = idx % 3 === 0 && idx > 0
                    const asig = asignaciones.find(a => a.servicio_id === srv.id && a.rol === rol.key)
                    const nombre = asig?.miembro?.nombre ?? '—'
                    const cellBg = rIdx % 2 === 0 ? '#f9fafb' : '#f3f4f6'
                    drawCell(nombre, marginX + firstColW + idx * colW, rowY, colW, rowH, cellBg, '#111827', 'bold', 7.2, 'center', isWeekStart)
                })
            })

            // Fila Divisor
            nextY += ROLES_G1.length * rowH
            drawCell('', marginX, nextY, printableW, dividerH, '#374151', '#374151')

            // Filas de Grupo 2 (Colaboradores)
            const ROLES_G2 = [
                { key: 'colaborador_1', label: 'Colaboradores', bgEven: '#eff6ff', bgOdd: '#dbeafe', labelTxt: '#1e40af' },
                { key: 'colaborador_2', label: 'Colaboradores', bgEven: '#eff6ff', bgOdd: '#dbeafe', labelTxt: '#1e40af' },
                { key: 'colaborador_3', label: 'Colaboradores', bgEven: '#eff6ff', bgOdd: '#dbeafe', labelTxt: '#1e40af' },
            ]

            nextY += dividerH
            ROLES_G2.forEach((rol, rIdx) => {
                const rowY = nextY + rIdx * rowH
                const bgLabel = rIdx % 2 === 0 ? rol.bgEven : rol.bgOdd
                drawCell(rol.label, marginX, rowY, firstColW, rowH, bgLabel, rol.labelTxt, 'bold', 8.5, 'left')

                servicios.forEach((srv, idx) => {
                    const isWeekStart = idx % 3 === 0 && idx > 0
                    const asig = asignaciones.find(a => a.servicio_id === srv.id && a.rol === rol.key)
                    const nombre = asig?.miembro?.nombre ?? '—'
                    const cellBg = rIdx % 2 === 0 ? '#f9fafb' : '#f3f4f6'
                    drawCell(nombre, marginX + firstColW + idx * colW, rowY, colW, rowH, cellBg, '#111827', 'bold', 7.2, 'center', isWeekStart)
                })
            })

            // Fila de Semana ISO
            nextY += ROLES_G2.length * rowH
            drawCell('Semana ISO', marginX, nextY, firstColW, footerH, '#1f2937', '#9ca3af', 'bold', 7.5, 'left')
            servicios.forEach((srv, idx) => {
                const isWeekStart = idx % 3 === 0 && idx > 0
                drawCell(`S${srv.semana_iso}`, marginX + firstColW + idx * colW, nextY, colW, footerH, '#1f2937', '#d1d5db', 'bold', 8, 'center', isWeekStart)
            })

            // 3. Pie de página de metadatos
            const footerY = nextY + footerH + 10
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(156, 163, 175) // #9ca3af
            const creationDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
            doc.text(`Generado por IDMJI Gestor de Púlpito · ${creationDate}`, marginX, footerY, { align: 'left' })

            const { sacos_jueves: sJ, sacos_domingo: sD, sacos_domingo_tarde: sDT } = plan.plan
            const sSemana = (sJ ?? 4) + (sD ?? 8) + (sDT ?? 4)
            doc.text(`${sSemana} sacos/semana (J:${sJ ?? 4} · DM:${sD ?? 8} · DT:${sDT ?? 4}) · Ciclo 20 sacos`, pageW - marginX, footerY, { align: 'right' })

            // Guardar archivo PDF directamente
            setStep('downloading')
            doc.save(`labor-ofrenda-${MESES_ES[mes].toLowerCase()}-${anio}.pdf`)

            setStep('done')
            toastOk(
                'Documento PDF descargado',
                'PDF vectorial ultra-ligero (< 30 KB), nítido en cualquier resolución.'
            )
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e) {
            console.error('Export Vector PDF error:', e)
            toastErr(
                'Error al generar el PDF',
                'Inténtalo nuevamente. Si el error persiste, usa la descarga PNG.'
            )
            setStep('idle'); setExportType(null)
        }
    }, [plan, mes, anio])

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
                `labor-ofrenda-${MESES_ES[mes].toLowerCase()}-${anio}.png`,
                { type: 'image/png' }
            )

            if (!navigator.canShare({ files: [file] })) {
                toastWarn('Formato no soportado', 'Tu dispositivo no soporta compartir imágenes desde el navegador.')
                setStep('idle'); setExportType(null)
                return
            }

            await navigator.share({
                title:  `Labor Ofrenda — ${tituloMes} ${anio}`,
                text:   `📋 Labor Ofrenda — ${tituloMes} ${anio}\nIglesia de Dios Ministerial de Jesucristo Internacional`,
                files:  [file],
            })

            setStep('done')
            toastOk('¡Compartido correctamente!', 'La imagen ha sido enviada.')
            setTimeout(() => { setStep('idle'); setExportType(null) }, 1500)
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.error('Share error:', e)
                toastErr('No se pudo compartir', 'Inténtalo de nuevo.')
            }
            setStep('idle'); setExportType(null)
        }
    }, [plan, canShare, mes, anio, tituloMes, captureLayoutPNG])

    // ── Estado vacío ──────────────────────────────────────────────────────────
    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
                <div className="p-5 bg-muted rounded-3xl">
                    <AlertCircle className="w-12 h-12 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-lg font-bold mb-1">Sin plan generado</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Genera el plan mensual en la pestaña «Plan Mensual» antes de exportar.
                    </p>
                </div>
            </div>
        )
    }

    const isExporting = exportType !== null && step !== 'done'

    return (
        <div className="space-y-5">
            {/* ── Banner informativo ───────────────────────────────────── */}
            <div className="flex gap-3 p-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
                <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                    La imagen PNG se genera a <span className="font-bold">2.5x de resolución</span> para verse nítida en pantallas móviles. El PDF es un documento <span className="font-bold">vectorial nativo (menos de 30 KB)</span> con definición perfecta.
                </p>
            </div>

            {/* ── Lista de opciones de exportación (Premium y Justas) ────── */}
            <div className="space-y-3">
                {/* PNG */}
                <ExportOptionRow
                    icon={<ImageIcon className="w-4.5 h-4.5 text-blue-500" />}
                    badge="WhatsApp"
                    badgeColor="blue"
                    title="Descargar Imagen PNG"
                    description="Imagen nítida perfecta para compartir directamente por grupos de WhatsApp o Telegram."
                    actionLabel="Descargar PNG"
                    isActive={exportType === 'png'}
                    isDisabled={isExporting && exportType !== 'png'}
                    step={exportType === 'png' ? step : 'idle'}
                    onAction={handleExportPNG}
                    color="blue"
                />

                {/* PDF */}
                <ExportOptionRow
                    icon={<FileText className="w-4.5 h-4.5 text-red-500" />}
                    badge="Vectorial"
                    badgeColor="red"
                    title="Descargar Documento PDF"
                    description="PDF vectorial súper liviano de calidad óptima para impresión en hojas A4 horizontales."
                    actionLabel="Descargar PDF"
                    isActive={exportType === 'pdf'}
                    isDisabled={isExporting && exportType !== 'pdf'}
                    step={exportType === 'pdf' ? step : 'idle'}
                    onAction={handleExportPDF}
                    color="red"
                />

                {/* Compartir */}
                {canShare && (
                    <ExportOptionRow
                        icon={<Share2 className="w-4.5 h-4.5 text-emerald-500" />}
                        badge="Móvil"
                        badgeColor="green"
                        title="Compartir directamente"
                        description="Abre el menú nativo de tu dispositivo para enviarlo directamente sin descargar."
                        actionLabel="Compartir ahora"
                        isActive={exportType === 'share'}
                        isDisabled={isExporting && exportType !== 'share'}
                        step={exportType === 'share' ? step : 'idle'}
                        onAction={handleShare}
                        color="green"
                    />
                )}
            </div>

            {/* ── Vista previa ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border/50 overflow-hidden">
                <button
                    onClick={() => setPreviewOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    aria-expanded={previewOpen}
                >
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Info className="w-3.5 h-3.5" />
                        Vista previa del documento completo
                    </div>
                    <motion.div
                        animate={{ rotate: previewOpen ? 180 : 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
                            <div className="overflow-x-auto bg-muted/20 p-3">
                                <div
                                    className="relative"
                                    style={{ width: '100%', paddingBottom: '35%', minHeight: 180 }}
                                >
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: 1600,
                                            transformOrigin: 'top left',
                                            transform: 'scale(var(--preview-scale, 0.28))',
                                        }}
                                        ref={el => {
                                            if (el) {
                                                const parent = el.parentElement?.parentElement
                                                if (parent) {
                                                    const scale = (parent.clientWidth - 24) / 1600
                                                    el.style.setProperty('--preview-scale', String(scale))
                                                }
                                            }
                                        }}
                                    >
                                        <ExportLayout
                                            plan={plan}
                                            miembros={miembros}
                                            anio={anio}
                                            mes={mes}
                                        />
                                    </div>
                                </div>
                                <p className="text-center text-[10px] text-muted-foreground mt-2 font-medium">
                                    Vista previa escalada — la exportación real tiene resolución completa
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Layout oculto para captura PNG ───────────────────────── */}
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: -99999,
                    left: -99999,
                    zIndex: -1,
                    pointerEvents: 'none',
                    width: 1600,
                }}
            >
                <ExportLayout
                    ref={layoutRef}
                    plan={plan}
                    miembros={miembros}
                    anio={anio}
                    mes={mes}
                />
            </div>
        </div>
    )
}

// ─── Fila de opción de exportación elegante y compacta ────────────────────────

type CardColor = 'blue' | 'red' | 'green'

const CARD_COLORS: Record<CardColor, {
    bg: string; border: string; badgeBg: string; badgeText: string; btnBg: string; progressBg: string
}> = {
    blue: {
        bg:         'bg-blue-500/3 hover:bg-blue-500/5',
        border:     'border-blue-500/15',
        badgeBg:    'bg-blue-500/10 dark:bg-blue-500/20',
        badgeText:  'text-blue-700 dark:text-blue-300',
        btnBg:      'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30',
        progressBg: 'bg-blue-500',
    },
    red: {
        bg:         'bg-red-500/3 hover:bg-red-500/5',
        border:     'border-red-500/15',
        badgeBg:    'bg-red-500/10 dark:bg-red-500/20',
        badgeText:  'text-red-700 dark:text-red-300',
        btnBg:      'bg-red-600 hover:bg-red-700 focus:ring-red-500/30',
        progressBg: 'bg-red-500',
    },
    green: {
        bg:         'bg-emerald-500/3 hover:bg-emerald-500/5',
        border:     'border-emerald-500/15',
        badgeBg:    'bg-emerald-500/10 dark:bg-emerald-500/20',
        badgeText:  'text-emerald-700 dark:text-emerald-300',
        btnBg:      'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30',
        progressBg: 'bg-emerald-500',
    },
}

function getBtnClass(isDone: boolean, isDisabled: boolean, btnBg: string): string {
    if (isDone) return 'bg-emerald-600 opacity-90'
    if (isDisabled) return 'bg-muted text-muted-foreground cursor-not-allowed'
    return `${btnBg} text-white hover:shadow-sm`
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
    onAction: () => void
    color: CardColor
}>) {
    const c  = CARD_COLORS[color]
    const bc = CARD_COLORS[badgeColor]
    const isDone = step === 'done'
    const isLoading = isActive && step !== 'idle' && step !== 'done'
    const progress = STEP_PROGRESS[step]

    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background border ${c.border} rounded-2xl gap-4 transition-all ${c.bg}`}>
            {/* Info */}
            <div className="flex gap-3 items-start sm:items-center flex-1 min-w-0">
                <div className="p-2.5 bg-background border border-border/50 rounded-xl shrink-0 shadow-sm">
                    {icon}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">{title}</h4>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${bc.badgeBg} ${bc.badgeText}`}>
                            {badge}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed truncate-3-lines">{description}</p>
                    
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
                                <p className="text-[9px] text-muted-foreground font-medium">
                                    {STEP_LABELS[step]}
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
                                ¡Hecho!
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
                                Procesando
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
                                {actionLabel.split(' ')[0]}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    )
}
