
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendNotificationToUser } from '@/app/actions/notifications'
import { translations, Language } from '@/lib/i18n/translations'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        console.log('CRON: Iniciando envío de recordatorios diarios (9:00 AM)...')
        const supabase = await createClient()

        // 1. Obtener la fecha de hoy en formato YYYY-MM-DD
        const todayStr = format(new Date(), 'yyyy-MM-dd')

        // 2. Buscar cultos para hoy
        const { data: cultos, error: cultosError } = await supabase
            .from('cultos')
            .select(`
                *,
                tipo_culto:culto_types(*)
            `)
            .eq('fecha', todayStr)

        if (cultosError) throw cultosError
        if (!cultos || cultos.length === 0) {
            return NextResponse.json({ message: 'No hay cultos para hoy.' })
        }

        const notificationsSent = []

        for (const culto of cultos) {
            const roles = [
                { id: culto.id_usuario_intro, key: 'cultos.role.intro' },
                { id: culto.id_usuario_ensenanza, key: 'cultos.role.teaching' },
                { id: culto.id_usuario_finalizacion, key: 'cultos.role.final' },
                { id: culto.id_usuario_testimonios, key: 'cultos.role.testimonios' }
            ]

            for (const role of roles) {
                if (role.id) {
                    // Obtener perfil del usuario para saber su idioma
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('language, nombre')
                        .eq('id', role.id)
                        .single()

                    const lang = (profile?.language || 'es-ES') as Language
                    const t = (key: any) => translations[lang][key as keyof typeof translations['es-ES']] || key
                    const locale = lang === 'ca-ES' ? ca : es

                    const roleLabel = t(role.key)
                    const cultoTypeLabel = culto.tipo_culto?.nombre || 'Culto'
                    const timeLabel = culto.hora ? culto.hora.substring(0, 5) : '--:--'

                    const title = t('notifications.reminder.title')
                    const body = t('notifications.reminder.body')
                        .replace('{role}', roleLabel)
                        .replace('{type}', cultoTypeLabel)
                        .replace('{time}', timeLabel)

                    const result = await sendNotificationToUser(
                        role.id,
                        title,
                        body,
                        `/dashboard/cultos/${culto.id}`
                    )

                    if (result.success) {
                        notificationsSent.push({ userId: role.id, role: roleLabel })
                    }
                }
            }
        }

        return NextResponse.json({
            message: `Proceso completado. Notificaciones enviadas: ${notificationsSent.length}`,
            details: notificationsSent
        })

    } catch (error) {
        console.error('CRON Reminders Error:', error)
        return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }
}
