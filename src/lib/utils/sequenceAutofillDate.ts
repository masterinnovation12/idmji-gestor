/**
 * Fechas de culto y app_config pueden venir como "yyyy-MM-dd" o ISO; comparar siempre en yyyy-MM-dd.
 */
export function normalizeSequenceDate(d: string | undefined): string {
    if (!d) return '2000-01-01'
    return d.length >= 10 ? d.slice(0, 10) : d
}

/**
 * Rama incremental (no reemplazo total) en Alabanza: puntero ya coincide con este culto,
 * o el autofill se disparó explícitamente para esta fecha de culto (p. ej. domingo tras fijar secuencia el jueves).
 */
export function isAlabanzaIncrementalCulto(
    cultoFecha: string,
    pointerDate: string,
    targetWeekReference: string
): boolean {
    const cf = normalizeSequenceDate(cultoFecha)
    const pd = normalizeSequenceDate(pointerDate)
    const tf = normalizeSequenceDate(targetWeekReference)
    return cf === pd || cf === tf
}

/**
 * Rama incremental en Enseñanza: coincide con uno de los punteros, o con la fecha disparadora.
 */
export function isEnsenanzaIncrementalCulto(
    cultoFecha: string,
    himnoPointerDate: string,
    coroPointerDate: string,
    targetWeekReference: string
): boolean {
    const cf = normalizeSequenceDate(cultoFecha)
    const h = normalizeSequenceDate(himnoPointerDate)
    const c = normalizeSequenceDate(coroPointerDate)
    const tf = normalizeSequenceDate(targetWeekReference)
    return cf === h || cf === c || cf === tf
}
