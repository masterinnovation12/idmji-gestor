/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    defaultPlanoPersonasFilter,
    matchesPlanoPersonasFilter,
    filterPlanoPersonas,
    countActivePlanoFilters,
    hasActivePlanoFilters,
    toggleInArray,
    type PlanoFilterablePersona,
    type PlanoPersonasFilter,
} from './planoPersonasFilter'

function persona(overrides: Partial<PlanoFilterablePersona> = {}): PlanoFilterablePersona {
    return {
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        genero: 'hombre',
        capacidad: 'ambos',
        prioridad_ofrendario: false,
        parejaId: null,
        ...overrides,
    }
}

describe('defaultPlanoPersonasFilter', () => {
    it('arranca con todos los grupos completos y toggles off', () => {
        const f = defaultPlanoPersonasFilter()
        expect(f.dias).toHaveLength(3)
        expect(f.generos).toHaveLength(2)
        expect(f.capacidades).toHaveLength(3)
        expect(f.soloEstrella).toBe(false)
        expect(f.soloPareja).toBe(false)
        expect(f.soloSinAsignar).toBe(false)
        expect(hasActivePlanoFilters(f)).toBe(false)
    })

    it('por defecto muestra a TODAS, incluida sin turno y sin género', () => {
        const f = defaultPlanoPersonasFilter()
        const sinTurno = persona({ puede_jueves: false, puede_domingo_manana: false, puede_domingo_tarde: false, genero: null })
        expect(matchesPlanoPersonasFilter(sinTurno, f)).toBe(true)
    })
})

describe('filtro por día = disponibilidad', () => {
    it('solo jueves: incluye a quien puede jueves (aunque pueda más días)', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), dias: ['jueves'] }
        expect(matchesPlanoPersonasFilter(persona({ puede_jueves: true }), f)).toBe(true)
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: false, puede_domingo_manana: true, puede_domingo_tarde: false }),
                f,
            ),
        ).toBe(false)
    })

    it('dos días seleccionados: OR entre ellos', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), dias: ['jueves', 'domingo_tarde'] }
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: false, puede_domingo_manana: true, puede_domingo_tarde: true }),
                f,
            ),
        ).toBe(true)
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: false, puede_domingo_manana: true, puede_domingo_tarde: false }),
                f,
            ),
        ).toBe(false)
    })

    it('grupo vacío se trata como no-op (no oculta a nadie)', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), dias: [] }
        const sinTurno = persona({ puede_jueves: false, puede_domingo_manana: false, puede_domingo_tarde: false })
        expect(matchesPlanoPersonasFilter(sinTurno, f)).toBe(true)
    })
})

describe('filtro por género', () => {
    it('solo mujeres excluye hombres y género nulo', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), generos: ['mujer'] }
        expect(matchesPlanoPersonasFilter(persona({ genero: 'mujer' }), f)).toBe(true)
        expect(matchesPlanoPersonasFilter(persona({ genero: 'hombre' }), f)).toBe(false)
        expect(matchesPlanoPersonasFilter(persona({ genero: null }), f)).toBe(false)
    })
})

describe('filtro por capacidad', () => {
    it('solo ofrendario filtra por valor exacto', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), capacidades: ['ofrendario'] }
        expect(matchesPlanoPersonasFilter(persona({ capacidad: 'ofrendario' }), f)).toBe(true)
        expect(matchesPlanoPersonasFilter(persona({ capacidad: 'ambos' }), f)).toBe(false)
        expect(matchesPlanoPersonasFilter(persona({ capacidad: 'apoyo' }), f)).toBe(false)
    })
})

describe('toggles estrella y pareja', () => {
    it('solo estrella exige prioridad_ofrendario', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), soloEstrella: true }
        expect(matchesPlanoPersonasFilter(persona({ prioridad_ofrendario: true }), f)).toBe(true)
        expect(matchesPlanoPersonasFilter(persona({ prioridad_ofrendario: false }), f)).toBe(false)
    })

    it('solo pareja exige parejaId', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), soloPareja: true }
        expect(matchesPlanoPersonasFilter(persona({ parejaId: 'x' }), f)).toBe(true)
        expect(matchesPlanoPersonasFilter(persona({ parejaId: null }), f)).toBe(false)
    })

    it('solo sin turno asignado exige la sección sin_turno del listado', () => {
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), soloSinAsignar: true }
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: false, puede_domingo_manana: false, puede_domingo_tarde: false }),
                f,
            ),
        ).toBe(true)
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: true, puede_domingo_manana: true, puede_domingo_tarde: false }),
                f,
            ),
        ).toBe(true)
        expect(
            matchesPlanoPersonasFilter(
                persona({ puede_jueves: true, puede_domingo_manana: false, puede_domingo_tarde: false }),
                f,
            ),
        ).toBe(false)
    })
})

describe('combinación AND entre grupos', () => {
    it('jueves + mujeres + ofrendario', () => {
        const f: PlanoPersonasFilter = {
            dias: ['jueves'],
            generos: ['mujer'],
            capacidades: ['ofrendario'],
            soloEstrella: false,
            soloPareja: false,
            soloSinAsignar: false,
        }
        const ok = persona({ puede_jueves: true, genero: 'mujer', capacidad: 'ofrendario' })
        const noCap = persona({ puede_jueves: true, genero: 'mujer', capacidad: 'ambos' })
        expect(matchesPlanoPersonasFilter(ok, f)).toBe(true)
        expect(matchesPlanoPersonasFilter(noCap, f)).toBe(false)
    })
})

describe('countActivePlanoFilters', () => {
    it('cuenta grupos parciales y toggles activos', () => {
        const f: PlanoPersonasFilter = {
            dias: ['jueves'],
            generos: ['mujer'],
            capacidades: ['ofrendario', 'apoyo', 'ambos'],
            soloEstrella: true,
            soloPareja: false,
            soloSinAsignar: false,
        }
        expect(countActivePlanoFilters(f)).toBe(3)
    })

    it('default = 0', () => {
        expect(countActivePlanoFilters(defaultPlanoPersonasFilter())).toBe(0)
    })
})

describe('filterPlanoPersonas + toggleInArray', () => {
    it('filtra la lista completa', () => {
        const list = [
            persona({ genero: 'mujer', capacidad: 'ofrendario' }),
            persona({ genero: 'hombre', capacidad: 'apoyo' }),
        ]
        const f: PlanoPersonasFilter = { ...defaultPlanoPersonasFilter(), generos: ['mujer'] }
        expect(filterPlanoPersonas(list, f)).toHaveLength(1)
    })

    it('toggleInArray añade y quita', () => {
        expect(toggleInArray(['jueves'], 'domingo_manana')).toEqual(['jueves', 'domingo_manana'])
        expect(toggleInArray(['jueves', 'domingo_manana'], 'jueves')).toEqual(['domingo_manana'])
    })
})
