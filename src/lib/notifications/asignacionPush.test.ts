/**
 * Tests del push de asignaciones de púlpito: diff de asignaciones, mensaje
 * en el idioma del receptor (amb elisió catalana), preferencia
 * notificaciones_activas y poda de suscripciones caducadas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    buildAsignacionNotification,
    diffAsignacionesNuevas,
    formatFechaNotificacion,
    sendAsignacionPushToUser,
    type AsignacionesCulto,
    type CultoParaNotificar,
} from './asignacionPush'

const mockSendNotification = vi.fn()
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    },
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}))

const CULTO: CultoParaNotificar = {
    id: 'culto-1',
    fecha: '2026-07-16',
    horaInicio: '19:00',
    tipoNombre: 'Enseñanza',
}

const vacio: AsignacionesCulto = {
    id_usuario_intro: null,
    id_usuario_finalizacion: null,
    id_usuario_ensenanza: null,
    id_usuario_testimonios: null,
}

describe('diffAsignacionesNuevas', () => {
    it('sin cambios → vacío', () => {
        const a = { ...vacio, id_usuario_intro: 'u1' }
        expect(diffAsignacionesNuevas(a, { ...a })).toEqual([])
    })

    it('asignación nueva → incluida con su rol', () => {
        expect(diffAsignacionesNuevas(vacio, { ...vacio, id_usuario_ensenanza: 'u2' })).toEqual([
            { rol: 'ensenanza', userId: 'u2' },
        ])
    })

    it('reasignación (a→b) → notifica al nuevo', () => {
        const antes = { ...vacio, id_usuario_intro: 'u1' }
        const despues = { ...vacio, id_usuario_intro: 'u2' }
        expect(diffAsignacionesNuevas(antes, despues)).toEqual([{ rol: 'introduccion', userId: 'u2' }])
    })

    it('desasignar (a→null) → no notifica', () => {
        const antes = { ...vacio, id_usuario_testimonios: 'u1' }
        expect(diffAsignacionesNuevas(antes, vacio)).toEqual([])
    })

    it('varios roles nuevos a la vez → todos', () => {
        const despues = { ...vacio, id_usuario_intro: 'u1', id_usuario_finalizacion: 'u2' }
        expect(diffAsignacionesNuevas(vacio, despues)).toEqual([
            { rol: 'introduccion', userId: 'u1' },
            { rol: 'finalizacion', userId: 'u2' },
        ])
    })
})

describe('formatFechaNotificacion', () => {
    it('castellano: "jueves 16 de julio"', () => {
        expect(formatFechaNotificacion('es-ES', '2026-07-16')).toBe('jueves 16 de julio')
    })

    it('català sense elisió: "dijous 16 de juliol"', () => {
        expect(formatFechaNotificacion('ca-ES', '2026-07-16')).toBe('dijous 16 de juliol')
    })

    it("català amb elisió davant vocal: \"d'octubre\"", () => {
        expect(formatFechaNotificacion('ca-ES', '2026-10-15')).toBe("dijous 15 d'octubre")
    })

    it("català amb elisió: \"d'abril\"", () => {
        expect(formatFechaNotificacion('ca-ES', '2026-04-16')).toBe("dijous 16 d'abril")
    })
})

describe('buildAsignacionNotification', () => {
    it('mensaje en castellano', () => {
        const { title, body } = buildAsignacionNotification('es-ES', 'introduccion', CULTO)
        expect(title).toBe('¡Nueva asignación!')
        expect(body).toBe('Introducción · Enseñanza · jueves 16 de julio a las 19 h')
    })

    it('missatge en català', () => {
        const { title, body } = buildAsignacionNotification('ca-ES', 'ensenanza', CULTO)
        expect(title).toBe('Nova assignació!')
        expect(body).toBe('Ensenyament · Enseñanza · dijous 16 de juliol a les 19 h')
    })

    it('hora con minutos: "9:30 h"', () => {
        const { body } = buildAsignacionNotification('es-ES', 'finalizacion', {
            ...CULTO,
            horaInicio: '09:30',
        })
        expect(body).toContain('a las 9:30 h')
    })
})

// ─── sendAsignacionPushToUser (admin client mockeado) ────────────────────────

interface AdminMockOptions {
    notificacionesActivas?: boolean
    idioma?: string
    subscriptions?: Array<Record<string, unknown>>
}

function createAdminMock(options: AdminMockOptions) {
    const deletedEndpoints: string[] = []
    const admin = {
        from: (table: string) => {
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            maybeSingle: vi.fn().mockResolvedValue({
                                data: {
                                    idioma_preferido: options.idioma ?? 'es-ES',
                                    notificaciones_activas: options.notificacionesActivas ?? true,
                                },
                                error: null,
                            }),
                        }),
                    }),
                }
            }
            if (table === 'user_subscriptions') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: options.subscriptions ?? [], error: null }),
                    }),
                    delete: vi.fn().mockReturnValue({
                        eq: vi.fn().mockImplementation((_col: string, endpoint: string) => {
                            deletedEndpoints.push(endpoint)
                            return Promise.resolve({ error: null })
                        }),
                    }),
                }
            }
            return {}
        },
    } as unknown as SupabaseClient
    return { admin, deletedEndpoints }
}

const subPwa = (endpoint: string) => ({ client_type: 'pwa', endpoint, p256dh: 'p', auth: 'a' })

describe('sendAsignacionPushToUser', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'x'.repeat(60)
        process.env.VAPID_PRIVATE_KEY = 'y'
        mockSendNotification.mockResolvedValue(undefined)
    })

    it('envía a las suscripciones PWA con payload traducido y deep link', async () => {
        const { admin } = createAdminMock({ subscriptions: [subPwa('https://p1')] })
        await sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)
        expect(mockSendNotification).toHaveBeenCalledTimes(1)
        const [subscription, payload] = mockSendNotification.mock.calls[0] as [Record<string, unknown>, string]
        expect(subscription).toEqual(expect.objectContaining({ endpoint: 'https://p1' }))
        const parsed = JSON.parse(payload)
        expect(parsed.title).toBe('¡Nueva asignación!')
        expect(parsed.url).toBe('/dashboard/cultos/culto-1')
    })

    it('respeta notificaciones_activas = false (no envía)', async () => {
        const { admin } = createAdminMock({
            notificacionesActivas: false,
            subscriptions: [subPwa('https://p1')],
        })
        await sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)
        expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('usa el idioma preferido del receptor (català)', async () => {
        const { admin } = createAdminMock({ idioma: 'ca-ES', subscriptions: [subPwa('https://p1')] })
        await sendAsignacionPushToUser(admin, 'u1', 'testimonios', CULTO)
        const [, payload] = mockSendNotification.mock.calls[0] as [unknown, string]
        expect(JSON.parse(payload).title).toBe('Nova assignació!')
    })

    it('sin suscripciones PWA no envía y no falla', async () => {
        const { admin } = createAdminMock({
            subscriptions: [{ client_type: 'browser', endpoint: 'https://b', p256dh: 'p', auth: 'a' }],
        })
        await expect(sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)).resolves.toBeUndefined()
        expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('poda la suscripción cuando el push devuelve 410 (endpoint caducado)', async () => {
        const { admin, deletedEndpoints } = createAdminMock({
            subscriptions: [subPwa('https://viva'), subPwa('https://caducada')],
        })
        mockSendNotification.mockImplementation((sub: { endpoint: string }) => {
            if (sub.endpoint === 'https://caducada') {
                return Promise.reject(Object.assign(new Error('gone'), { statusCode: 410 }))
            }
            return Promise.resolve(undefined)
        })
        await sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)
        expect(deletedEndpoints).toEqual(['https://caducada'])
    })

    it('un fallo de red (sin statusCode) no poda ni lanza', async () => {
        const { admin, deletedEndpoints } = createAdminMock({ subscriptions: [subPwa('https://p1')] })
        mockSendNotification.mockRejectedValue(new Error('network down'))
        await expect(sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)).resolves.toBeUndefined()
        expect(deletedEndpoints).toEqual([])
    })

    it('sin claves VAPID no envía ni lanza', async () => {
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ''
        const { admin } = createAdminMock({ subscriptions: [subPwa('https://p1')] })
        await expect(sendAsignacionPushToUser(admin, 'u1', 'introduccion', CULTO)).resolves.toBeUndefined()
        expect(mockSendNotification).not.toHaveBeenCalled()
    })
})
