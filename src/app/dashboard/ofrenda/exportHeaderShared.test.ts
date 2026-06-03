import { describe, it, expect } from 'vitest'
import { formatExportPeriodLabel, buildExportLegend } from './exportHeaderShared'
import type { OfrendaExportLabels } from './ofrendaLocale'

const labels = {
    legendJueves: 'Jueves',
    legendDomManana: 'Dom. mañana',
    legendDomTarde: 'Dom. tarde',
} as Pick<OfrendaExportLabels, 'legendJueves' | 'legendDomManana' | 'legendDomTarde'> as OfrendaExportLabels

describe('exportHeaderShared', () => {
    it('no duplica el año si tituloMes ya lo incluye', () => {
        expect(formatExportPeriodLabel('Mayo 2026', 2026)).toBe('Mayo 2026')
        expect(formatExportPeriodLabel('Mayo', 2026)).toBe('Mayo 2026')
    })

    it('leyenda domingo mañana usa azul visible sobre navy', () => {
        const legend = buildExportLegend(labels)
        const dom = legend.find(i => i.label === 'Dom. mañana')
        expect(dom?.color).toBe('#5b9fd4')
    })
})
