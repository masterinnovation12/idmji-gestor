import { describe, it, expect } from 'vitest'
import { validateCatalogoItem, formatDuracion, parseDuracion } from './himnarioValidation'

describe('himnario admin — validación de items del catálogo', () => {
    const base = { numero: 12, titulo: 'Grande es tu fidelidad', duracion_segundos: 245 }

    it('acepta un item válido y lo normaliza', () => {
        const r = validateCatalogoItem({ ...base, titulo: '  Grande es tu fidelidad  ' })
        expect(r.error).toBeUndefined()
        expect(r.data?.titulo).toBe('Grande es tu fidelidad')
    })

    it('rechaza números fuera de rango o no enteros', () => {
        expect(validateCatalogoItem({ ...base, numero: 0 }).error).toBe('NUMERO_INVALIDO')
        expect(validateCatalogoItem({ ...base, numero: 10000 }).error).toBe('NUMERO_INVALIDO')
        expect(validateCatalogoItem({ ...base, numero: 3.5 }).error).toBe('NUMERO_INVALIDO')
    })

    it('rechaza títulos demasiado cortos o vacíos', () => {
        expect(validateCatalogoItem({ ...base, titulo: ' ' }).error).toBe('TITULO_INVALIDO')
        expect(validateCatalogoItem({ ...base, titulo: 'a' }).error).toBe('TITULO_INVALIDO')
    })

    it('rechaza duraciones negativas o absurdas', () => {
        expect(validateCatalogoItem({ ...base, duracion_segundos: -1 }).error).toBe('DURACION_INVALIDA')
        expect(validateCatalogoItem({ ...base, duracion_segundos: 3601 }).error).toBe('DURACION_INVALIDA')
    })
})

describe('himnario admin — duración mm:ss', () => {
    it('formatea segundos a m:ss', () => {
        expect(formatDuracion(0)).toBe('0:00')
        expect(formatDuracion(65)).toBe('1:05')
        expect(formatDuracion(245)).toBe('4:05')
    })

    it('parsea m:ss y segundos totales', () => {
        expect(parseDuracion('4:05')).toBe(245)
        expect(parseDuracion('245')).toBe(245)
        expect(parseDuracion('')).toBe(0)
    })

    it('rechaza formatos inválidos', () => {
        expect(parseDuracion('4:65')).toBeNull()
        expect(parseDuracion('abc')).toBeNull()
        expect(parseDuracion('1:2')).toBeNull()
    })
})
