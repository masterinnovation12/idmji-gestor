/**
 * QA — inventario de notificaciones Labor Ofrenda (estándar premium unificado).
 */
import { describe, it, expect } from 'vitest'
import {
    OFRENDA_FEEDBACK_DURATION,
    OFRENDA_FEEDBACK_OPEN_DELAY_MS,
    buildOfrendaFeedbackPayload,
} from './ofrendaFeedback'

/** Catálogo para revisión manual / regresión. */
export const OFRENDA_NOTIFICATION_CATALOG = [
    {
        area: 'OfrendaPageClient',
        trigger: 'Cambiar mes (error carga)',
        method: 'planError',
        keys: ['ofrenda.toast.loadError'],
    },
    {
        area: 'OfrendaPageClient',
        trigger: 'Generar / regenerar plan (error)',
        method: 'planError',
        keys: ['ofrenda.toast.generateError'],
    },
    {
        area: 'OfrendaPageClient',
        trigger: 'Generar / regenerar plan (éxito)',
        method: 'planSuccess',
        keys: ['ofrenda.toast.planGenerated', 'ofrenda.toast.planRegenerated'],
    },
    {
        area: 'OfrendaPageClient',
        trigger: 'Eliminar plan',
        method: 'planSuccess',
        keys: ['ofrenda.toast.planDeleted'],
    },
    {
        area: 'OfrendaPageClient',
        trigger: 'Config sacos (error / éxito)',
        method: 'planError | planSuccess',
        keys: ['ofrenda.toast.sacosInvalid', 'ofrenda.toast.sacosUpdated'],
    },
    {
        area: 'SacosConfigPanel',
        trigger: 'Valores sacos/ciclo inválidos',
        method: 'quickWarning (= planWarning)',
        keys: ['ofrenda.toast.sacosInvalid'],
    },
    {
        area: 'PlanTable',
        trigger: 'Asignar persona OK / error',
        method: 'quickSuccess | quickError',
        keys: ['ofrenda.toast.assignOk', 'ofrenda.toast.assignError'],
    },
    {
        area: 'PlanTable',
        trigger: 'Secuencia límite incorrecto',
        method: 'planWarning (duration 0)',
        keys: ['ofrenda.sequence.limitMismatch'],
    },
    {
        area: 'PlanTable',
        trigger: 'Secuencia inválida / guardada',
        method: 'quickWarning | quickSuccess | quickError',
        keys: ['ofrenda.toast.sequenceInvalid', 'ofrenda.toast.sequenceOk'],
    },
    {
        area: 'MiembrosManager',
        trigger: 'Añadir / eliminar / activar / importar / reordenar',
        method: 'quick*',
        keys: [
            'ofrenda.toast.memberAdded',
            'ofrenda.toast.memberDeleted',
            'ofrenda.toast.memberDeactivated',
            'ofrenda.toast.memberActivated',
            'ofrenda.toast.memberImported',
        ],
    },
    {
        area: 'ExportPanel',
        trigger: 'PNG / PDF / compartir OK',
        method: 'quickSuccess',
        keys: ['ofrenda.toast.pngOk', 'ofrenda.toast.pdfOk', 'ofrenda.toast.shareOk'],
    },
    {
        area: 'ExportPanel',
        trigger: 'Export / share error',
        method: 'planError',
        keys: ['ofrenda.toast.exportError', 'ofrenda.toast.shareError'],
    },
    {
        area: 'ExportPanel',
        trigger: 'Share no soportado',
        method: 'quickWarning',
        keys: ['ofrenda.export.shareWarn'],
    },
] as const

describe('Labor Ofrenda — catálogo QA notificaciones', () => {
    it('inventario cubre todas las áreas del módulo', () => {
        const areas = new Set(OFRENDA_NOTIFICATION_CATALOG.map((n) => n.area))
        expect(areas.has('OfrendaPageClient')).toBe(true)
        expect(areas.has('PlanTable')).toBe(true)
        expect(areas.has('MiembrosManager')).toBe(true)
        expect(areas.has('ExportPanel')).toBe(true)
        expect(areas.has('SacosConfigPanel')).toBe(true)
        expect(OFRENDA_NOTIFICATION_CATALOG.length).toBeGreaterThanOrEqual(12)
    })
})

describe('Labor Ofrenda — estándar premium de payload', () => {
    it('éxito: 6 s + retardo de apertura', () => {
        const p = buildOfrendaFeedbackPayload('success', 'T', 'D')
        expect(p.duration).toBe(OFRENDA_FEEDBACK_DURATION.plan.success)
        expect(p.openDelayMs).toBe(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
    })

    it('aviso por defecto: 5.5 s + retardo', () => {
        const p = buildOfrendaFeedbackPayload('warning', 'T', 'D')
        expect(p.duration).toBe(OFRENDA_FEEDBACK_DURATION.plan.warning)
        expect(p.openDelayMs).toBe(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
    })

    it('aviso crítico (secuencia): solo cierre manual', () => {
        const p = buildOfrendaFeedbackPayload('warning', 'T', 'D', 0)
        expect(p.duration).toBe(0)
    })

    it('error: solo cierre manual + retardo', () => {
        const p = buildOfrendaFeedbackPayload('error', 'T', 'D', 0)
        expect(p.duration).toBe(0)
        expect(p.openDelayMs).toBe(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
    })
})
