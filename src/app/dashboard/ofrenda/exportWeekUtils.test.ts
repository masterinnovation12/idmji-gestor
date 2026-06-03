import { describe, it, expect } from 'vitest'
import { es } from 'date-fns/locale'
import type { OfrServicio } from './actions'
import { exportLayoutWidthPx } from './exportLayoutMetrics'
import {
    buildWeekFileSlug,
    formatWeekRangeLabel,
    groupServiciosByWeek,
} from './exportWeekUtils'

function srv(id: string, fecha: string, pos: number): OfrServicio {
    return {
        id,
        plan_id: 'p1',
        fecha,
        dia_tipo: pos % 3 === 0 ? 'jueves' : pos % 3 === 1 ? 'domingo' : 'domingo_tarde',
        semana_iso: 19,
        secuencia_desde: 1,
        secuencia_hasta: 4,
        secuencia_texto: '01 al 04',
        posicion: pos,
    }
}

describe('exportWeekUtils', () => {
    it('agrupa servicios en bloques de 3 (semana labor ofrenda)', () => {
        const list = [0, 1, 2, 3, 4, 5].map(i => srv(`s${i}`, `2026-05-0${7 + Math.floor(i / 3) * 3}`, i))
        const weeks = groupServiciosByWeek(list)
        expect(weeks).toHaveLength(2)
        expect(weeks[0]).toHaveLength(3)
        expect(weeks[1]).toHaveLength(3)
    })

    it('ancho semanal y mensual usan el mismo lienzo mínimo 1600px', () => {
        expect(exportLayoutWidthPx(3)).toBe(1600)
        expect(exportLayoutWidthPx(3)).toBe(exportLayoutWidthPx(12))
    })

    it('formatWeekRangeLabel para rango en el mismo mes', () => {
        const week = [srv('a', '2026-05-07', 0), srv('b', '2026-05-10', 1), srv('c', '2026-05-10', 2)]
        expect(formatWeekRangeLabel(week, es)).toMatch(/7/)
        expect(formatWeekRangeLabel(week, es)).toMatch(/may/i)
    })

    it('buildWeekFileSlug genera nombre de archivo estable', () => {
        expect(buildWeekFileSlug(1, '7 – 10 may')).toContain('semana-2')
    })
})
