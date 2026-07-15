import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectSubscriptionsForSend } from '@/app/actions/notifications-subscriptions'
import { profilePreferredLanguage } from '@/lib/profile-language'
import { formatHoraNotificacion } from '@/lib/format-hora-notificacion'
import { translations } from '@/lib/i18n/translations'
import type { Language, TranslationKey } from '@/lib/i18n/types'

/**
 * Push de asignaciones de púlpito.
 *
 * El envío usa el cliente service-role: la RLS de `user_subscriptions` solo
 * deja leer las suscripciones PROPIAS, así que con el cliente de sesión del
 * que asigna nunca se encontraban las del hermano asignado (bug histórico:
 * el push solo funcionaba al asignarse uno a sí mismo).
 *
 * Reglas: se notifica solo a usuarios RECIÉN asignados (no al desasignar),
 * en su idioma preferido, respetando `profiles.notificaciones_activas`, y
 * las suscripciones caducadas (404/410) se eliminan. Todo best-effort: un
 * fallo de push jamás rompe el guardado del culto.
 */

export type RolAsignacion = 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios'

export interface AsignacionesCulto {
    id_usuario_intro: string | null
    id_usuario_finalizacion: string | null
    id_usuario_ensenanza: string | null
    id_usuario_testimonios: string | null
}

export interface CultoParaNotificar {
    id: string
    fecha: string
    horaInicio: string
    tipoNombre: string
}

export interface CambioAsignacion {
    rol: RolAsignacion
    userId: string
}

const CAMPO_POR_ROL: Record<RolAsignacion, keyof AsignacionesCulto> = {
    introduccion: 'id_usuario_intro',
    finalizacion: 'id_usuario_finalizacion',
    ensenanza: 'id_usuario_ensenanza',
    testimonios: 'id_usuario_testimonios',
}

const ROL_LABEL_KEY: Record<RolAsignacion, TranslationKey> = {
    introduccion: 'admin.stats.intro',
    finalizacion: 'admin.stats.final',
    ensenanza: 'admin.stats.teaching',
    testimonios: 'admin.stats.testimonies',
}

/** Roles cuyo usuario ha cambiado a alguien NUEVO (desasignar no notifica). */
export function diffAsignacionesNuevas(
    actual: AsignacionesCulto,
    nuevo: AsignacionesCulto,
): CambioAsignacion[] {
    const cambios: CambioAsignacion[] = []
    for (const [rol, campo] of Object.entries(CAMPO_POR_ROL) as Array<[RolAsignacion, keyof AsignacionesCulto]>) {
        const antes = actual[campo] ?? null
        const despues = nuevo[campo] ?? null
        if (despues && despues !== antes) cambios.push({ rol, userId: despues })
    }
    return cambios
}

/**
 * Fecha legible en el idioma del receptor. En catalán aplica l'elisió
 * davant de mes que comença per vocal ("16 d'octubre", "16 de juliol").
 */
export function formatFechaNotificacion(lang: Language, fechaISO: string): string {
    const date = new Date(`${fechaISO}T12:00:00`)
    if (Number.isNaN(date.getTime())) return fechaISO
    const weekday = date.toLocaleDateString(lang, { weekday: 'long' })
    const month = date.toLocaleDateString(lang, { month: 'long' })
    const day = date.getDate()
    if (lang === 'ca-ES') {
        const prep = /^[aeiouh]/i.test(month) ? "d'" : 'de '
        return `${weekday} ${day} ${prep}${month}`
    }
    return `${weekday} ${day} de ${month}`
}

/** Título y cuerpo de la notificación en el idioma del receptor (puro). */
export function buildAsignacionNotification(
    lang: Language,
    rol: RolAsignacion,
    culto: Pick<CultoParaNotificar, 'fecha' | 'horaInicio' | 'tipoNombre'>,
): { title: string; body: string } {
    const t = (key: TranslationKey): string =>
        translations[lang]?.[key] ?? translations['es-ES'][key] ?? String(key)
    return {
        title: t('notifications.asignacion.title'),
        body: t('notifications.asignacion.body')
            .replace('{rol}', t(ROL_LABEL_KEY[rol]))
            .replace('{tipo}', culto.tipoNombre)
            .replace('{fecha}', formatFechaNotificacion(lang, culto.fecha))
            .replace('{hora}', formatHoraNotificacion(culto.horaInicio)),
    }
}

async function getWebPush() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || publicKey.length <= 50 || !privateKey) return null
    try {
        const webpush = (await import('web-push')).default
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@idmji.org', publicKey, privateKey)
        return webpush
    } catch (error) {
        console.error('No se pudo configurar web-push:', error)
        return null
    }
}

function statusCodeOf(reason: unknown): number | null {
    if (reason && typeof reason === 'object' && 'statusCode' in reason) {
        const code = (reason as { statusCode: unknown }).statusCode
        return typeof code === 'number' ? code : null
    }
    return null
}

/**
 * Núcleo de envío push a un usuario (best-effort, nunca lanza). `admin` debe
 * ser un cliente service-role (la RLS impide leer suscripciones ajenas con el
 * cliente de sesión). El contenido se construye por idioma del receptor y las
 * suscripciones caducadas (404/410) se eliminan.
 *
 * @returns true si se envió a alguna suscripción.
 */
export async function sendPushToUser(
    admin: SupabaseClient,
    userId: string,
    buildPayload: (lang: Language) => { title: string; body: string },
    url: string,
): Promise<boolean> {
    try {
        const webpush = await getWebPush()
        if (!webpush) return false

        const { data: profile } = await admin
            .from('profiles')
            .select('idioma_preferido, notificaciones_activas')
            .eq('id', userId)
            .maybeSingle()
        if (profile?.notificaciones_activas === false) return false

        const { data: subscriptions } = await admin
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
        const toSend = selectSubscriptionsForSend(subscriptions ?? [])
        if (toSend.length === 0) return false

        const { title, body } = buildPayload(profilePreferredLanguage(profile))
        const payload = JSON.stringify({ title, body, url })

        const results = await Promise.allSettled(
            toSend.map(sub =>
                webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    payload,
                ),
            ),
        )

        // Poda de suscripciones caducadas (endpoint dado de baja por el navegador)
        const caducadas = results
            .map((r, i) => ({ r, endpoint: toSend[i].endpoint }))
            .filter(({ r }) => r.status === 'rejected' && [404, 410].includes(statusCodeOf(r.reason) ?? 0))
        for (const { endpoint } of caducadas) {
            await admin.from('user_subscriptions').delete().eq('endpoint', endpoint)
        }

        return results.some(r => r.status === 'fulfilled')
    } catch (error) {
        console.error('Push no enviado:', error, { userId, url })
        return false
    }
}

/**
 * Envía la notificación de asignación a un usuario (best-effort, nunca lanza).
 */
export async function sendAsignacionPushToUser(
    admin: SupabaseClient,
    userId: string,
    rol: RolAsignacion,
    culto: CultoParaNotificar,
): Promise<void> {
    await sendPushToUser(
        admin,
        userId,
        lang => buildAsignacionNotification(lang, rol, culto),
        `/dashboard/cultos/${culto.id}`,
    )
}

/**
 * Notifica una tanda de cambios de asignación de un culto (best-effort).
 * Pensado para llamarse tras un guardado exitoso; nunca lanza.
 */
export async function notifyAsignacionesCulto(
    cambios: CambioAsignacion[],
    culto: CultoParaNotificar,
): Promise<void> {
    if (cambios.length === 0) return
    try {
        const admin = createAdminClient()
        for (const cambio of cambios) {
            await sendAsignacionPushToUser(admin, cambio.userId, cambio.rol, culto)
        }
    } catch (error) {
        console.error('No se pudieron notificar las asignaciones:', error, { cultoId: culto.id })
    }
}
