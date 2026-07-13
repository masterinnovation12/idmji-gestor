import { describe, it, expect } from 'vitest'
import {
    EXPORT_SECTIONS_ORDER,
    defaultSectionsForScope,
    g1RowsFromSections,
    sectionsIncludeColaboradores,
    sectionsIncludeSacos,
    sectionsIncludeTestimonios,
    sortSections,
    toggleSection,
} from './exportSections'

describe('exportSections', () => {
    it('G1+G2: todas las secciones seleccionadas por defecto', () => {
        expect(defaultSectionsForScope('all')).toEqual([...EXPORT_SECTIONS_ORDER])
    })

    it('G2: por defecto solo testimonios y colaboradores (en orden de fila)', () => {
        const g2 = defaultSectionsForScope('g2')
        expect(g2).toEqual(['testimonios', 'colaboradores'])
        expect(sectionsIncludeSacos(g2)).toBe(false)
        expect(g1RowsFromSections(g2)).toEqual([])
        expect(sectionsIncludeColaboradores(g2)).toBe(true)
        expect(sectionsIncludeTestimonios(g2)).toBe(true)
    })

    it('testimonios va tras imposición de manos y antes de colaboradores', () => {
        const idxImposicion = EXPORT_SECTIONS_ORDER.indexOf('imposicion_manos')
        const idxTestimonios = EXPORT_SECTIONS_ORDER.indexOf('testimonios')
        const idxColaboradores = EXPORT_SECTIONS_ORDER.indexOf('colaboradores')
        expect(idxImposicion).toBeLessThan(idxTestimonios)
        expect(idxTestimonios).toBeLessThan(idxColaboradores)
    })

    it('g1RowsFromSections devuelve solo filas G1 en orden canónico', () => {
        expect(g1RowsFromSections(['imposicion_manos', 'realiza', 'testimonios', 'sacos'])).toEqual([
            'realiza',
            'imposicion_manos',
        ])
    })

    it('toggleSection añade y quita manteniendo el orden canónico', () => {
        const sinSacos = toggleSection([...EXPORT_SECTIONS_ORDER], 'sacos')
        expect(sinSacos).not.toContain('sacos')
        expect(toggleSection(sinSacos, 'sacos')).toEqual([...EXPORT_SECTIONS_ORDER])
        // Reincorporar en medio conserva el orden de fila del documento
        const soloFin = toggleSection(['testimonios', 'colaboradores'], 'apoyo')
        expect(soloFin).toEqual(['apoyo', 'testimonios', 'colaboradores'])
    })

    it('sortSections descarta claves desconocidas', () => {
        expect(sortSections(['testimonios', 'inventada', 'sacos'])).toEqual(['sacos', 'testimonios'])
    })
})
