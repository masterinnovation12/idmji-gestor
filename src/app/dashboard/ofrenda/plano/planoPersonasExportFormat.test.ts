/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    buildPersonasExportRows,
    buildPersonasFilterSubtitle,
    countPersonasPorDia,
    formatPersonasDayCountsLine,
    formatDiasCell,
    type PlanoPersonaExportInput,
    type PlanoFilterSubtitleLabels,
} from './planoPersonasExportFormat'
import { computePersonasExportLayout, computePersonasExportColumns } from './planoPersonasExportLayout'
import { defaultPlanoPersonasFilter, type PlanoPersonasFilter } from './planoPersonasFilter'

const SUBTITLE_LABELS: PlanoFilterSubtitleLabels = {
    jueves: 'Jueves',
    domManana: 'Domingo mañana',
    domTarde: 'Domingo tarde',
    hombres: 'Hombres',
    mujeres: 'Mujeres',
    ofrendario: 'Ofrendario',
    apoyo: 'Solo apoyo',
    ambos: 'Ambos',
    estrella: 'Prioridad ★',
    pareja: 'Con pareja',
    todas: 'Todas las personas',
}

function input(overrides: Partial<PlanoPersonaExportInput> = {}): PlanoPersonaExportInput {
    return {
        nombre: 'Persona',
        capacidad: 'ambos',
        puede_jueves: true,
        puede_domingo_manana: false,
        puede_domingo_tarde: false,
        prioridad_ofrendario: false,
        parejaId: null,
        activo: true,
        ...overrides,
    }
}

describe('buildPersonasExportRows', () => {
    it('ordena alfabéticamente ignorando tildes/mayúsculas', () => {
        const rows = buildPersonasExportRows([
            input({ nombre: 'Óscar' }),
            input({ nombre: 'andrés' }),
            input({ nombre: 'Beatriz' }),
        ])
        expect(rows.map(r => r.nombre)).toEqual(['andrés', 'Beatriz', 'Óscar'])
    })

    it('mapea flags a la estructura de fila', () => {
        const [row] = buildPersonasExportRows([
            input({ nombre: 'X', puede_jueves: true, puede_domingo_tarde: true, prioridad_ofrendario: true, parejaId: 'p' }),
        ])
        expect(row.dias).toEqual({ jueves: true, domingo_manana: false, domingo_tarde: true })
        expect(row.estrella).toBe(true)
        expect(row.conPareja).toBe(true)
    })
})

describe('countPersonasPorDia', () => {
    it('cuenta por flag de turno (una persona puede sumar en varios días)', () => {
        const counts = countPersonasPorDia([
            input({ puede_jueves: true, puede_domingo_manana: false, puede_domingo_tarde: false }),
            input({ puede_jueves: true, puede_domingo_manana: true, puede_domingo_tarde: true }),
            input({ puede_jueves: false, puede_domingo_manana: true, puede_domingo_tarde: false }),
        ])
        expect(counts).toEqual({ jueves: 2, domingo_manana: 2, domingo_tarde: 1 })
    })

    it('lista vacía → ceros', () => {
        expect(countPersonasPorDia([])).toEqual({ jueves: 0, domingo_manana: 0, domingo_tarde: 0 })
    })
})

describe('formatPersonasDayCountsLine', () => {
    it('formatea recuentos con etiquetas de turno', () => {
        const line = formatPersonasDayCountsLine(
            { jueves: 12, domingo_manana: 15, domingo_tarde: 9 },
            { jueves: 'Jueves', domManana: 'Dom. mañana', domTarde: 'Dom. tarde' },
        )
        expect(line).toBe('Jueves: 12 · Dom. mañana: 15 · Dom. tarde: 9')
    })
})

describe('buildPersonasFilterSubtitle', () => {
    it('sin filtros → «todas»', () => {
        expect(buildPersonasFilterSubtitle(defaultPlanoPersonasFilter(), SUBTITLE_LABELS)).toBe('Todas las personas')
    })

    it('describe día + género + capacidad + toggles', () => {
        const f: PlanoPersonasFilter = {
            dias: ['jueves'],
            generos: ['mujer'],
            capacidades: ['ofrendario'],
            soloEstrella: true,
            soloPareja: false,
        }
        const sub = buildPersonasFilterSubtitle(f, SUBTITLE_LABELS)
        expect(sub).toBe('Jueves · Mujeres · Ofrendario · Prioridad ★')
    })

    it('une múltiples valores del mismo grupo con « / »', () => {
        const f: PlanoPersonasFilter = {
            ...defaultPlanoPersonasFilter(),
            dias: ['jueves', 'domingo_tarde'],
        }
        expect(buildPersonasFilterSubtitle(f, SUBTITLE_LABELS)).toBe('Jueves / Domingo tarde')
    })
})

describe('formatDiasCell', () => {
    const letters = { j: 'J', m: 'M', t: 'T' }
    it('une iniciales de días disponibles', () => {
        expect(formatDiasCell({ jueves: true, domingo_manana: true, domingo_tarde: false }, letters)).toBe('J·M')
    })
    it('sin turnos → marca vacía', () => {
        expect(formatDiasCell({ jueves: false, domingo_manana: false, domingo_tarde: false }, letters)).toBe('—')
    })
})

describe('computePersonasExportLayout', () => {
    it('el alto crece con el número de filas', () => {
        const a = computePersonasExportLayout(5)
        const b = computePersonasExportLayout(40)
        expect(b.height).toBeGreaterThan(a.height)
        expect(b.height - a.height).toBe(35 * b.rowH)
    })

    it('las columnas suman el ancho de la tabla', () => {
        const { tableWidth, colName, colDays, colCap } = computePersonasExportLayout(10)
        expect(colName + colDays + colCap).toBe(tableWidth)
    })

    it('columnas: nombre es la más ancha', () => {
        const cols = computePersonasExportColumns(1000)
        expect(cols.colName).toBeGreaterThan(cols.colDays)
        expect(cols.colName).toBeGreaterThan(cols.colCap)
    })

    it('una fila mínima reserva al menos una altura de fila', () => {
        const layout = computePersonasExportLayout(0)
        expect(layout.bodyH).toBe(layout.rowH)
    })
})
