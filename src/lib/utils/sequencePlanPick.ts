/** Filas mínimas de plan_himnos_coros para derivar punteros de secuencia. */
export type PlanRowForSequence = {
    tipo: 'himno' | 'coro'
    orden: number
    himno_id: number | null
    coro_id: number | null
}

/**
 * Último himno y último coro según `orden` (bloques independientes).
 * Usado para fijar `ultimo_*_id_*` en app_config.
 */
export function pickLastHimnoCoroIdsForSequence(rows: PlanRowForSequence[]): {
    lastHimnoId: number | null
    lastCoroId: number | null
} {
    const himnos = rows
        .filter((r) => r.tipo === 'himno' && r.himno_id != null)
        .sort((a, b) => a.orden - b.orden)
    const coros = rows
        .filter((r) => r.tipo === 'coro' && r.coro_id != null)
        .sort((a, b) => a.orden - b.orden)
    return {
        lastHimnoId: himnos.length ? himnos[himnos.length - 1].himno_id! : null,
        lastCoroId: coros.length ? coros[coros.length - 1].coro_id! : null,
    }
}

export function pickLastCoroIdForSequence(rows: PlanRowForSequence[]): number | null {
    const coros = rows
        .filter((r) => r.tipo === 'coro' && r.coro_id != null)
        .sort((a, b) => a.orden - b.orden)
    return coros.length ? coros[coros.length - 1].coro_id! : null
}
