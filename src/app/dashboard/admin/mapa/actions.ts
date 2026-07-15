'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResponse } from '@/types/database'

/**
 * Datos del mapa de sedes (solo ADMIN): ubicación, estado, horario semanal
 * y contadores básicos de cada sede.
 */

export interface HorarioMapa {
    day_of_week: number
    default_time: string
    tipo_nombre: string
    tipo_color: string
}

export interface SedeMapa {
    id: string
    nombre: string
    slug: string
    ciudad: string | null
    direccion: string | null
    activo: boolean
    es_principal: boolean
    lat: number | null
    lng: number | null
    usuarios: number
    cultosFuturos: number
    horarios: HorarioMapa[]
}

export async function getMapaData(): Promise<ActionResponse<SedeMapa[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()
        const hoy = new Date().toISOString().slice(0, 10)

        const { data: sedes, error: sedesError } = await admin
            .from('sedes')
            .select('id, nombre, slug, ciudad, direccion, activo, es_principal, lat, lng')
            .order('es_principal', { ascending: false })
            .order('nombre')
        if (sedesError) throw sedesError

        const { data: horarios, error: horariosError } = await admin
            .from('culto_schedules')
            .select('sede_id, day_of_week, default_time, tipo:culto_types(nombre, color)')
            .order('day_of_week')
            .order('default_time')
        if (horariosError) throw horariosError

        const horariosPorSede = new Map<string, HorarioMapa[]>()
        for (const h of (horarios ?? []) as unknown as Array<{
            sede_id: string
            day_of_week: number
            default_time: string
            tipo: { nombre: string; color: string } | null
        }>) {
            const list = horariosPorSede.get(h.sede_id) ?? []
            list.push({
                day_of_week: h.day_of_week,
                default_time: h.default_time.slice(0, 5),
                tipo_nombre: h.tipo?.nombre ?? '—',
                tipo_color: h.tipo?.color ?? '#94a3b8',
            })
            horariosPorSede.set(h.sede_id, list)
        }

        const result: SedeMapa[] = await Promise.all(
            (sedes ?? []).map(async sede => {
                const [usuarios, cultos] = await Promise.all([
                    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('sede_id', sede.id),
                    admin.from('cultos').select('id', { count: 'exact', head: true }).eq('sede_id', sede.id).gte('fecha', hoy),
                ])
                return {
                    id: sede.id,
                    nombre: sede.nombre,
                    slug: sede.slug,
                    ciudad: sede.ciudad,
                    direccion: sede.direccion,
                    activo: sede.activo,
                    es_principal: sede.es_principal,
                    lat: sede.lat,
                    lng: sede.lng,
                    usuarios: usuarios.count ?? 0,
                    cultosFuturos: cultos.count ?? 0,
                    horarios: horariosPorSede.get(sede.id) ?? [],
                }
            }),
        )

        return { success: true, data: result }
    } catch (e) {
        console.error('getMapaData:', e)
        return { success: false, error: 'Error al cargar el mapa de sedes' }
    }
}
