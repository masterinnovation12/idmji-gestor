import { z } from 'zod'

/**
 * Validación del catálogo de himnos y coros (compartida por actions y tests).
 * Reglas: número entero 1-9999 (único por catálogo, lo garantiza la BD),
 * título 2-160 caracteres, duración 0-3600 segundos (0 = sin cronometrar).
 */

export type CatalogoTipo = 'himno' | 'coro'

export const catalogoItemSchema = z.object({
    numero: z.number().int().min(1).max(9999),
    titulo: z.string().trim().min(2).max(160),
    duracion_segundos: z.number().int().min(0).max(3600),
})

export interface CatalogoItemInput {
    numero: number
    titulo: string
    duracion_segundos: number
}

export type CatalogoValidationError = 'NUMERO_INVALIDO' | 'TITULO_INVALIDO' | 'DURACION_INVALIDA'

/** Valida y normaliza un item del catálogo; devuelve el código del primer error. */
export function validateCatalogoItem(
    input: CatalogoItemInput,
): { data?: CatalogoItemInput; error?: CatalogoValidationError } {
    const parsed = catalogoItemSchema.safeParse(input)
    if (parsed.success) return { data: parsed.data }

    const issue = parsed.error.issues[0]
    const campo = issue?.path[0]
    if (campo === 'numero') return { error: 'NUMERO_INVALIDO' }
    if (campo === 'titulo') return { error: 'TITULO_INVALIDO' }
    return { error: 'DURACION_INVALIDA' }
}

/** mm:ss ↔ segundos para el formulario de duración. */
export function formatDuracion(segundos: number): string {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuracion(texto: string): number | null {
    const trimmed = texto.trim()
    if (!trimmed) return 0
    // Acepta "m:ss" o segundos totales ("245")
    const conMinutos = /^(\d{1,3}):([0-5]\d)$/.exec(trimmed)
    if (conMinutos) return Number(conMinutos[1]) * 60 + Number(conMinutos[2])
    if (/^\d{1,4}$/.test(trimmed)) return Number(trimmed)
    return null
}
