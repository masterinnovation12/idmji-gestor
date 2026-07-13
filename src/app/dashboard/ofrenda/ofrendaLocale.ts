import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { translations } from '@/lib/i18n/translations'
import type { Language } from '@/lib/i18n/types'
import type { TranslationKey } from '@/lib/i18n/types'

export type OfrDiaTipo = 'jueves' | 'domingo' | 'domingo_tarde'

export function getDateFnsLocale(language: Language) {
    return language === 'ca-ES' ? ca : es
}

export function tOfrenda(language: Language, key: TranslationKey): string {
    return translations[language][key] ?? key
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        template
    )
}

export function getMonthLabel(language: Language, mes: number): string {
    const key = `ofrenda.month.${mes}` as TranslationKey
    return tOfrenda(language, key)
}

export function getTituloMes(language: Language, mes: number, anio: number): string {
    return `${getMonthLabel(language, mes)} ${anio}`
}

/** Etiqueta corta de fecha alineada con la tabla (ej. «Jue 4 may» o «Dom 7 may · Mañana»). */
export function formatServicioFechaLabel(
    language: Language,
    fecha: string,
    diaTipo: OfrDiaTipo,
    t: (key: TranslationKey) => string
): string {
    const dateLocale = getDateFnsLocale(language)
    const d = new Date(fecha + 'T00:00:00')
    const dia = diaTipo === 'jueves' ? t('ofrenda.days.jueShort') : t('ofrenda.days.domShort')
    const numero = format(d, 'd', { locale: dateLocale })
    const mes = format(d, 'MMM', { locale: dateLocale }).toLowerCase()
    return `${dia} ${numero} ${mes}`
}

export interface OfrendaExportLabels {
    churchName: string
    titleDoc: string
    rolFecha: string
    secuencia: string
    semanaIso: string
    realiza: string
    apoyo: string
    vigilancia: string
    colaboradores: string
    colaborador1: string
    colaborador2: string
    colaborador3: string
    primeraVez: string
    segundaTerceraVez: string
    imposicionManos: string
    testimonio1: string
    testimonio2: string
    testimonios: string
    jueves: string
    domingo: string
    manana: string
    tarde: string
    legendJueves: string
    legendDomManana: string
    legendDomTarde: string
    officialSite: string
    footer: string
    sacosMeta: (total: number, j: number, dm: number, dt: number) => string
}

export function getExportLabels(language: Language): OfrendaExportLabels {
    const t = (k: TranslationKey) => tOfrenda(language, k)
    return {
        churchName: t('ofrenda.subtitle'),
        titleDoc: t('ofrenda.export.titleDoc'),
        rolFecha: t('ofrenda.table.rolFecha'),
        secuencia: t('ofrenda.table.secuencia'),
        semanaIso: t('ofrenda.table.semanaIso'),
        realiza: t('ofrenda.roles.realiza'),
        apoyo: t('ofrenda.roles.apoyo'),
        vigilancia: t('ofrenda.roles.vigilancia'),
        colaboradores: t('ofrenda.roles.colaboradores'),
        colaborador1: `${t('ofrenda.roles.colaborador')} 1`,
        colaborador2: `${t('ofrenda.roles.colaborador')} 2`,
        colaborador3: `${t('ofrenda.roles.colaborador')} 3`,
        primeraVez: t('ofrenda.roles.colaborador1vez'),
        segundaTerceraVez: t('ofrenda.roles.colaborador23vez'),
        imposicionManos: t('ofrenda.roles.imposicionManos'),
        testimonio1: t('ofrenda.roles.testimonio1'),
        testimonio2: t('ofrenda.roles.testimonio2'),
        testimonios: t('ofrenda.roles.testimonios'),
        jueves: t('ofrenda.days.jueves'),
        domingo: t('ofrenda.days.domingo'),
        manana: t('ofrenda.days.manana'),
        tarde: t('ofrenda.days.tarde'),
        legendJueves: t('ofrenda.legend.jueves'),
        legendDomManana: t('ofrenda.legend.domManana'),
        legendDomTarde: t('ofrenda.legend.domTarde'),
        officialSite: t('ofrenda.export.officialSite'),
        footer: t('ofrenda.export.footer'),
        sacosMeta: (total, j, dm, dt) =>
            interpolate(t('ofrenda.export.sacosMeta'), { total, j, dm, dt }),
    }
}
