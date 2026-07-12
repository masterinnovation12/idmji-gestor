import { describe, it, expect } from 'vitest'
import {
    PERMISSION_KEYS,
    PERMISSION_DEFS,
    can,
    canAny,
    parseOverrides,
    roleDefault,
} from './permissions'

describe('permissions: resolución de permisos efectivos', () => {
    it('ADMIN siempre puede, incluso con override en false', () => {
        for (const key of PERMISSION_KEYS) {
            expect(can({ rol: 'ADMIN', permisos: { [key]: false } }, key)).toBe(true)
            expect(can({ rol: 'ADMIN', permisos: null }, key)).toBe(true)
        }
    })

    it('EDITOR permite por defecto (sin overrides)', () => {
        for (const key of PERMISSION_KEYS) {
            expect(can({ rol: 'EDITOR', permisos: {} }, key)).toBe(true)
        }
    })

    it('MIEMBRO y SONIDO deniegan por defecto', () => {
        for (const key of PERMISSION_KEYS) {
            expect(can({ rol: 'MIEMBRO', permisos: {} }, key)).toBe(false)
            expect(can({ rol: 'SONIDO', permisos: {} }, key)).toBe(false)
        }
    })

    it('el override gana al default del rol (recortar EDITOR)', () => {
        const subject = { rol: 'EDITOR', permisos: { 'cultos.asignarHermanos': false } }
        expect(can(subject, 'cultos.asignarHermanos')).toBe(false)
        // El resto de permisos siguen con el default del rol
        expect(can(subject, 'cultos.editarDetalle')).toBe(true)
    })

    it('el override gana al default del rol (ampliar MIEMBRO)', () => {
        const subject = { rol: 'MIEMBRO', permisos: { 'lecturas.gestionar': true } }
        expect(can(subject, 'lecturas.gestionar')).toBe(true)
        expect(can(subject, 'himnos.gestionar')).toBe(false)
    })

    it('sujeto nulo o sin rol deniega', () => {
        expect(can(null, 'cultos.gestionar')).toBe(false)
        expect(can(undefined, 'cultos.gestionar')).toBe(false)
        expect(can({ rol: null, permisos: {} }, 'cultos.gestionar')).toBe(false)
    })

    it('canAny: basta con un permiso concedido', () => {
        const subject = { rol: 'MIEMBRO', permisos: { 'laborPlano.gestionar': true } }
        expect(canAny(subject, ['laborGeneral.gestionar', 'laborPlano.gestionar'])).toBe(true)
        expect(canAny(subject, ['laborGeneral.gestionar', 'hermanos.gestionar'])).toBe(false)
    })

    it('roleDefault refleja la política por rol', () => {
        expect(roleDefault('ADMIN')).toBe(true)
        expect(roleDefault('EDITOR')).toBe(true)
        expect(roleDefault('MIEMBRO')).toBe(false)
        expect(roleDefault('SONIDO')).toBe(false)
        expect(roleDefault(null)).toBe(false)
    })
})

describe('permissions: parseOverrides', () => {
    it('acepta solo claves conocidas con valores booleanos', () => {
        const parsed = parseOverrides({
            'cultos.editarDetalle': false,
            'lecturas.gestionar': true,
            'clave.desconocida': true,
            'himnos.gestionar': 'true', // string: se ignora
        })
        expect(parsed).toEqual({
            'cultos.editarDetalle': false,
            'lecturas.gestionar': true,
        })
    })

    it('tolera null, undefined y tipos no-objeto', () => {
        expect(parseOverrides(null)).toEqual({})
        expect(parseOverrides(undefined)).toEqual({})
        expect(parseOverrides('x')).toEqual({})
        expect(parseOverrides(42)).toEqual({})
    })
})

describe('permissions: catálogo', () => {
    it('cada clave del catálogo tiene definición para la UI', () => {
        const defKeys = PERMISSION_DEFS.map(d => d.key)
        expect([...defKeys].sort()).toEqual([...PERMISSION_KEYS].sort())
    })

    it('no hay claves duplicadas', () => {
        expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length)
    })
})
