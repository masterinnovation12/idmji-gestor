/**
 * Formato del export PNG «directorio de personas» (Labor ofrenda).
 * Puro y testeable: construye filas ordenadas y el subtítulo que describe el filtro.
 */
import {
    ALL_DIAS,
    ALL_GENEROS,
    ALL_CAPACIDADES,
    type PlanoPersonasFilter,
    type PlanoFilterCapacidad,
} from './planoPersonasFilter'

export interface PlanoPersonaExportInput {
    nombre: string
    capacidad: PlanoFilterCapacidad
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
    prioridad_ofrendario: boolean
    parejaId: string | null
    activo: boolean
}

export interface PlanoPersonaExportRow {
    nombre: string
    capacidad: PlanoFilterCapacidad
    dias: { jueves: boolean; domingo_manana: boolean; domingo_tarde: boolean }
    estrella: boolean
    conPareja: boolean
    activo: boolean
}

export interface PlanoFilterSubtitleLabels {
    jueves: string
    domManana: string
    domTarde: string
    hombres: string
    mujeres: string
    ofrendario: string
    apoyo: string
    ambos: string
    estrella: string
    pareja: string
    todas: string
}

export interface PlanoPersonasDayCounts {
    jueves: number
    domingo_manana: number
    domingo_tarde: number
}

export interface PlanoDayCountsLineLabels {
    jueves: string
    domManana: string
    domTarde: string
}

type PersonaConTurnos = Pick<
    PlanoPersonaExportInput,
    'puede_jueves' | 'puede_domingo_manana' | 'puede_domingo_tarde'
>

/** Personas con cada turno marcado (puede repetir persona en varios días). */
export function countPersonasPorDia(personas: readonly PersonaConTurnos[]): PlanoPersonasDayCounts {
    let jueves = 0
    let domingo_manana = 0
    let domingo_tarde = 0
    for (const p of personas) {
        if (p.puede_jueves) jueves++
        if (p.puede_domingo_manana) domingo_manana++
        if (p.puede_domingo_tarde) domingo_tarde++
    }
    return { jueves, domingo_manana, domingo_tarde }
}

/** Línea legible para cabecera PNG: «Jueves: 12 · Dom. mañana: 15 · …». */
export function formatPersonasDayCountsLine(
    counts: PlanoPersonasDayCounts,
    labels: PlanoDayCountsLineLabels,
): string {
    return `${labels.jueves}: ${counts.jueves} · ${labels.domManana}: ${counts.domingo_manana} · ${labels.domTarde}: ${counts.domingo_tarde}`
}

/** Ordena alfabéticamente (es, sin distinguir tildes/mayúsculas) y mapea a filas. */
export function buildPersonasExportRows(
    personas: readonly PlanoPersonaExportInput[],
): PlanoPersonaExportRow[] {
    return [...personas]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        .map(p => ({
            nombre: p.nombre,
            capacidad: p.capacidad,
            dias: {
                jueves: p.puede_jueves,
                domingo_manana: p.puede_domingo_manana,
                domingo_tarde: p.puede_domingo_tarde,
            },
            estrella: p.prioridad_ofrendario,
            conPareja: Boolean(p.parejaId),
            activo: p.activo,
        }))
}

function groupIsActive(count: number, total: number): boolean {
    return count > 0 && count < total
}

const CAP_LABEL_KEY: Record<PlanoFilterCapacidad, keyof Pick<PlanoFilterSubtitleLabels, 'ofrendario' | 'apoyo' | 'ambos'>> = {
    ofrendario: 'ofrendario',
    apoyo: 'apoyo',
    ambos: 'ambos',
}

/** Subtítulo del PNG que describe el filtro aplicado (o «todas» si no hay filtro). */
export function buildPersonasFilterSubtitle(
    f: PlanoPersonasFilter,
    labels: PlanoFilterSubtitleLabels,
): string {
    const parts: string[] = []

    if (groupIsActive(f.dias.length, ALL_DIAS.length)) {
        parts.push(
            f.dias
                .map(d => (d === 'jueves' ? labels.jueves : d === 'domingo_manana' ? labels.domManana : labels.domTarde))
                .join(' / '),
        )
    }
    if (groupIsActive(f.generos.length, ALL_GENEROS.length)) {
        parts.push(f.generos.map(g => (g === 'hombre' ? labels.hombres : labels.mujeres)).join(' / '))
    }
    if (groupIsActive(f.capacidades.length, ALL_CAPACIDADES.length)) {
        parts.push(f.capacidades.map(c => labels[CAP_LABEL_KEY[c]]).join(' / '))
    }
    if (f.soloEstrella) parts.push(labels.estrella)
    if (f.soloPareja) parts.push(labels.pareja)

    return parts.length === 0 ? labels.todas : parts.join(' · ')
}

/** Texto de la celda «Días» (iniciales de los turnos disponibles). */
export function formatDiasCell(
    dias: PlanoPersonaExportRow['dias'],
    letters: { j: string; m: string; t: string },
    emptyMark = '—',
): string {
    const out: string[] = []
    if (dias.jueves) out.push(letters.j)
    if (dias.domingo_manana) out.push(letters.m)
    if (dias.domingo_tarde) out.push(letters.t)
    return out.length === 0 ? emptyMark : out.join('·')
}
