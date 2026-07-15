'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { logMovimiento } from '@/lib/audit/logMovimiento'
import type { ActionResponse, Sede } from '@/types/database'

/**
 * Panel de control multi-sede (solo ADMIN): KPIs, participaciones de púlpito,
 * detalle de cultos y resumen por sede para un mes concreto. Usa el cliente
 * service-role porque el ADMIN consulta datos de TODAS las sedes a la vez;
 * el acceso queda protegido por requireAdmin().
 */

export interface ControlKpis {
    cultos: number
    cultosRealizados: number
    cultosPlaneados: number
    participaciones: number
    hermanosActivos: number
    lecturas: number
    usuarios: number
    miembrosLabor: number
    personasPlano: number
    serviciosLabores: number
    /** Suma de asistentes registrados en el mes (0 si no hay registros). */
    asistenciaTotal: number
    /** Media de asistentes de los cultos con registro (0 si no hay). */
    asistenciaMedia: number
}

export interface HermanoParticipacion {
    userId: string
    nombre: string
    sede: string
    intro: number
    ensenanza: number
    testimonios: number
    finalizacion: number
    total: number
}

export interface CultoDetalle {
    id: string
    fecha: string
    hora: string
    tipoNombre: string
    tipoColor: string
    estado: string
    sede: string
    intro: string | null
    ensenanza: string | null
    testimonios: string | null
    finalizacion: string | null
    lecturas: string[]
    asistencia: number | null
}

export interface SedeResumen {
    sedeId: string
    nombre: string
    slug: string
    activo: boolean
    cultos: number
    participaciones: number
    lecturas: number
    usuarios: number
}

export interface TipoDistribucion {
    nombre: string
    color: string
    count: number
}

export interface ControlData {
    kpis: ControlKpis
    hermanos: HermanoParticipacion[]
    cultos: CultoDetalle[]
    sedesResumen: SedeResumen[]
    tipos: TipoDistribucion[]
    generadoEn: string
}

interface CultoRaw {
    id: string
    fecha: string
    hora_inicio: string
    estado: string
    sede_id: string
    asistencia: number | null
    id_usuario_intro: string | null
    id_usuario_finalizacion: string | null
    id_usuario_ensenanza: string | null
    id_usuario_testimonios: string | null
    tipo_culto: { nombre: string; color: string } | null
}

function rangoMes(year: number, month: number): { desde: string; hasta: string } {
    const mm = String(month).padStart(2, '0')
    const ultimoDia = new Date(year, month, 0).getDate()
    return { desde: `${year}-${mm}-01`, hasta: `${year}-${mm}-${String(ultimoDia).padStart(2, '0')}` }
}

function formatCita(r: {
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number | null
    versiculo_fin: number | null
}): string {
    const cf = r.capitulo_fin ?? r.capitulo_inicio
    const vf = r.versiculo_fin ?? r.versiculo_inicio
    if (r.capitulo_inicio === cf && r.versiculo_inicio === vf) return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}`
    if (r.capitulo_inicio === cf) return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}-${vf}`
    return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}-${cf}:${vf}`
}

export async function getControlData(
    sedeId: string | null,
    year: number,
    month: number,
): Promise<ActionResponse<ControlData>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()
        const { desde, hasta } = rangoMes(year, month)

        const { data: sedes, error: sedesError } = await admin
            .from('sedes')
            .select('id, nombre, slug, activo, es_principal')
            .order('es_principal', { ascending: false })
            .order('nombre')
        if (sedesError) throw sedesError
        const sedesFiltradas = (sedes ?? []).filter(s => !sedeId || s.id === sedeId)
        const sedeIds = sedesFiltradas.map(s => s.id)
        const sedeNombre = new Map(sedesFiltradas.map(s => [s.id, s.nombre as string]))

        // Cultos del mes (con tipo)
        const { data: cultosRaw, error: cultosError } = await admin
            .from('cultos')
            .select('id, fecha, hora_inicio, estado, sede_id, asistencia, id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios, tipo_culto:culto_types(nombre, color)')
            .in('sede_id', sedeIds)
            .gte('fecha', desde)
            .lte('fecha', hasta)
            .order('fecha')
            .order('hora_inicio')
        if (cultosError) throw cultosError
        const cultos = (cultosRaw ?? []) as unknown as CultoRaw[]

        // Lecturas de esos cultos
        const cultoIds = cultos.map(c => c.id)
        const lecturasPorCulto = new Map<string, string[]>()
        let totalLecturas = 0
        if (cultoIds.length > 0) {
            const { data: lecturas, error: lecturasError } = await admin
                .from('lecturas_biblicas')
                .select('culto_id, libro, capitulo_inicio, versiculo_inicio, capitulo_fin, versiculo_fin, tipo_lectura')
                .in('culto_id', cultoIds)
            if (lecturasError) throw lecturasError
            for (const l of lecturas ?? []) {
                const list = lecturasPorCulto.get(l.culto_id) ?? []
                list.push(formatCita(l))
                lecturasPorCulto.set(l.culto_id, list)
                totalLecturas++
            }
        }

        // Perfiles de púlpito de las sedes seleccionadas
        const { data: perfiles, error: perfilesError } = await admin
            .from('profiles')
            .select('id, nombre, apellidos, pulpito, sede_id')
            .in('sede_id', sedeIds)
        if (perfilesError) throw perfilesError
        const nombrePorId = new Map(
            (perfiles ?? []).map(p => [p.id as string, `${p.nombre ?? ''} ${p.apellidos ?? ''}`.trim()]),
        )

        // Participaciones por hermano
        const hermanosMap = new Map<string, HermanoParticipacion>()
        for (const p of perfiles ?? []) {
            if (!p.pulpito) continue
            hermanosMap.set(p.id as string, {
                userId: p.id as string,
                nombre: `${p.nombre ?? ''} ${p.apellidos ?? ''}`.trim(),
                sede: sedeNombre.get(p.sede_id as string) ?? '',
                intro: 0,
                ensenanza: 0,
                testimonios: 0,
                finalizacion: 0,
                total: 0,
            })
        }
        const suma = (userId: string | null, campo: 'intro' | 'ensenanza' | 'testimonios' | 'finalizacion') => {
            if (!userId) return
            const h = hermanosMap.get(userId)
            if (!h) return
            h[campo]++
            h.total++
        }

        let participaciones = 0
        const activos = new Set<string>()
        const tiposMap = new Map<string, TipoDistribucion>()
        const porSede = new Map<string, { cultos: number; participaciones: number; lecturas: number }>()

        const cultosDetalle: CultoDetalle[] = cultos.map(c => {
            suma(c.id_usuario_intro, 'intro')
            suma(c.id_usuario_ensenanza, 'ensenanza')
            suma(c.id_usuario_testimonios, 'testimonios')
            suma(c.id_usuario_finalizacion, 'finalizacion')
            for (const uid of [c.id_usuario_intro, c.id_usuario_ensenanza, c.id_usuario_testimonios, c.id_usuario_finalizacion]) {
                if (uid) {
                    participaciones++
                    activos.add(uid)
                }
            }

            const tipoNombre = c.tipo_culto?.nombre ?? '—'
            const tipo = tiposMap.get(tipoNombre) ?? { nombre: tipoNombre, color: c.tipo_culto?.color ?? '#94a3b8', count: 0 }
            tipo.count++
            tiposMap.set(tipoNombre, tipo)

            const agg = porSede.get(c.sede_id) ?? { cultos: 0, participaciones: 0, lecturas: 0 }
            agg.cultos++
            agg.participaciones += [c.id_usuario_intro, c.id_usuario_ensenanza, c.id_usuario_testimonios, c.id_usuario_finalizacion].filter(Boolean).length
            agg.lecturas += (lecturasPorCulto.get(c.id) ?? []).length
            porSede.set(c.sede_id, agg)

            return {
                id: c.id,
                fecha: c.fecha,
                hora: c.hora_inicio.slice(0, 5),
                tipoNombre,
                tipoColor: c.tipo_culto?.color ?? '#94a3b8',
                estado: c.estado,
                sede: sedeNombre.get(c.sede_id) ?? '',
                intro: c.id_usuario_intro ? nombrePorId.get(c.id_usuario_intro) ?? null : null,
                ensenanza: c.id_usuario_ensenanza ? nombrePorId.get(c.id_usuario_ensenanza) ?? null : null,
                testimonios: c.id_usuario_testimonios ? nombrePorId.get(c.id_usuario_testimonios) ?? null : null,
                finalizacion: c.id_usuario_finalizacion ? nombrePorId.get(c.id_usuario_finalizacion) ?? null : null,
                lecturas: lecturasPorCulto.get(c.id) ?? [],
                asistencia: c.asistencia,
            }
        })

        const conAsistencia = cultos.filter(c => c.asistencia != null)
        const asistenciaTotal = conAsistencia.reduce((n, c) => n + (c.asistencia ?? 0), 0)

        // Labores y personas
        const [miembros, personas, planes, usuariosCount] = await Promise.all([
            admin.from('ofrenda_miembros').select('id', { count: 'exact', head: true }).in('sede_id', sedeIds).eq('activo', true),
            admin.from('ofrenda_plano_personas').select('id', { count: 'exact', head: true }).in('sede_id', sedeIds).eq('activo', true),
            admin.from('ofrenda_planes').select('id, sede_id').in('sede_id', sedeIds).eq('anio', year).eq('mes', month),
            admin.from('profiles').select('id', { count: 'exact', head: true }).in('sede_id', sedeIds),
        ])
        let serviciosLabores = 0
        const planIds = (planes.data ?? []).map(p => p.id)
        if (planIds.length > 0) {
            const { count } = await admin
                .from('ofrenda_servicios')
                .select('id', { count: 'exact', head: true })
                .in('plan_id', planIds)
            serviciosLabores = count ?? 0
        }

        // Resumen por sede (para vista "todas")
        const usuariosPorSede = new Map<string, number>()
        for (const p of perfiles ?? []) {
            usuariosPorSede.set(p.sede_id as string, (usuariosPorSede.get(p.sede_id as string) ?? 0) + 1)
        }
        const sedesResumen: SedeResumen[] = sedesFiltradas.map(s => ({
            sedeId: s.id,
            nombre: s.nombre,
            slug: s.slug,
            activo: s.activo,
            cultos: porSede.get(s.id)?.cultos ?? 0,
            participaciones: porSede.get(s.id)?.participaciones ?? 0,
            lecturas: porSede.get(s.id)?.lecturas ?? 0,
            usuarios: usuariosPorSede.get(s.id) ?? 0,
        }))

        const hermanos = Array.from(hermanosMap.values()).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))

        return {
            success: true,
            data: {
                kpis: {
                    cultos: cultos.length,
                    cultosRealizados: cultos.filter(c => c.estado === 'realizado').length,
                    cultosPlaneados: cultos.filter(c => c.estado === 'planeado').length,
                    participaciones,
                    hermanosActivos: activos.size,
                    lecturas: totalLecturas,
                    usuarios: usuariosCount.count ?? 0,
                    miembrosLabor: miembros.count ?? 0,
                    personasPlano: personas.count ?? 0,
                    serviciosLabores,
                    asistenciaTotal,
                    asistenciaMedia: conAsistencia.length > 0 ? Math.round(asistenciaTotal / conAsistencia.length) : 0,
                },
                hermanos,
                cultos: cultosDetalle,
                sedesResumen,
                tipos: Array.from(tiposMap.values()).sort((a, b) => b.count - a.count),
                generadoEn: new Date().toISOString(),
            },
        }
    } catch (e) {
        console.error('getControlData:', e)
        return { success: false, error: 'Error al cargar el panel de control' }
    }
}

/** Sedes para el selector del panel (solo ADMIN). */
export async function getControlSedes(): Promise<ActionResponse<Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data, error: qError } = await ctx.supabase
        .from('sedes')
        .select('id, nombre, slug, activo')
        .order('es_principal', { ascending: false })
        .order('nombre')
    if (qError) return { success: false, error: qError.message }
    return { success: true, data: data ?? [] }
}

export interface TendenciaMes {
    /** 'YYYY-MM' */
    mes: string
    /** Métricas por nombre de sede. */
    porSede: Record<string, { cultos: number; participaciones: number }>
}

/**
 * Tendencias de los últimos `meses` meses (incluido el actual): cultos y
 * participaciones de púlpito por mes y sede. Solo ADMIN.
 */
export async function getTendencias(
    sedeId: string | null,
    meses = 6,
): Promise<ActionResponse<{ meses: TendenciaMes[]; sedes: string[] }>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()
        const now = new Date()
        const inicio = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1)
        const desdeStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-01`

        const { data: sedes, error: sedesError } = await admin
            .from('sedes')
            .select('id, nombre')
            .order('es_principal', { ascending: false })
            .order('nombre')
        if (sedesError) throw sedesError
        const sedesFiltradas = (sedes ?? []).filter(s => !sedeId || s.id === sedeId)
        const nombrePorSede = new Map(sedesFiltradas.map(s => [s.id as string, s.nombre as string]))

        const { data: cultos, error: cultosError } = await admin
            .from('cultos')
            .select('fecha, sede_id, id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios')
            .in('sede_id', sedesFiltradas.map(s => s.id))
            .gte('fecha', desdeStr)
            .lte('fecha', rangoMes(now.getFullYear(), now.getMonth() + 1).hasta)
        if (cultosError) throw cultosError

        // Esqueleto de meses (para que salgan también los meses sin datos)
        const mesesOut: TendenciaMes[] = []
        const idxPorMes = new Map<string, number>()
        for (let i = meses - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            idxPorMes.set(key, mesesOut.length)
            mesesOut.push({ mes: key, porSede: {} })
        }

        for (const c of cultos ?? []) {
            const key = (c.fecha as string).slice(0, 7)
            const idx = idxPorMes.get(key)
            if (idx === undefined) continue
            const nombre = nombrePorSede.get(c.sede_id as string)
            if (!nombre) continue
            const bucket = mesesOut[idx].porSede[nombre] ?? { cultos: 0, participaciones: 0 }
            bucket.cultos++
            bucket.participaciones += [
                c.id_usuario_intro, c.id_usuario_finalizacion, c.id_usuario_ensenanza, c.id_usuario_testimonios,
            ].filter(Boolean).length
            mesesOut[idx].porSede[nombre] = bucket
        }

        return {
            success: true,
            data: { meses: mesesOut, sedes: sedesFiltradas.map(s => s.nombre as string) },
        }
    } catch (e) {
        console.error('getTendencias:', e)
        return { success: false, error: 'Error al cargar tendencias' }
    }
}

/**
 * Registra la asistencia de un culto (solo ADMIN). `asistencia` null borra el
 * registro. Queda trazado en auditoría con la sede del culto.
 */
export async function updateAsistenciaCulto(
    cultoId: string,
    asistencia: number | null,
): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    if (asistencia != null && (!Number.isInteger(asistencia) || asistencia < 0 || asistencia > 100000)) {
        return { success: false, error: 'Valor inválido' }
    }

    const { data: culto } = await ctx.supabase
        .from('cultos')
        .select('id, fecha, hora_inicio, sede_id')
        .eq('id', cultoId)
        .maybeSingle()
    if (!culto) return { success: false, error: 'Culto no encontrado' }

    const { error: updateError } = await ctx.supabase
        .from('cultos')
        .update({ asistencia })
        .eq('id', cultoId)
    if (updateError) return { success: false, error: updateError.message }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_asistencia',
        `Asistencia del culto ${culto.fecha} ${(culto.hora_inicio as string).slice(0, 5)} → ${asistencia ?? '—'}`,
        culto.sede_id as string,
    )
    return { success: true }
}

export type HealthSeverity = 'warning' | 'info'

export interface HealthAlert {
    key: string
    severity: HealthSeverity
    /** Clave i18n del título del tipo de alerta. */
    titleKey: string
    count: number
    /** Sedes/fechas afectadas (nombres legibles). */
    detalles: string[]
    /** Ruta de admin donde resolverlo. */
    href: string
}

/**
 * Salud de datos (solo ADMIN): detecta huecos operativos accionables para que
 * el administrador sienta control total. Respeta el filtro de sede si se pasa.
 */
export async function getDataHealth(sedeId: string | null): Promise<ActionResponse<HealthAlert[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()
        const hoy = new Date().toISOString().slice(0, 10)

        const { data: sedes, error: sedesError } = await admin
            .from('sedes')
            .select('id, nombre, activo, lat, lng')
            .order('nombre')
        if (sedesError) throw sedesError
        const sedesFiltradas = (sedes ?? []).filter(s => !sedeId || s.id === sedeId)
        const sedeIds = sedesFiltradas.map(s => s.id)
        const activas = sedesFiltradas.filter(s => s.activo)
        const nombrePorSede = new Map(sedesFiltradas.map(s => [s.id, s.nombre as string]))

        // Tipos con enseñanza (para detectar enseñanzas sin enseñante)
        const { data: tiposEns } = await admin.from('culto_types').select('id').eq('tiene_ensenanza', true)
        const tiposEnsIds = (tiposEns ?? []).map(t => t.id)

        // Cultos futuros de las sedes filtradas
        const { data: cultosFuturos, error: cultosError } = await admin
            .from('cultos')
            .select('fecha, hora_inicio, sede_id, tipo_culto_id, id_usuario_intro, id_usuario_ensenanza')
            .in('sede_id', sedeIds)
            .gte('fecha', hoy)
            .eq('estado', 'planeado')
        if (cultosError) throw cultosError

        const formatCulto = (c: { sede_id: string; fecha: string; hora_inicio: string }) =>
            `${nombrePorSede.get(c.sede_id) ?? ''} · ${c.fecha} ${c.hora_inicio.slice(0, 5)}`

        const sinIntro = (cultosFuturos ?? []).filter(c => !c.id_usuario_intro)
        const sinEnsenante = (cultosFuturos ?? []).filter(
            c => tiposEnsIds.includes(c.tipo_culto_id) && !c.id_usuario_ensenanza,
        )

        // Plan de labores del mes actual
        const now = new Date()
        const { data: planes } = await admin
            .from('ofrenda_planes')
            .select('sede_id')
            .in('sede_id', sedeIds)
            .eq('anio', now.getFullYear())
            .eq('mes', now.getMonth() + 1)
        const conPlan = new Set((planes ?? []).map(p => p.sede_id as string))
        const sinPlan = activas.filter(s => !conPlan.has(s.id))

        // Horarios configurados
        const { data: schedules } = await admin.from('culto_schedules').select('sede_id').in('sede_id', sedeIds)
        const conHorario = new Set((schedules ?? []).map(s => s.sede_id as string))
        const sinHorario = activas.filter(s => !conHorario.has(s.id))

        // Coordenadas del mapa
        const sinCoords = sedesFiltradas.filter(s => s.lat == null || s.lng == null)

        const alerts: HealthAlert[] = []
        if (sinIntro.length > 0) {
            alerts.push({
                key: 'cultos-sin-intro',
                severity: 'warning',
                titleKey: 'admin.control.health.sinIntro',
                count: sinIntro.length,
                detalles: sinIntro.slice(0, 8).map(formatCulto),
                href: '/dashboard/cultos',
            })
        }
        if (sinEnsenante.length > 0) {
            alerts.push({
                key: 'ensenanzas-sin-ensenante',
                severity: 'warning',
                titleKey: 'admin.control.health.sinEnsenante',
                count: sinEnsenante.length,
                detalles: sinEnsenante.slice(0, 8).map(formatCulto),
                href: '/dashboard/cultos',
            })
        }
        if (sinPlan.length > 0) {
            alerts.push({
                key: 'sedes-sin-plan',
                severity: 'warning',
                titleKey: 'admin.control.health.sinPlan',
                count: sinPlan.length,
                detalles: sinPlan.map(s => s.nombre as string),
                href: '/dashboard/ofrenda',
            })
        }
        if (sinHorario.length > 0) {
            alerts.push({
                key: 'sedes-sin-horario',
                severity: 'warning',
                titleKey: 'admin.control.health.sinHorario',
                count: sinHorario.length,
                detalles: sinHorario.map(s => s.nombre as string),
                href: '/dashboard/admin/horarios',
            })
        }
        if (sinCoords.length > 0) {
            alerts.push({
                key: 'sedes-sin-coords',
                severity: 'info',
                titleKey: 'admin.control.health.sinCoords',
                count: sinCoords.length,
                detalles: sinCoords.map(s => s.nombre as string),
                href: '/dashboard/admin/sedes',
            })
        }

        return { success: true, data: alerts }
    } catch (e) {
        console.error('getDataHealth:', e)
        return { success: false, error: 'Error al calcular la salud de datos' }
    }
}
