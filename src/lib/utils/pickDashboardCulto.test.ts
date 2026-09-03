import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import {
    dashboardNavigatorBounds,
    groupCultosByFecha,
    applyAuthoritativeRange,
    navigatorRangeFingerprint,
    pickDefaultCultoForDay,
    seedNavigatorCache,
} from './pickDashboardCulto'

const c10 = { id: 'am', hora_inicio: '10:00:00', estado: 'planeado', fecha: '2026-09-06' }
const c17 = { id: 'pm', hora_inicio: '17:00:00', estado: 'planeado', fecha: '2026-09-06' }
const dual = [c10, c17]
const sunday = new Date('2026-09-06T12:00:00')

describe('dashboardNavigatorBounds', () => {
    it('cubre ±1 semana en lunes–domingo (21 días)', () => {
        // jueves 3 sep 2026 → min lun 24 ago, max dom 13 sep
        const { minDate, maxDate } = dashboardNavigatorBounds(new Date('2026-09-03T12:00:00'))
        expect(format(minDate, 'yyyy-MM-dd')).toBe('2026-08-24')
        expect(format(maxDate, 'yyyy-MM-dd')).toBe('2026-09-13')
        expect(format(addDays(minDate, 20), 'yyyy-MM-dd')).toBe('2026-09-13')
    })
})

describe('groupCultosByFecha', () => {
    it('agrupa conservando el orden de llegada', () => {
        const grouped = groupCultosByFecha([
            { fecha: '2026-09-06', hora_inicio: '10:00:00' },
            { fecha: '2026-09-07', hora_inicio: '19:00:00' },
            { fecha: '2026-09-06', hora_inicio: '17:00:00' },
        ])
        expect(grouped['2026-09-06']?.map((c) => c.hora_inicio)).toEqual(['10:00:00', '17:00:00'])
        expect(grouped['2026-09-07']).toHaveLength(1)
    })
})

describe('pickDefaultCultoForDay', () => {
    it('lista vacía → null', () => {
        expect(pickDefaultCultoForDay([], sunday, sunday)).toBeNull()
    })

    it('un solo culto → ese, da igual la hora', () => {
        expect(pickDefaultCultoForDay([c10], sunday, new Date('2026-09-06T22:00:00'))).toEqual(c10)
    })

    it('hoy antes de las 10h → el de las 10h', () => {
        expect(pickDefaultCultoForDay(dual, sunday, new Date('2026-09-06T08:00:00'))?.id).toBe('am')
    })

    it('hoy 10–17h: 10h si no está realizado', () => {
        expect(pickDefaultCultoForDay(dual, sunday, new Date('2026-09-06T12:00:00'))?.id).toBe('am')
    })

    it('hoy 10–17h: 17h si el de las 10h ya está realizado', () => {
        const done = [{ ...c10, estado: 'realizado' }, c17]
        expect(pickDefaultCultoForDay(done, sunday, new Date('2026-09-06T12:00:00'))?.id).toBe('pm')
    })

    it('hoy ≥17h → el de las 17h', () => {
        expect(pickDefaultCultoForDay(dual, sunday, new Date('2026-09-06T18:30:00'))?.id).toBe('pm')
    })

    it('otro día con dos cultos → el de las 10h (no usa la hora actual)', () => {
        const monday = new Date('2026-09-07T20:00:00')
        const list = [
            { ...c10, fecha: '2026-09-07' },
            { ...c17, fecha: '2026-09-07' },
        ]
        expect(pickDefaultCultoForDay(list, monday, new Date('2026-09-03T20:00:00'))?.id).toBe('am')
    })
})

describe('seedNavigatorCache', () => {
    it('rellena los 21 días, con [] donde no hay culto', () => {
        const today = new Date('2026-09-03T12:00:00')
        const { minDate, maxDate } = dashboardNavigatorBounds(today)
        const cache = seedNavigatorCache(minDate, maxDate, [c10, c17])
        expect(Object.keys(cache)).toHaveLength(21)
        expect(cache['2026-09-06']).toEqual([c10, c17])
        expect(cache['2026-09-03']).toEqual([])
        expect(cache['2026-08-24']).toEqual([])
        expect(cache['2026-09-13']).toEqual([])
    })
})

describe('applyAuthoritativeRange', () => {
    it('una asignación nueva pisa el culto cacheado de ese día', () => {
        const today = new Date('2026-09-03T12:00:00')
        const { minDate, maxDate } = dashboardNavigatorBounds(today)
        const prev = {
            '2026-09-03': [{ id: 'hoy', fecha: '2026-09-03', hora_inicio: '19:00:00', id_usuario_intro: 'rafael' }],
        }
        const fresh = [{ id: 'hoy', fecha: '2026-09-03', hora_inicio: '19:00:00', id_usuario_intro: 'hugo' }]
        const merged = applyAuthoritativeRange(prev, minDate, maxDate, fresh)
        expect(merged['2026-09-03']?.[0]?.id_usuario_intro).toBe('hugo')
    })

    it('un culto borrado deja el día vacío (el servidor manda [])', () => {
        const today = new Date('2026-09-03T12:00:00')
        const { minDate, maxDate } = dashboardNavigatorBounds(today)
        const prev = {
            '2026-09-04': [{ fecha: '2026-09-04', hora_inicio: '19:00:00' }],
            '2026-10-01': [{ fecha: '2026-10-01', hora_inicio: '10:00:00' }],
        }
        const merged = applyAuthoritativeRange(prev, minDate, maxDate, [c10])
        expect(merged['2026-09-06']).toEqual([c10])
        expect(merged['2026-09-04']).toEqual([])
        expect(merged['2026-10-01']).toEqual([{ fecha: '2026-10-01', hora_inicio: '10:00:00' }])
    })
})

describe('navigatorRangeFingerprint', () => {
    it('cambia si cambia la asignación, el estado, una lectura o las observaciones', () => {
        const base = {
            id: 'hoy',
            fecha: '2026-09-03',
            hora_inicio: '19:00:00',
            estado: 'planeado',
            id_usuario_intro: 'rafael',
            lecturas: [{ id: 'lec-1' }],
            plan_himnos_coros: [{ id: 'h-1' }],
            meta_data: { observaciones: 'nada' },
        }
        const sameOrder = navigatorRangeFingerprint([base, c10])
        const swapped = navigatorRangeFingerprint([c10, base])
        expect(sameOrder).toBe(swapped)
        expect(navigatorRangeFingerprint([{ ...base, id_usuario_intro: 'hugo' }])).not.toBe(navigatorRangeFingerprint([base]))
        expect(navigatorRangeFingerprint([{ ...base, estado: 'realizado' }])).not.toBe(navigatorRangeFingerprint([base]))
        expect(navigatorRangeFingerprint([{ ...base, lecturas: [{ id: 'lec-2' }] }])).not.toBe(navigatorRangeFingerprint([base]))
        expect(navigatorRangeFingerprint([{ ...base, meta_data: { observaciones: 'nuevo' } }])).not.toBe(navigatorRangeFingerprint([base]))
        expect(navigatorRangeFingerprint(undefined)).toBe('')
        expect(navigatorRangeFingerprint([])).toBe('')
    })
})
