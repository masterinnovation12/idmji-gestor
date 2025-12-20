import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Formatea una fecha a formato legible en español
 */
export function formatearFecha(fecha: string | Date, formato: string = 'PPP'): string {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha
    if (!isValid(date)) return 'Fecha inválida'
    return format(date, formato, { locale: es })
}

/**
 * Formatea una hora desde formato HH:mm:ss a HH:mm
 */
export function formatearHora(hora: string): string {
    return hora.slice(0, 5)
}

/**
 * Convierte duración en segundos a formato MM:SS
 */
export function segundosAMinutos(segundos: number): string {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${minutos}:${segs.toString().padStart(2, '0')}`
}

/**
 * Convierte formato MM:SS a segundos
 */
export function minutosASegundos(tiempo: string): number {
    const [minutos, segundos] = tiempo.split(':').map(Number)
    return minutos * 60 + segundos
}

/**
 * Obtiene las iniciales de un nombre completo
 */
export function obtenerIniciales(nombre: string, apellidos: string = ''): string {
    const inicial1 = nombre?.charAt(0)?.toUpperCase() || ''
    const inicial2 = apellidos?.charAt(0)?.toUpperCase() || ''
    return `${inicial1}${inicial2}`
}

/**
 * Formatea un nombre completo
 */
export function formatearNombreCompleto(nombre: string | null, apellidos: string | null): string {
    if (!nombre && !apellidos) return 'Sin nombre'
    return `${nombre || ''} ${apellidos || ''}`.trim()
}

/**
 * Valida si un email es válido
 */
export function esEmailValido(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto: string, maxLength: number = 50): string {
    if (texto.length <= maxLength) return texto
    return texto.slice(0, maxLength) + '...'
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalizar(texto: string): string {
    if (!texto) return ''
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

/**
 * Genera un color aleatorio para avatares
 */
export function generarColorAvatar(id: string): string {
    const colores = [
        'hsl(262, 83%, 58%)', // primary
        'hsl(199, 89%, 48%)', // secondary
        'hsl(330, 81%, 60%)', // accent
        'hsl(142, 71%, 45%)', // green
        'hsl(38, 92%, 50%)',  // orange
    ]
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colores.length
    return colores[index]
}

/**
 * Formatea un número de teléfono
 */
export function formatearTelefono(telefono: string): string {
    const cleaned = telefono.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})$/)
    if (match) {
        return `${match[1]} ${match[2]} ${match[3]}`
    }
    return telefono
}

/**
 * Calcula la duración total de un array de elementos con duración
 */
export function calcularDuracionTotal(elementos: Array<{ duracion_segundos: number | null }>): number {
    return elementos.reduce((total, el) => total + (el.duracion_segundos || 0), 0)
}

/**
 * Ordena un array de objetos por una propiedad
 */
export function ordenarPor<T>(array: T[], propiedad: keyof T, orden: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
        const valorA = a[propiedad]
        const valorB = b[propiedad]

        if (valorA === valorB) return 0

        const comparacion = valorA < valorB ? -1 : 1
        return orden === 'asc' ? comparacion : -comparacion
    })
}

/**
 * Agrupa un array por una propiedad
 */
export function agruparPor<T>(array: T[], propiedad: keyof T): Record<string, T[]> {
    return array.reduce((grupos, item) => {
        const clave = String(item[propiedad])
        if (!grupos[clave]) {
            grupos[clave] = []
        }
        grupos[clave].push(item)
        return grupos
    }, {} as Record<string, T[]>)
}

/**
 * Elimina duplicados de un array
 */
export function eliminarDuplicados<T>(array: T[], propiedad?: keyof T): T[] {
    if (!propiedad) {
        return [...new Set(array)]
    }

    const vistos = new Set()
    return array.filter(item => {
        const valor = item[propiedad]
        if (vistos.has(valor)) {
            return false
        }
        vistos.add(valor)
        return true
    })
}
