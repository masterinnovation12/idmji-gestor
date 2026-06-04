import { describe, it, expect } from 'vitest'
import {
    exportIncludesGroup1,
    exportIncludesSacosRows,
    exportPeopleScopeFileSuffix,
    isCollaboratorsOnlyExport,
} from './exportPeopleScope'

describe('exportPeopleScope', () => {
    it('modo g2 excluye G1 y sacos', () => {
        expect(isCollaboratorsOnlyExport('g2')).toBe(true)
        expect(exportIncludesGroup1('g2')).toBe(false)
        expect(exportIncludesSacosRows('g2')).toBe(false)
        expect(exportIncludesGroup1('all')).toBe(true)
        expect(exportIncludesSacosRows('all')).toBe(true)
    })

    it('sufijo de archivo para colaboradores', () => {
        expect(exportPeopleScopeFileSuffix('all')).toBe('')
        expect(exportPeopleScopeFileSuffix('g2')).toBe('-colaboradores')
    })
})
