/**
 * Lógica pura del navegador de cultos del dashboard.
 * Misma regla en SSR (page.tsx) y en CultoNavigator (cliente).
 */
import { addWeeks, eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, subWeeks } from 'date-fns'

export interface DashboardCultoPick {
    hora_inicio: string
    estado?: string | null
}

/** ±1 semana desde hoy (lunes a domingo): 21 días. */
export function dashboardNavigatorBounds(today: Date): { minDate: Date; maxDate: Date } {
    return {
        minDate: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
        maxDate: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
    }
}

export function groupCultosByFecha<T extends { fecha: string }>(cultos: readonly T[]): Record<string, T[]> {
    const grouped: Record<string, T[]> = {}
    for (const culto of cultos) {
        const list = grouped[culto.fecha]
        if (list) list.push(culto)
        else grouped[culto.fecha] = [culto]
    }
    return grouped
}

/**
 * Qué culto mostrar para un día:
 * - Un solo culto → ese.
 * - Hoy con varios: <10h → 10h; 10–17h → 10h salvo que ya esté realizado, entonces 17h; ≥17h → 17h.
 * - Otros días con varios → el de las 10h (o el primero).
 */
export function pickDefaultCultoForDay<T extends DashboardCultoPick>(
    list: readonly T[],
    date: Date,
    now: Date,
): T | null {
    if (list.length === 0) return null
    if (list.length === 1) return list[0]

    if (isSameDay(date, now)) {
        const hour = now.getHours()
        if (hour < 10) {
            return list.find((c) => c.hora_inicio.startsWith('10')) ?? list[0]
        }
        if (hour < 17) {
            const c10 = list.find((c) => c.hora_inicio.startsWith('10'))
            if (c10?.estado === 'realizado') {
                return list.find((c) => c.hora_inicio.startsWith('17')) ?? c10
            }
            return c10 ?? list[0]
        }
        return list.find((c) => c.hora_inicio.startsWith('17')) ?? list[1] ?? list[0]
    }

    return list.find((c) => c.hora_inicio.startsWith('10')) ?? list[0]
}

/**
 * Caché del rango completo: cada día tiene lista (posible vacía).
 * Así prev/siguiente no hacen fetch ni muestran un hueco de carga.
 */
export function seedNavigatorCache<T extends { fecha: string }>(
    minDate: Date,
    maxDate: Date,
    cultos: readonly T[],
): Record<string, T[]> {
    const grouped = groupCultosByFecha(cultos)
    const cache: Record<string, T[]> = {}
    for (const day of eachDayOfInterval({ start: minDate, end: maxDate })) {
        const key = format(day, 'yyyy-MM-dd')
        cache[key] = grouped[key] ?? []
    }
    return cache
}

/**
 * El servidor es la fuente de verdad del rango ±1 semana:
 * un culto borrado deja de aparecer; una asignación nueva sustituye la vieja.
 * Las fechas fuera del rango (p. ej. el próximo culto lejano) se conservan.
 */
export function applyAuthoritativeRange<T extends { fecha: string }>(
    prev: Record<string, T[]>,
    minDate: Date,
    maxDate: Date,
    cultos: readonly T[],
): Record<string, T[]> {
    const seeded = seedNavigatorCache(minDate, maxDate, cultos)
    const next: Record<string, T[]> = { ...prev }
    for (const [key, list] of Object.entries(seeded)) {
        next[key] = list
    }
    return next
}

/** @deprecated Usar applyAuthoritativeRange — el rango del servidor pisa el rango completo. */
export function mergeRangeIntoCache<T extends { fecha: string }>(
    prev: Record<string, T[]>,
    minDate: Date,
    maxDate: Date,
    cultos: readonly T[],
): Record<string, T[]> {
    return applyAuthoritativeRange(prev, minDate, maxDate, cultos)
}

export interface NavigatorCultoStamp {
    id: string
    fecha: string
    hora_inicio?: string | null
    estado?: string | null
    id_usuario_intro?: string | null
    id_usuario_ensenanza?: string | null
    id_usuario_finalizacion?: string | null
    id_usuario_testimonios?: string | null
    updated_at?: string | null
    lecturas?: readonly unknown[] | null
    plan_himnos_coros?: readonly unknown[] | null
    meta_data?: { observaciones?: string } | null
    usuario_intro?: { id?: string | null } | null
    usuario_ensenanza?: { id?: string | null } | null
    usuario_finalizacion?: { id?: string | null } | null
    usuario_testimonios?: { id?: string | null } | null
}

function idsOf(list: readonly unknown[] | null | undefined): string {
    if (!list?.length) return ''
    return list.map((item) => {
        if (item && typeof item === 'object' && 'id' in item) {
            const id = (item as { id?: unknown }).id
            return id == null ? '' : String(id)
        }
        return ''
    }).join(',')
}

/** Huella del rango SSR: si cambia, el navegador sustituye la caché sin esperar un clic. */
export function navigatorRangeFingerprint(cultos: readonly NavigatorCultoStamp[] | undefined): string {
    if (!cultos?.length) return ''
    return [...cultos]
        .map((c) => [
            c.id,
            c.fecha,
            c.hora_inicio ?? '',
            c.estado ?? '',
            c.id_usuario_intro ?? c.usuario_intro?.id ?? '',
            c.id_usuario_ensenanza ?? c.usuario_ensenanza?.id ?? '',
            c.id_usuario_finalizacion ?? c.usuario_finalizacion?.id ?? '',
            c.id_usuario_testimonios ?? c.usuario_testimonios?.id ?? '',
            c.updated_at ?? '',
            idsOf(c.lecturas),
            idsOf(c.plan_himnos_coros),
            c.meta_data?.observaciones ?? '',
        ].join(':'))
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .join('|')
}
