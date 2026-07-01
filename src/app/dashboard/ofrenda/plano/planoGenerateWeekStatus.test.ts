/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    buildWeekFillInfo,
    cultoFillStatus,
    expectedPlanoAssignments,
    weekFillStatusFromCultos,
} from './planoGenerateWeekStatus'
import type { OfrServicio } from '../actions'

const sacos = { sacos_jueves: 4, sacos_domingo: 8, sacos_domingo_tarde: 4 }

describe('planoGenerateWeekStatus', () => {
    it('expectedPlanoAssignments por turno', () => {
        expect(expectedPlanoAssignments('jueves', sacos)).toBe(8)
        expect(expectedPlanoAssignments('domingo', sacos)).toBe(16)
        expect(expectedPlanoAssignments('domingo_tarde', sacos)).toBe(8)
    })

    it('cultoFillStatus vacío / parcial / completo', () => {
        expect(cultoFillStatus(0, 8)).toBe('empty')
        expect(cultoFillStatus(4, 8)).toBe('partial')
        expect(cultoFillStatus(8, 8)).toBe('full')
    })

    it('weekFillStatusFromCultos agrega estados de cultos', () => {
        expect(
            weekFillStatusFromCultos([
                { servicioId: 'a', diaTipo: 'jueves', count: 8, expected: 8, status: 'full' },
                { servicioId: 'b', diaTipo: 'domingo', count: 0, expected: 16, status: 'empty' },
            ]),
        ).toBe('partial')
    })

    it('buildWeekFillInfo — semana S.27 solo jueves relleno', () => {
        const week: OfrServicio[] = [
            {
                id: 'sj',
                plan_id: 'p',
                fecha: '2026-07-02',
                dia_tipo: 'jueves',
                semana_iso: 27,
                posicion: 1,
                secuencia_desde: 1,
                secuencia_hasta: 4,
                secuencia_texto: '01-04',
            },
            {
                id: 'sd',
                plan_id: 'p',
                fecha: '2026-07-05',
                dia_tipo: 'domingo',
                semana_iso: 27,
                posicion: 2,
                secuencia_desde: 5,
                secuencia_hasta: 12,
                secuencia_texto: '05-12',
            },
            {
                id: 'st',
                plan_id: 'p',
                fecha: '2026-07-05',
                dia_tipo: 'domingo_tarde',
                semana_iso: 27,
                posicion: 3,
                secuencia_desde: 13,
                secuencia_hasta: 16,
                secuencia_texto: '13-16',
            },
        ]
        const map = new Map([['sj', 8]])
        const info = buildWeekFillInfo(week, map, sacos)
        expect(info.semanaIso).toBe(27)
        expect(info.weekStatus).toBe('partial')
        expect(info.cultos.find(c => c.diaTipo === 'jueves')?.status).toBe('full')
        expect(info.cultos.find(c => c.diaTipo === 'domingo')?.status).toBe('empty')
    })
})
