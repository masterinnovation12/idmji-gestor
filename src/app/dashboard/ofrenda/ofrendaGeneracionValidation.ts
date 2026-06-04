import type { TranslationKey } from '@/lib/i18n/types'
import type { ValidacionGeneracionTurno } from './ofrendaMemberAvailability'
import { interpolate } from './ofrendaLocale'

type TFn = (key: TranslationKey) => string

function turnoLabel(t: TFn, diaTipo: ValidacionGeneracionTurno['diaTipo']): string {
    if (diaTipo === 'jueves') return t('ofrenda.days.jueves')
    if (diaTipo === 'domingo') return t('ofrenda.days.manana')
    return t('ofrenda.days.tarde')
}

export function formatDisponibilidadProblemas(
    t: TFn,
    problemas: ValidacionGeneracionTurno[],
): string {
    if (problemas.length === 0) return t('ofrenda.generate.noEligibleGeneric')
    const detalle = problemas
        .map(p =>
            interpolate(t('ofrenda.generate.noEligibleItem'), {
                turno: turnoLabel(t, p.diaTipo),
                grupo: String(p.grupo),
            }),
        )
        .join(' · ')
    return interpolate(t('ofrenda.generate.noEligible'), { detalle })
}
