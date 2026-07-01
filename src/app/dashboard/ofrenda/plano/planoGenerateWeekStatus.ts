import type { OfrServicio } from '../actions'

export type CultoFillStatus = 'empty' | 'partial' | 'full'
export type WeekFillStatus = 'empty' | 'partial' | 'full'

export interface PlanoSacosConfig {
    sacos_jueves: number
    sacos_domingo: number
    sacos_domingo_tarde: number
}

export interface CultoFillInfo {
    servicioId: string
    diaTipo: OfrServicio['dia_tipo']
    count: number
    expected: number
    status: CultoFillStatus
}

export interface WeekFillInfo {
    semanaIso: number
    weekStatus: WeekFillStatus
    cultos: CultoFillInfo[]
}

export function expectedPlanoAssignments(
    diaTipo: OfrServicio['dia_tipo'],
    sacos: PlanoSacosConfig,
): number {
    if (diaTipo === 'jueves') return sacos.sacos_jueves * 2
    if (diaTipo === 'domingo') return sacos.sacos_domingo * 2
    return sacos.sacos_domingo_tarde * 2
}

export function cultoFillStatus(count: number, expected: number): CultoFillStatus {
    if (expected <= 0 || count <= 0) return 'empty'
    if (count >= expected) return 'full'
    return 'partial'
}

export function weekFillStatusFromCultos(cultos: readonly CultoFillInfo[]): WeekFillStatus {
    if (!cultos.length) return 'empty'
    const allEmpty = cultos.every(c => c.status === 'empty')
    if (allEmpty) return 'empty'
    const allFull = cultos.every(c => c.status === 'full')
    if (allFull) return 'full'
    return 'partial'
}

export function buildWeekFillInfo(
    servicios: readonly OfrServicio[],
    countByServicioId: ReadonlyMap<string, number>,
    sacos: PlanoSacosConfig,
): WeekFillInfo {
    const cultos = servicios.map(s => {
        const expected = expectedPlanoAssignments(s.dia_tipo, sacos)
        const count = countByServicioId.get(s.id) ?? 0
        return {
            servicioId: s.id,
            diaTipo: s.dia_tipo,
            count,
            expected,
            status: cultoFillStatus(count, expected),
        }
    })
    return {
        semanaIso: servicios[0]?.semana_iso ?? 0,
        weekStatus: weekFillStatusFromCultos(cultos),
        cultos,
    }
}
