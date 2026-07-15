'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResponse } from '@/types/database'

/**
 * Perfil 360° de un hermano (solo ADMIN): datos de contacto, sede, totales de
 * participación en púlpito por año y por rol, cultos recientes y pertenencia a
 * la labor general. Usa service-role porque el ADMIN consulta cualquier sede.
 */

export interface RolBreakdown {
    intro: number
    ensenanza: number
    testimonios: number
    finalizacion: number
}

export interface CultoReciente {
    id: string
    fecha: string
    hora: string
    tipoNombre: string
    tipoColor: string
    estado: string
    roles: string[]
}

export interface AnioResumen {
    anio: number
    total: number
}

export interface Hermano360 {
    id: string
    nombre: string
    apellidos: string
    email: string | null
    emailContacto: string | null
    telefono: string | null
    rol: string
    pulpito: boolean
    avatarUrl: string | null
    sede: string | null
    totalHistorico: number
    breakdown: RolBreakdown
    lecturas: number
    porAnio: AnioResumen[]
    recientes: CultoReciente[]
    laborGrupos: number[]
}

interface CultoRow {
    id: string
    fecha: string
    hora_inicio: string
    estado: string
    id_usuario_intro: string | null
    id_usuario_finalizacion: string | null
    id_usuario_ensenanza: string | null
    id_usuario_testimonios: string | null
    tipo_culto: { nombre: string; color: string } | null
}

export async function getHermano360(userId: string): Promise<ActionResponse<Hermano360>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()

        const { data: perfil, error: perfilError } = await admin
            .from('profiles')
            .select('id, nombre, apellidos, email, email_contacto, telefono, rol, pulpito, avatar_url, sede:sedes(nombre)')
            .eq('id', userId)
            .maybeSingle()
        if (perfilError) throw perfilError
        if (!perfil) return { success: false, error: 'Hermano no encontrado' }

        // Todos los cultos donde participa (cualquier rol), con tipo
        const { data: cultosRaw, error: cultosError } = await admin
            .from('cultos')
            .select('id, fecha, hora_inicio, estado, id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios, tipo_culto:culto_types(nombre, color)')
            .or(`id_usuario_intro.eq.${userId},id_usuario_ensenanza.eq.${userId},id_usuario_testimonios.eq.${userId},id_usuario_finalizacion.eq.${userId}`)
            .order('fecha', { ascending: false })
        if (cultosError) throw cultosError
        const cultos = (cultosRaw ?? []) as unknown as CultoRow[]

        const breakdown: RolBreakdown = { intro: 0, ensenanza: 0, testimonios: 0, finalizacion: 0 }
        const porAnioMap = new Map<number, number>()
        const recientes: CultoReciente[] = []

        for (const c of cultos) {
            const roles: string[] = []
            if (c.id_usuario_intro === userId) { breakdown.intro++; roles.push('introduccion') }
            if (c.id_usuario_ensenanza === userId) { breakdown.ensenanza++; roles.push('ensenanza') }
            if (c.id_usuario_testimonios === userId) { breakdown.testimonios++; roles.push('testimonios') }
            if (c.id_usuario_finalizacion === userId) { breakdown.finalizacion++; roles.push('finalizacion') }

            const anio = Number(c.fecha.slice(0, 4))
            porAnioMap.set(anio, (porAnioMap.get(anio) ?? 0) + roles.length)

            if (recientes.length < 15) {
                recientes.push({
                    id: c.id,
                    fecha: c.fecha,
                    hora: c.hora_inicio.slice(0, 5),
                    tipoNombre: c.tipo_culto?.nombre ?? '—',
                    tipoColor: c.tipo_culto?.color ?? '#94a3b8',
                    estado: c.estado,
                    roles,
                })
            }
        }

        const totalHistorico = breakdown.intro + breakdown.ensenanza + breakdown.testimonios + breakdown.finalizacion

        // Lecturas leídas
        const { count: lecturas } = await admin
            .from('lecturas_biblicas')
            .select('id', { count: 'exact', head: true })
            .eq('id_usuario_lector', userId)

        // Pertenencia a labor general (por nombre en la misma sede)
        const nombreCompleto = `${perfil.nombre ?? ''} ${perfil.apellidos ?? ''}`.trim()
        let laborGrupos: number[] = []
        if (nombreCompleto) {
            const { data: miembros } = await admin
                .from('ofrenda_miembros')
                .select('grupo')
                .ilike('nombre', nombreCompleto)
            laborGrupos = [...new Set((miembros ?? []).map(m => m.grupo as number))].sort()
        }

        const porAnio: AnioResumen[] = [...porAnioMap.entries()]
            .map(([anio, total]) => ({ anio, total }))
            .sort((a, b) => b.anio - a.anio)

        return {
            success: true,
            data: {
                id: perfil.id,
                nombre: perfil.nombre ?? '',
                apellidos: perfil.apellidos ?? '',
                email: perfil.email ?? null,
                emailContacto: perfil.email_contacto ?? null,
                telefono: perfil.telefono ?? null,
                rol: perfil.rol ?? 'MIEMBRO',
                pulpito: !!perfil.pulpito,
                avatarUrl: perfil.avatar_url ?? null,
                sede: (perfil.sede as { nombre?: string } | null)?.nombre ?? null,
                totalHistorico,
                breakdown,
                lecturas: lecturas ?? 0,
                porAnio,
                recientes,
                laborGrupos,
            },
        }
    } catch (e) {
        console.error('getHermano360:', e)
        return { success: false, error: 'Error al cargar el perfil del hermano' }
    }
}
