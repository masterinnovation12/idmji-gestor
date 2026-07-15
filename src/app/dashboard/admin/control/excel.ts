'use server'

import ExcelJS from 'exceljs'
import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResponse } from '@/types/database'
import { getControlData } from './actions'

/**
 * Export Excel premium del panel de control (solo ADMIN).
 * Todas las etiquetas visibles llegan traducidas desde el cliente (i18n),
 * el servidor solo compone datos y estilo.
 */

export interface ExcelLabels {
    titulo: string
    resumen: string
    cultosSheet: string
    participacionesSheet: string
    laboresSheet: string
    sedesSheet: string
    sedeTodas: string
    mes: string
    generado: string
    kpiCultos: string
    kpiRealizados: string
    kpiPlaneados: string
    kpiParticipaciones: string
    kpiHermanos: string
    kpiLecturas: string
    kpiUsuarios: string
    kpiMiembrosLabor: string
    kpiPersonasPlano: string
    kpiServiciosLabores: string
    colFecha: string
    colHora: string
    colSede: string
    colTipo: string
    colEstado: string
    colIntro: string
    colEnsenanza: string
    colTestimonios: string
    colFinalizacion: string
    colLecturas: string
    colHermano: string
    colTotal: string
    colTurno: string
    colSecuencia: string
    colCultos: string
    colUsuarios: string
    colActiva: string
    si: string
    no: string
    estados: Record<string, string>
    turnos: Record<string, string>
    roles: Record<string, string>
}

const NAVY = 'FF1F2E85'
const NAVY_LIGHT = 'FF283593'
const GOLD = 'FFB8964A'
const CREAM = 'FFF8F3E8'
const WHITE = 'FFFFFFFF'
const ZEBRA = 'FFF6F7FB'

const ROLES_ORDEN = [
    'realiza',
    'apoyo',
    'vigilancia',
    'primera_vez',
    'segunda_tercera_vez',
    'imposicion_manos',
    'colaborador_1',
    'colaborador_2',
    'colaborador_3',
    'testimonio_1',
    'testimonio_2',
] as const

function thinBorder(): Partial<ExcelJS.Borders> {
    const side: ExcelJS.Border = { style: 'thin', color: { argb: 'FFE2E1D8' } }
    return { top: side, left: side, bottom: side, right: side }
}

function fill(argb: string): ExcelJS.FillPattern {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

/** Cabecera de marca (título + subtítulo) para una hoja. */
function addBrandHeader(ws: ExcelJS.Worksheet, titulo: string, subtitulo: string, cols: number) {
    ws.mergeCells(1, 1, 1, cols)
    const title = ws.getCell(1, 1)
    title.value = titulo
    title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: WHITE } }
    title.fill = fill(NAVY)
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(1).height = 34

    ws.mergeCells(2, 1, 2, cols)
    const sub = ws.getCell(2, 1)
    sub.value = subtitulo
    sub.font = { name: 'Calibri', size: 11, italic: true, color: { argb: NAVY } }
    sub.fill = fill(CREAM)
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(2).height = 20

    // Línea dorada
    ws.mergeCells(3, 1, 3, cols)
    ws.getCell(3, 1).fill = fill(GOLD)
    ws.getRow(3).height = 4
}

function styleHeaderRow(row: ExcelJS.Row) {
    row.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }
        cell.fill = fill(NAVY_LIGHT)
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = thinBorder()
    })
    row.height = 22
}

function styleDataRow(row: ExcelJS.Row, zebra: boolean) {
    row.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } }
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        cell.border = thinBorder()
        if (zebra) cell.fill = fill(ZEBRA)
    })
}

export async function exportControlExcel(
    sedeId: string | null,
    year: number,
    month: number,
    mesNombre: string,
    labels: ExcelLabels,
): Promise<ActionResponse<{ base64: string; filename: string }>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const dataRes = await getControlData(sedeId, year, month)
    if (!dataRes.success || !dataRes.data) return { success: false, error: dataRes.error ?? 'Error' }
    const data = dataRes.data

    try {
        const admin = createAdminClient()
        const sedeLabel = sedeId
            ? data.sedesResumen.find(s => s.sedeId === sedeId)?.nombre ?? ''
            : labels.sedeTodas
        const subtitulo = `${sedeLabel} · ${mesNombre} ${year} · ${labels.generado} ${new Date().toLocaleString('sv-SE').slice(0, 16)}`

        const wb = new ExcelJS.Workbook()
        wb.creator = labels.titulo

        // ── Hoja Resumen ─────────────────────────────────────────────────────
        const resumen = wb.addWorksheet(labels.resumen)
        resumen.columns = [{ width: 4 }, { width: 38 }, { width: 16 }, { width: 4 }]
        addBrandHeader(resumen, labels.titulo, subtitulo, 4)

        const kpis: Array<[string, number]> = [
            [labels.kpiCultos, data.kpis.cultos],
            [labels.kpiRealizados, data.kpis.cultosRealizados],
            [labels.kpiPlaneados, data.kpis.cultosPlaneados],
            [labels.kpiParticipaciones, data.kpis.participaciones],
            [labels.kpiHermanos, data.kpis.hermanosActivos],
            [labels.kpiLecturas, data.kpis.lecturas],
            [labels.kpiUsuarios, data.kpis.usuarios],
            [labels.kpiMiembrosLabor, data.kpis.miembrosLabor],
            [labels.kpiPersonasPlano, data.kpis.personasPlano],
            [labels.kpiServiciosLabores, data.kpis.serviciosLabores],
        ]
        let rowIdx = 5
        for (const [label, value] of kpis) {
            const labelCell = resumen.getCell(rowIdx, 2)
            const valueCell = resumen.getCell(rowIdx, 3)
            labelCell.value = label
            labelCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF334155' } }
            valueCell.value = value
            valueCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } }
            valueCell.alignment = { horizontal: 'right' }
            if (rowIdx % 2 === 0) {
                labelCell.fill = fill(CREAM)
                valueCell.fill = fill(CREAM)
            }
            labelCell.border = thinBorder()
            valueCell.border = thinBorder()
            rowIdx++
        }

        // ── Hoja Cultos ──────────────────────────────────────────────────────
        const cultosWs = wb.addWorksheet(labels.cultosSheet)
        const cultosCols = [
            labels.colFecha, labels.colHora, labels.colSede, labels.colTipo, labels.colEstado,
            labels.colIntro, labels.colEnsenanza, labels.colTestimonios, labels.colFinalizacion, labels.colLecturas,
        ]
        cultosWs.columns = [
            { width: 12 }, { width: 8 }, { width: 14 }, { width: 16 }, { width: 12 },
            { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 34 },
        ]
        addBrandHeader(cultosWs, labels.cultosSheet, subtitulo, cultosCols.length)
        styleHeaderRow(cultosWs.addRow(cultosCols))
        data.cultos.forEach((c, i) => {
            const row = cultosWs.addRow([
                c.fecha, c.hora, c.sede, c.tipoNombre, labels.estados[c.estado] ?? c.estado,
                c.intro ?? '—', c.ensenanza ?? '—', c.testimonios ?? '—', c.finalizacion ?? '—',
                c.lecturas.join(' · ') || '—',
            ])
            styleDataRow(row, i % 2 === 1)
        })
        cultosWs.views = [{ state: 'frozen', ySplit: 4 }]
        cultosWs.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + data.cultos.length, column: cultosCols.length } }

        // ── Hoja Participaciones ─────────────────────────────────────────────
        const partWs = wb.addWorksheet(labels.participacionesSheet)
        const partCols = [
            labels.colHermano, labels.colSede, labels.colIntro, labels.colEnsenanza,
            labels.colTestimonios, labels.colFinalizacion, labels.colTotal,
        ]
        partWs.columns = [{ width: 26 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }]
        addBrandHeader(partWs, labels.participacionesSheet, subtitulo, partCols.length)
        styleHeaderRow(partWs.addRow(partCols))
        data.hermanos.forEach((h, i) => {
            const row = partWs.addRow([h.nombre, h.sede, h.intro, h.ensenanza, h.testimonios, h.finalizacion, h.total])
            styleDataRow(row, i % 2 === 1)
            row.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: NAVY } }
            if (i < 3 && h.total > 0) row.getCell(1).fill = fill('FFF3E8C9')
        })
        partWs.views = [{ state: 'frozen', ySplit: 4 }]

        // ── Hoja Labores ─────────────────────────────────────────────────────
        const sedeIds = data.sedesResumen.map(s => s.sedeId)
        const { data: planes } = await admin
            .from('ofrenda_planes')
            .select('id, sede_id')
            .in('sede_id', sedeIds)
            .eq('anio', year)
            .eq('mes', month)
        const planIds = (planes ?? []).map(p => p.id)
        const sedeDePlan = new Map((planes ?? []).map(p => [p.id as string, p.sede_id as string]))
        const sedeNombre = new Map(data.sedesResumen.map(s => [s.sedeId, s.nombre]))

        const laboresWs = wb.addWorksheet(labels.laboresSheet)
        const rolCols = ROLES_ORDEN.map(r => labels.roles[r] ?? r)
        const laboresCols = [labels.colSede, labels.colFecha, labels.colTurno, labels.colSecuencia, ...rolCols]
        laboresWs.columns = [
            { width: 14 }, { width: 12 }, { width: 14 }, { width: 12 },
            ...ROLES_ORDEN.map(() => ({ width: 18 })),
        ]
        addBrandHeader(laboresWs, labels.laboresSheet, subtitulo, laboresCols.length)
        styleHeaderRow(laboresWs.addRow(laboresCols))

        if (planIds.length > 0) {
            const [serviciosRes, miembrosRes] = await Promise.all([
                admin
                    .from('ofrenda_servicios')
                    .select('id, plan_id, fecha, dia_tipo, secuencia_texto')
                    .in('plan_id', planIds)
                    .order('fecha'),
                admin.from('ofrenda_miembros').select('id, nombre').in('sede_id', sedeIds),
            ])
            const servicios = serviciosRes.data ?? []
            const nombreMiembro = new Map((miembrosRes.data ?? []).map(m => [m.id as string, m.nombre as string]))
            const servicioIds = servicios.map(s => s.id)
            const asigPorServicio = new Map<string, Map<string, string>>()
            if (servicioIds.length > 0) {
                const { data: asignaciones } = await admin
                    .from('ofrenda_asignaciones')
                    .select('servicio_id, rol, miembro_id')
                    .in('servicio_id', servicioIds)
                for (const a of asignaciones ?? []) {
                    const porRol = asigPorServicio.get(a.servicio_id) ?? new Map<string, string>()
                    if (a.miembro_id) porRol.set(a.rol, nombreMiembro.get(a.miembro_id) ?? '—')
                    asigPorServicio.set(a.servicio_id, porRol)
                }
            }
            servicios.forEach((s, i) => {
                const porRol = asigPorServicio.get(s.id) ?? new Map<string, string>()
                const row = laboresWs.addRow([
                    sedeNombre.get(sedeDePlan.get(s.plan_id) ?? '') ?? '',
                    s.fecha,
                    labels.turnos[s.dia_tipo] ?? s.dia_tipo,
                    s.secuencia_texto,
                    ...ROLES_ORDEN.map(r => porRol.get(r) ?? '—'),
                ])
                styleDataRow(row, i % 2 === 1)
            })
        }
        laboresWs.views = [{ state: 'frozen', ySplit: 4 }]

        // ── Hoja Sedes (solo en vista global) ────────────────────────────────
        if (!sedeId) {
            const sedesWs = wb.addWorksheet(labels.sedesSheet)
            const sedesCols = [labels.colSede, labels.colActiva, labels.colCultos, labels.kpiParticipaciones, labels.colLecturas, labels.colUsuarios]
            sedesWs.columns = [{ width: 20 }, { width: 10 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 12 }]
            addBrandHeader(sedesWs, labels.sedesSheet, subtitulo, sedesCols.length)
            styleHeaderRow(sedesWs.addRow(sedesCols))
            data.sedesResumen.forEach((s, i) => {
                const row = sedesWs.addRow([s.nombre, s.activo ? labels.si : labels.no, s.cultos, s.participaciones, s.lecturas, s.usuarios])
                styleDataRow(row, i % 2 === 1)
            })
        }

        const buffer = await wb.xlsx.writeBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const slugSede = sedeId ? (data.sedesResumen.find(s => s.sedeId === sedeId)?.slug ?? 'sede') : 'todas'
        const filename = `idmji-control-${slugSede}-${year}-${String(month).padStart(2, '0')}.xlsx`
        return { success: true, data: { base64, filename } }
    } catch (e) {
        console.error('exportControlExcel:', e)
        return { success: false, error: 'Error al generar el Excel' }
    }
}
