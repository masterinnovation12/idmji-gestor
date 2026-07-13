import type { ExportPeopleScope } from './exportPeopleScope'

/**
 * Secciones seleccionables de la exportación de Labores Generales (PNG/PDF).
 * Cada sección corresponde a una o varias filas de la tabla exportada.
 */
export type ExportSectionKey =
    | 'sacos'
    | 'realiza'
    | 'apoyo'
    | 'vigilancia'
    | 'primera_vez'
    | 'segunda_tercera_vez'
    | 'imposicion_manos'
    | 'colaboradores'
    | 'testimonios'

/**
 * Orden canónico de las secciones (idéntico al orden de filas del documento).
 * Testimonios va tras «Imposición de manos» (cierre del bloque G1) y antes de
 * los colaboradores de Grupo 2.
 */
export const EXPORT_SECTIONS_ORDER: readonly ExportSectionKey[] = [
    'sacos',
    'realiza',
    'apoyo',
    'vigilancia',
    'primera_vez',
    'segunda_tercera_vez',
    'imposicion_manos',
    'testimonios',
    'colaboradores',
]

/** Secciones que pintan filas de roles del Grupo 1 (en orden de fila). */
export const EXPORT_G1_SECTIONS: readonly ExportSectionKey[] = [
    'realiza',
    'apoyo',
    'vigilancia',
    'primera_vez',
    'segunda_tercera_vez',
    'imposicion_manos',
]

/**
 * Defaults por alcance: G1+G2 → todo seleccionado;
 * Solo G2 → únicamente colaboradores y testimonios.
 */
export function defaultSectionsForScope(scope: ExportPeopleScope): ExportSectionKey[] {
    if (scope === 'g2') return ['testimonios', 'colaboradores']
    return [...EXPORT_SECTIONS_ORDER]
}

/** Normaliza una selección al orden canónico (y descarta claves desconocidas). */
export function sortSections(sections: readonly string[]): ExportSectionKey[] {
    return EXPORT_SECTIONS_ORDER.filter(k => sections.includes(k))
}

/** Filas de roles G1 a pintar según la selección, en orden canónico. */
export function g1RowsFromSections(sections: readonly ExportSectionKey[]): ExportSectionKey[] {
    return EXPORT_G1_SECTIONS.filter(k => sections.includes(k))
}

export function sectionsIncludeSacos(sections: readonly ExportSectionKey[]): boolean {
    return sections.includes('sacos')
}

export function sectionsIncludeColaboradores(sections: readonly ExportSectionKey[]): boolean {
    return sections.includes('colaboradores')
}

export function sectionsIncludeTestimonios(sections: readonly ExportSectionKey[]): boolean {
    return sections.includes('testimonios')
}

export function toggleSection(
    sections: readonly ExportSectionKey[],
    key: ExportSectionKey,
): ExportSectionKey[] {
    const next = sections.includes(key)
        ? sections.filter(k => k !== key)
        : [...sections, key]
    return sortSections(next)
}
