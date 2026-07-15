
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/notifications/asignacionPush'
import { translations } from '@/lib/i18n/translations'
import { formatHoraNotificacion } from '@/lib/format-hora-notificacion'
import type { Language, TranslationKey } from '@/lib/i18n/types'

export const dynamic = 'force-dynamic'

/**
 * Recordatorios diarios de asignaciones (cron). Usa el cliente service-role:
 * un cron no tiene sesión, así que con el cliente anónimo la RLS devolvía
 * cero cultos y cero suscripciones (nunca llegó a enviar nada).
 */
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    try {
        console.log('CRON: Iniciando envío de recordatorios diarios (9:00 AM)...')
        const admin = createAdminClient()

        // 1. Cultos de hoy (todas las sedes)
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const { data: cultos, error: cultosError } = await admin
            .from('cultos')
            .select('*, tipo_culto:culto_types(*)')
            .eq('fecha', todayStr)

        if (cultosError) throw cultosError
        if (!cultos || cultos.length === 0) {
            return NextResponse.json({ message: 'No hay cultos para hoy.' })
        }

        const notificationsSent: Array<{ userId: string; roleKey: string }> = []

        for (const culto of cultos) {
            const roles: Array<{ id: string | null; key: TranslationKey }> = [
                { id: culto.id_usuario_intro, key: 'cultos.role.intro' },
                { id: culto.id_usuario_ensenanza, key: 'cultos.role.teaching' },
                { id: culto.id_usuario_finalizacion, key: 'cultos.role.final' },
                { id: culto.id_usuario_testimonios, key: 'cultos.role.testimonies' },
            ]

            for (const role of roles) {
                if (!role.id) continue

                const enviado = await sendPushToUser(
                    admin,
                    role.id,
                    (lang: Language) => {
                        const t = (key: TranslationKey) =>
                            translations[lang]?.[key] ?? translations['es-ES'][key] ?? String(key)
                        return {
                            title: t('notifications.reminder.title'),
                            body: t('notifications.reminder.body')
                                .replace('{role}', t(role.key))
                                .replace('{type}', culto.tipo_culto?.nombre || 'Culto') // i18n-ignore — nombre de catálogo en BD
                                .replace('{time}', formatHoraNotificacion(culto.hora_inicio)),
                        }
                    },
                    `/dashboard/cultos/${culto.id}`,
                )

                if (enviado) notificationsSent.push({ userId: role.id, roleKey: role.key })
            }
        }

        return NextResponse.json({
            message: `Proceso completado. Notificaciones enviadas: ${notificationsSent.length}`,
            details: notificationsSent,
        })
    } catch (error) {
        console.error('CRON Reminders Error:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
