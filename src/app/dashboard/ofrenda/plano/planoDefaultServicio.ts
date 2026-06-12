/**
 * Elige el servicio por defecto del plano: hoy si existe, si no el siguiente;
 * si todo el mes ya pasó, el último del mes.
 */

export interface ServicioOrdenable {
    id: string
    fecha: string
    posicion: number
}

export function todayIsoLocal(date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function pickDefaultServicioId(
    servicios: ServicioOrdenable[],
    today: string,
): string | null {
    if (servicios.length === 0) return null

    const sorted = [...servicios].sort(
        (a, b) => a.fecha.localeCompare(b.fecha) || a.posicion - b.posicion,
    )

    const upcoming = sorted.find(s => s.fecha >= today)
    if (upcoming) return upcoming.id

    return sorted[sorted.length - 1]!.id
}
