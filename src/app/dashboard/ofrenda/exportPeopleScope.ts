/** Alcance de filas de personas en la exportación (PNG/PDF). */
export type ExportPeopleScope = 'all' | 'g2'

export const EXPORT_PEOPLE_SCOPE_TEST_ID = 'ofrenda-export-people-scope'

export function isCollaboratorsOnlyExport(scope: ExportPeopleScope): boolean {
    return scope === 'g2'
}

export function exportIncludesSacosRows(scope: ExportPeopleScope): boolean {
    return scope === 'all'
}

export function exportIncludesGroup1(scope: ExportPeopleScope): boolean {
    return scope === 'all'
}
