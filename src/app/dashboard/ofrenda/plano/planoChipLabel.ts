import type { TranslationKey } from '@/lib/i18n/types'
import type { OfrServicio } from '../actions'

/**
 * Etiqueta corta de un servicio para los chips de selección de día
 * (compartida por Plano, Generar y Exportar): «Jue 6» / «Dom 9 · Mañana».
 */
export function planoServicioChipLabel(
    s: Pick<OfrServicio, 'fecha' | 'dia_tipo'>,
    t: (key: TranslationKey) => string,
): string {
    const dayNum = Number(s.fecha.slice(8, 10))
    if (s.dia_tipo === 'jueves') return `${t('ofrenda.days.jueShort')} ${dayNum}`
    const turno = s.dia_tipo === 'domingo' ? t('ofrenda.days.manana') : t('ofrenda.days.tarde')
    return `${t('ofrenda.days.domShort')} ${dayNum} · ${turno}`
}
