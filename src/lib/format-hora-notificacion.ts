/**
 * Formato legible para textos de notificación push (sin segundos ni ceros a la izquierda en la hora).
 * Ej.: "19:00:00" → "19 h", "09:30:00" → "9:30 h"
 */
export function formatHoraNotificacion(hora: string | null | undefined): string {
    if (hora == null || String(hora).trim() === '') return '—'
    const parts = String(hora).trim().split(':')
    const h = Number.parseInt(parts[0] ?? '', 10)
    const m = Number.parseInt(parts[1] ?? '0', 10)
    if (Number.isNaN(h)) return '—'
    const min = Number.isNaN(m) ? 0 : m
    if (min === 0) return `${h} h`
    const mm = min.toString().padStart(2, '0')
    return `${h}:${mm} h`
}
