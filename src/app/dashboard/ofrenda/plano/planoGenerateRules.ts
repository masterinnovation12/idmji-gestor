import type { TranslationKey } from '@/lib/i18n/types'

/** Fuente única: motor + popover ⓘ en Generar plano. */
export const PLANO_GENERATE_RULE_IDS = [
    'pairingGender',
    'pairingCoupleOnly',
    'coupleManOfrendario',
    'starSameGender',
    'starFallback',
    'oneRolePerService',
    'turnPool',
    'activeOnly',
    'capacity',
    'rotation',
    'couplePriority',
    'antiRepeat',
    'pairVariety',
] as const

export type PlanoGenerateRuleId = (typeof PLANO_GENERATE_RULE_IDS)[number]

const RULE_I18N: Record<PlanoGenerateRuleId, TranslationKey> = {
    pairingGender: 'ofrenda.planoGenerate.rules.pairingGender',
    pairingCoupleOnly: 'ofrenda.planoGenerate.rules.pairingCoupleOnly',
    coupleManOfrendario: 'ofrenda.planoGenerate.rules.coupleManOfrendario',
    starSameGender: 'ofrenda.planoGenerate.rules.starSameGender',
    starFallback: 'ofrenda.planoGenerate.rules.starFallback',
    oneRolePerService: 'ofrenda.planoGenerate.rules.oneRolePerService',
    turnPool: 'ofrenda.planoGenerate.rules.turnPool',
    activeOnly: 'ofrenda.planoGenerate.rules.activeOnly',
    capacity: 'ofrenda.planoGenerate.rules.capacity',
    rotation: 'ofrenda.planoGenerate.rules.rotation',
    couplePriority: 'ofrenda.planoGenerate.rules.couplePriority',
    antiRepeat: 'ofrenda.planoGenerate.rules.antiRepeat',
    pairVariety: 'ofrenda.planoGenerate.rules.pairVariety',
}

export function planoGenerateRuleKeys(): TranslationKey[] {
    return PLANO_GENERATE_RULE_IDS.map(id => RULE_I18N[id])
}
