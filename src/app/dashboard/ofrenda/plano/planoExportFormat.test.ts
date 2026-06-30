/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { es } from 'date-fns/locale'
import { formatLaborOfrendaExportSubtitle } from './planoExportFormat'
import { resolverModo } from './planoTypes'
import { getPlanoVista } from './planoData'

const t = (key: string) =>
    ({
        'ofrenda.days.manana': 'Mañana',
        'ofrenda.days.tarde': 'Tarde',
    })[key] ?? key

const labels = { manana: t('ofrenda.days.manana'), tarde: t('ofrenda.days.tarde') }

describe('formatLaborOfrendaExportSubtitle', () => {
    const fecha = new Date('2026-06-25T12:00:00')

    it('jueves: solo fecha, sin «· Jueves» duplicado', () => {
        const sub = formatLaborOfrendaExportSubtitle(fecha, 'jueves', labels, es)
        expect(sub.toLowerCase()).toContain('jueves')
        expect(sub).not.toMatch(/jueves.*·/i)
        expect(sub).not.toMatch(/·\s*jueves/i)
    })

    it('domingo mañana: fecha · Mañana', () => {
        const sub = formatLaborOfrendaExportSubtitle(
            new Date('2026-06-28T12:00:00'),
            'domingo',
            labels,
            es,
        )
        expect(sub).toContain('· Mañana')
        expect(sub.toLowerCase()).toContain('domingo')
    })

    it('domingo tarde: fecha · Tarde', () => {
        const sub = formatLaborOfrendaExportSubtitle(
            new Date('2026-06-28T12:00:00'),
            'domingo_tarde',
            labels,
            es,
        )
        expect(sub).toContain('· Tarde')
    })
})

describe('resolverModo — plano en pantalla', () => {
    it('4 sacos → lienzo sacos_4', () => {
        expect(resolverModo(4)).toBe('sacos_4')
    })

    it('8 sacos → lienzo sacos_8', () => {
        expect(resolverModo(8)).toBe('sacos_8')
    })

    it('4 sacos usa fondo 3d sacos-4 (no plantilla de 8)', () => {
        const data = getPlanoVista('3d', 'sacos_4')
        expect(data.fondoUrl).toContain('sacos-4')
    })
})
