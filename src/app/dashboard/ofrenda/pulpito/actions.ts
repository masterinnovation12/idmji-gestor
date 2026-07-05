'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
    generarAsignacionesPulpito,
    rolesDelCulto,
    type CultoParaAsignar,
    type HermanoPulpito,
    type CargaHistorica,
    type ModoGeneracion,
    type ProblemaAsignacion,
} from '@/lib/utils/pulpitoEngine'
import type { PulpitoRol, PulpitoAvailability } from '@/lib/utils/pulpitoAvailability'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PulpitoHermano {
    id: string
    nombre: string
    availability: PulpitoAvailability | null
}

export interface PulpitoCulto {
    id: string
    fecha: string
    hora_inicio: string
    tipo_nombre: string
    tipo_color: string
    roles: PulpitoRol[]
    asignaciones: Partial<Record<PulpitoRol, { id: string; nombre: string } | null>>
}

export interface PulpitoData {
    cultos: PulpitoCulto[]
    hermanos: PulpitoHermano[]
}

/** Días de historial usados para equilibrar la carga entre períodos. */
const DIAS_HISTORIAL = 45

const ROL_FIELD: Record<PulpitoRol, string> = {
    introduccion: 'id_usuario_intro',
    finalizacion: 'id_usuario_finalizacion',
    ensenanza: 'id_usuario_ensenanza',
    testimonios: 'id_usuario_testimonios',
}

// ─── Auth guard (mismo criterio que ofrenda) ──────────────────────────────────

async function requireEditor() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado', supabase: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'EDITOR'].includes(profile.rol)) {
        return { error: 'Sin permisos', supabase: null }
    }
    return { error: null, supabase }
}

/**
 * Cliente con service-role (bypassa RLS). Necesario para que un ADMIN edite la
 * disponibilidad de OTRO hermano: la política RLS de `profiles` solo permite a
 * cada usuario actualizar su propia fila, así que sin esto el update afecta 0
 * filas sin devolver error.
 */
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Falta configuración de Supabase (service role).')
    }
    return createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado', supabase: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (!profile || profile.rol !== 'ADMIN') {
        return { error: 'Sin permisos', supabase: null }
    }
    return { error: null, supabase }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nombreCompleto(p: { nombre?: string | null; apellidos?: string | null } | null | undefined): string {
    if (!p) return ''
    return [p.nombre, p.apellidos].filter(Boolean).join(' ')
}

type CultoRow = Record<string, unknown> & {
    id: string
    fecha: string
    hora_inicio: string
    meta_data: { ensenanza_modo?: string } | null
    tipo_culto: {
        nombre?: string
        color?: string
        tiene_lectura_introduccion?: boolean
        tiene_lectura_finalizacion?: boolean
        tiene_ensenanza?: boolean
        tiene_testimonios?: boolean
    } | null
}

function mapCultoRow(row: CultoRow): PulpitoCulto {
    const ensenanzaEsVideo = row.meta_data?.ensenanza_modo === 'video_hna_maria_luisa'
    const roles = rolesDelCulto(row.tipo_culto, ensenanzaEsVideo)
    const asignaciones: PulpitoCulto['asignaciones'] = {}

    const relaciones: Record<PulpitoRol, string> = {
        introduccion: 'usuario_intro',
        finalizacion: 'usuario_finalizacion',
        ensenanza: 'usuario_ensenanza',
        testimonios: 'usuario_testimonios',
    }
    const idFields: Record<PulpitoRol, string> = ROL_FIELD

    for (const rol of roles) {
        const userId = row[idFields[rol]] as string | null
        const perfil = row[relaciones[rol]] as { nombre?: string | null; apellidos?: string | null } | null
        asignaciones[rol] = userId ? { id: userId, nombre: nombreCompleto(perfil) || '—' } : null
    }

    return {
        id: row.id,
        fecha: row.fecha,
        hora_inicio: row.hora_inicio,
        tipo_nombre: row.tipo_culto?.nombre ?? '',
        tipo_color: row.tipo_culto?.color ?? '#1f2e85',
        roles,
        asignaciones,
    }
}

const CULTO_SELECT = `
    id, fecha, hora_inicio, meta_data,
    id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios,
    tipo_culto:culto_types(nombre, color, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_ensenanza, tiene_testimonios),
    usuario_intro:profiles!id_usuario_intro(nombre, apellidos),
    usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos),
    usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos),
    usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos)
`

// ─── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Cultos del rango con sus roles/asignaciones + hermanos del púlpito con
 * su disponibilidad. Rango en 'YYYY-MM-DD' inclusive.
 */
export async function getPulpitoData(
    fechaInicio: string,
    fechaFin: string,
): Promise<{ data?: PulpitoData; error?: string }> {
    const supabase = await createClient()

    const [cultosRes, hermanosRes] = await Promise.all([
        supabase
            .from('cultos')
            .select(CULTO_SELECT)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .neq('estado', 'cancelado')
            .order('fecha')
            .order('hora_inicio'),
        supabase
            .from('profiles')
            .select('id, nombre, apellidos, availability')
            .eq('pulpito', true)
            .order('nombre'),
    ])

    if (cultosRes.error) return { error: cultosRes.error.message }
    if (hermanosRes.error) return { error: hermanosRes.error.message }

    const cultos = (cultosRes.data ?? []).map(row => mapCultoRow(row as unknown as CultoRow))
    const hermanos: PulpitoHermano[] = (hermanosRes.data ?? []).map(p => ({
        id: p.id as string,
        nombre: nombreCompleto(p) || (p.id as string),
        availability: (p.availability as PulpitoAvailability | null) ?? null,
    }))

    return { data: { cultos, hermanos } }
}

// ─── Carga histórica ──────────────────────────────────────────────────────────

async function fetchCargaHistorica(
    supabase: NonNullable<Awaited<ReturnType<typeof requireEditor>>['supabase']>,
    fechaInicio: string,
): Promise<CargaHistorica> {
    const desde = new Date(`${fechaInicio}T00:00:00`)
    desde.setDate(desde.getDate() - DIAS_HISTORIAL)
    const desdeStr = desde.toISOString().slice(0, 10)

    const { data } = await supabase
        .from('cultos')
        .select('id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios')
        .gte('fecha', desdeStr)
        .lt('fecha', fechaInicio)

    const carga: CargaHistorica = { total: {}, porRol: {} }
    const add = (userId: string | null, rol: PulpitoRol) => {
        if (!userId) return
        carga.total[userId] = (carga.total[userId] ?? 0) + 1
        carga.porRol[userId] = carga.porRol[userId] ?? {}
        carga.porRol[userId][rol] = (carga.porRol[userId][rol] ?? 0) + 1
    }
    for (const row of data ?? []) {
        add(row.id_usuario_intro, 'introduccion')
        add(row.id_usuario_finalizacion, 'finalizacion')
        add(row.id_usuario_ensenanza, 'ensenanza')
        add(row.id_usuario_testimonios, 'testimonios')
    }
    return carga
}

// ─── Generación ───────────────────────────────────────────────────────────────

export interface GenerarPulpitoResult {
    error?: string
    /** Roles que quedaron sin candidato disponible (se dejan vacíos). */
    problemas?: ProblemaAsignacion[]
    /** Nº de cultos actualizados. */
    actualizados?: number
}

/**
 * Genera y guarda las asignaciones de púlpito para todos los cultos del rango.
 * Escribe directamente en cultos.id_usuario_* — el dashboard, el detalle del
 * culto y «Mis asignaciones» lo reflejan sin más.
 */
export async function generarPulpito(
    fechaInicio: string,
    fechaFin: string,
    modo: ModoGeneracion,
): Promise<GenerarPulpitoResult> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const dataRes = await getPulpitoData(fechaInicio, fechaFin)
    if (dataRes.error || !dataRes.data) return { error: dataRes.error ?? 'Error' }

    const { cultos, hermanos } = dataRes.data
    if (hermanos.length === 0) return { error: 'SIN_HERMANOS' }

    const cultosConRoles = cultos.filter(c => c.roles.length > 0)
    if (cultosConRoles.length === 0) return { error: 'SIN_CULTOS' }

    const historial = await fetchCargaHistorica(supabase, fechaInicio)

    const entrada: CultoParaAsignar[] = cultosConRoles.map(c => ({
        id: c.id,
        fecha: c.fecha,
        horaInicio: c.hora_inicio,
        roles: c.roles,
        asignacionesActuales: Object.fromEntries(
            Object.entries(c.asignaciones).map(([rol, a]) => [rol, a?.id ?? null]),
        ),
    }))
    const hermanosEngine: HermanoPulpito[] = hermanos

    const { asignaciones, problemas } = generarAsignacionesPulpito(
        entrada,
        hermanosEngine,
        historial,
        modo,
    )

    // Agrupar por culto → un update por culto
    const porCulto = new Map<string, Record<string, string | null>>()
    for (const a of asignaciones) {
        const fields = porCulto.get(a.cultoId) ?? {}
        fields[ROL_FIELD[a.rol]] = a.hermanoId
        porCulto.set(a.cultoId, fields)
    }

    for (const [cultoId, fields] of porCulto) {
        const { error } = await supabase.from('cultos').update(fields).eq('id', cultoId)
        if (error) return { error: error.message }
    }

    revalidatePath('/dashboard/ofrenda')
    revalidatePath('/dashboard')
    return { problemas, actualizados: porCulto.size }
}

/**
 * Cambia manualmente la asignación de un rol en un culto desde la tabla del plan.
 */
export async function updateAsignacionPulpito(
    cultoId: string,
    rol: PulpitoRol,
    userId: string | null,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('cultos')
        .update({ [ROL_FIELD[rol]]: userId })
        .eq('id', cultoId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return {}
}

/**
 * Actualiza la disponibilidad (patrón semanal) de un hermano del púlpito.
 * Solo ADMIN. Conserva las excepciones por fecha ya existentes.
 */
export async function updateHermanoAvailability(
    profileId: string,
    template: PulpitoAvailability['template'],
): Promise<{ error?: string }> {
    const { error: authError } = await requireAdmin()
    if (authError) return { error: authError }

    // Con service-role para saltar RLS (editar el perfil de OTRO hermano).
    const admin = getSupabaseAdmin()

    const { data: current } = await admin
        .from('profiles')
        .select('availability')
        .eq('id', profileId)
        .single()

    const prev = (current?.availability as PulpitoAvailability | null) ?? {}
    const nextAvailability: PulpitoAvailability = { ...prev, template }

    const { error } = await admin
        .from('profiles')
        .update({ availability: nextAvailability })
        .eq('id', profileId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}
