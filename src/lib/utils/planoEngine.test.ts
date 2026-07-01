import { describe, expect, it } from 'vitest'
import {
    asignarPlanoServicio,
    construirHistorialParaServicio,
    crearHistorialVacio,
    scorePersonaRol,
    sembrarUso,
    poolElegible,
    validarPoolSuficiente,
    type PlanoPersonaEngine,
    type PlanoParejaEngine,
} from './planoEngine'

function persona(
    id: string,
    nombre: string,
    overrides: Partial<PlanoPersonaEngine> = {},
): PlanoPersonaEngine {
    return {
        id,
        nombre,
        activo: true,
        capacidad: 'ambos',
        puede_jueves: true,
        puede_domingo_manana: false,
        puede_domingo_tarde: false,
        genero: 'hombre',
        prioridad_ofrendario: false,
        ...overrides,
    }
}

describe('planoEngine', () => {
    it('asigna pareja H+M con hombre ofrendario', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'Hombre', { genero: 'hombre' }),
            persona('m1', 'Mujer', { genero: 'mujer' }),
        ]
        const parejas: PlanoParejaEngine[] = [{ mujerId: 'm1', hombreId: 'h1' }]
        const res = asignarPlanoServicio('jueves', 1, personas, parejas, crearHistorialVacio())
        expect(res).toHaveLength(2)
        const ofr = res.find(r => r.rol === 'ofrendario')
        const apo = res.find(r => r.rol === 'apoyo')
        expect(ofr?.persona_id).toBe('h1')
        expect(apo?.persona_id).toBe('m1')
    })

    it('prioriza estrella en pareja mismo sexo', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'A', { genero: 'hombre', prioridad_ofrendario: false }),
            persona('h2', 'B', { genero: 'hombre', prioridad_ofrendario: true }),
        ]
        const res = asignarPlanoServicio('jueves', 1, personas, [], crearHistorialVacio())
        const ofr = res.find(r => r.rol === 'ofrendario')
        expect(ofr?.persona_id).toBe('h2')
    })

    it('no asigna H+M sin pareja registrada', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'Hombre', { genero: 'hombre' }),
            persona('m1', 'Mujer', { genero: 'mujer' }),
        ]
        const res = asignarPlanoServicio('jueves', 1, personas, [], crearHistorialVacio())
        expect(res).toHaveLength(0)
    })

    it('valida pool suficiente', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'A', { genero: 'hombre' }),
            persona('h2', 'B', { genero: 'hombre' }),
        ]
        expect(validarPoolSuficiente(personas, 'jueves', 1)).toBe(true)
        expect(validarPoolSuficiente(personas, 'jueves', 2)).toBe(false)
    })

    it('filtra por turno jueves', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('j', 'Jueves', { puede_jueves: true }),
            persona('d', 'Domingo', { puede_jueves: false, puede_domingo_manana: true }),
        ]
        const pool = poolElegible(personas, 'jueves', new Set())
        expect(pool.map(p => p.id)).toEqual(['j'])
    })

    it('sembrarUso penaliza a quien salió en servicios vecinos (rotación ±3)', () => {
        // Dos parejas del mismo sexo posibles; sin historial gana la primera por orden.
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'H1', { genero: 'hombre' }),
            persona('h2', 'H2', { genero: 'hombre' }),
            persona('h3', 'H3', { genero: 'hombre' }),
            persona('h4', 'H4', { genero: 'hombre' }),
        ]

        const sinHistorial = crearHistorialVacio()
        const base = asignarPlanoServicio('jueves', 1, personas, [], sinHistorial)
        expect(base.map(r => r.persona_id).sort()).toEqual(['h1', 'h2'])

        // Sembramos usos previos de h1 y h2 (aparecieron en vecinos) → deben rotar a h3/h4.
        const conHistorial = crearHistorialVacio()
        sembrarUso(conHistorial, 'h1')
        sembrarUso(conHistorial, 'h1')
        sembrarUso(conHistorial, 'h2')
        sembrarUso(conHistorial, 'h2')
        const rotado = asignarPlanoServicio('jueves', 1, personas, [], conHistorial)
        expect(rotado.map(r => r.persona_id).sort()).toEqual(['h3', 'h4'])
    })

    it('equilibra por histórico O/A: quien acumula más O sale como apoyo', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'H1', { genero: 'hombre' }),
            persona('h2', 'H2', { genero: 'hombre' }),
        ]
        const h = crearHistorialVacio()
        h.roles.set('h1', { ofrendario: 5, apoyo: 0 })
        h.roles.set('h2', { ofrendario: 0, apoyo: 1 })
        const res = asignarPlanoServicio('jueves', 1, personas, [], h)
        const ofr = res.find(r => r.rol === 'ofrendario')
        const apo = res.find(r => r.rol === 'apoyo')
        expect(ofr?.persona_id).toBe('h2')
        expect(apo?.persona_id).toBe('h1')
    })

    it('histórico O/A pesa más que recencia vecina cuando el desequilibrio es grande', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'H1', { genero: 'hombre' }),
            persona('h2', 'H2', { genero: 'hombre' }),
        ]
        const h = construirHistorialParaServicio(
            new Map([
                ['h1', { ofrendario: 0, apoyo: 0 }],
                ['h2', { ofrendario: 4, apoyo: 0 }],
            ]),
            [{ persona_id: 'h1', rol: 'ofrendario' }],
        )
        // h1 tiene +50 recencia pero h2 tiene +400 por 4O → h1 debe ser ofrendario
        expect(scorePersonaRol(personas[0], h, 'jueves', 'ofrendario')).toBeLessThan(
            scorePersonaRol(personas[1], h, 'jueves', 'ofrendario'),
        )
        const res = asignarPlanoServicio('jueves', 1, personas, [], h)
        expect(res.find(r => r.rol === 'ofrendario')?.persona_id).toBe('h1')
    })

    it('construirHistorialParaServicio clona roles y sembra vecinos sin duplicar O/A', () => {
        const roles = new Map([['a', { ofrendario: 2, apoyo: 1 }]])
        const h = construirHistorialParaServicio(roles, [
            { persona_id: 'a', rol: 'ofrendario' },
            { persona_id: 'a', rol: 'apoyo' },
        ])
        expect(h.roles.get('a')).toEqual({ ofrendario: 2, apoyo: 1 })
        expect(h.conteo.get('a')).toBe(2)
        roles.get('a')!.ofrendario = 99
        expect(h.roles.get('a')!.ofrendario).toBe(2)
    })

    it('equilibra por histórico O/A del turno: muchos O en domingo no penalizan jueves', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'H1', { genero: 'hombre' }),
            persona('h2', 'H2', { genero: 'hombre' }),
        ]
        const h = crearHistorialVacio()
        // Globalmente h1 llevaría 5O, pero en jueves solo 1O
        h.roles.set('h1', { ofrendario: 1, apoyo: 0 })
        h.roles.set('h2', { ofrendario: 0, apoyo: 0 })
        const res = asignarPlanoServicio('jueves', 1, personas, [], h)
        expect(res.find(r => r.rol === 'ofrendario')?.persona_id).toBe('h2')
    })

    it('varios sacos en el mismo culto actualizan roles en memoria para el siguiente saco', () => {
        const personas: PlanoPersonaEngine[] = [
            persona('h1', 'H1', { genero: 'hombre' }),
            persona('h2', 'H2', { genero: 'hombre' }),
            persona('h3', 'H3', { genero: 'hombre' }),
            persona('h4', 'H4', { genero: 'hombre' }),
        ]
        const h = crearHistorialVacio()
        const res = asignarPlanoServicio('jueves', 2, personas, [], h)
        expect(res).toHaveLength(4)
        const ofrs = res.filter(r => r.rol === 'ofrendario').map(r => r.persona_id)
        expect(new Set(ofrs).size).toBe(2)
    })
})
