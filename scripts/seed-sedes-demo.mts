/**
 * Seed de sedes demo (Barcelona, Terrassa, Badalona) con datos completos de
 * julio 2026: horarios, usuarios de púlpito, miembros de labor general,
 * personas del plano, cultos con asignaciones y lecturas, y plan de labores
 * generado con el motor REAL (ofrendaEngine) para que sea idéntico al de la app.
 *
 * Usa el service-role de .env.local (solo local, patrón de e2e/sedes.helper.ts).
 * Idempotente: re-ejecutar limpia y regenera los datos de julio de estas sedes.
 *
 * Uso: node scripts/seed-sedes-demo.mts
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { generarPlan, type OfrendaMiembro } from '../src/lib/utils/ofrendaEngine.ts'

// ─── Config ───────────────────────────────────────────────────────────────────

const ANIO = 2026
const MES = 7 // julio
const HOY = '2026-07-14'
const DEMO_PASSWORD = 'Demo.Idmji.2026!'

// Tipos de culto reales en BD
const TIPO_ESTUDIO = 4
const TIPO_ALABANZA = 5
const TIPO_ENSENANZA = 6

interface SedeSeed {
    nombre: string
    slug: string
    ciudad: string
    direccion: string
    email_dominio: string
    lat: number
    lng: number
    /** [day_of_week, 'HH:MM', tipo_culto_id, affected_by_laborable_festivo] */
    horarios: Array<[number, string, number, boolean]>
    pulpito: Array<{ nombre: string; apellidos: string }>
    laborG1: string[]
    laborG2: string[]
    laborG3: string[]
    plano: Array<{ nombre: string; capacidad: 'ambos' | 'apoyo'; genero: 'M' | 'F' }>
}

const HORARIO_BASE: Array<[number, string, number, boolean]> = [
    [1, '19:00', TIPO_ESTUDIO, true],
    [2, '19:00', TIPO_ALABANZA, true],
    [3, '19:00', TIPO_ALABANZA, true],
    [4, '19:00', TIPO_ENSENANZA, true],
    [5, '19:00', TIPO_ALABANZA, true],
    [6, '18:00', TIPO_ESTUDIO, false],
]

const SEDES: SedeSeed[] = [
    {
        nombre: 'Barcelona',
        slug: 'barcelona',
        ciudad: 'Barcelona',
        direccion: 'Carrer de la Marina, 154',
        email_dominio: '@idmjibarcelona.org',
        lat: 41.3874,
        lng: 2.1686,
        horarios: [
            ...HORARIO_BASE,
            [0, '08:00', TIPO_ENSENANZA, false],
            [0, '11:00', TIPO_ENSENANZA, false],
            [0, '17:00', TIPO_ENSENANZA, false],
        ],
        pulpito: [
            { nombre: 'Marc', apellidos: 'Vila' },
            { nombre: 'Jordi', apellidos: 'Puig' },
            { nombre: 'David', apellidos: 'Serra' },
            { nombre: 'Pau', apellidos: 'Roca' },
            { nombre: 'Joan', apellidos: 'Ferrer' },
            { nombre: 'Oriol', apellidos: 'Camps' },
            { nombre: 'Xavier', apellidos: 'Bosch' },
            { nombre: 'Genis', apellidos: 'Soler' },
        ],
        laborG1: ['Marc Vila', 'Jordi Puig', 'David Serra', 'Pau Roca', 'Joan Ferrer', 'Oriol Camps', 'Xavier Bosch'],
        laborG2: ['Genis Soler', 'Arnau Mas', 'Roger Pujol', 'Biel Costa', 'Nil Ribas'],
        laborG3: ['Ester Vila', 'Laia Puig', 'Nuria Serra', 'Marta Roca'],
        plano: [
            { nombre: 'Marc Vila', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Jordi Puig', capacidad: 'ambos', genero: 'M' },
            { nombre: 'David Serra', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Pau Roca', capacidad: 'apoyo', genero: 'M' },
            { nombre: 'Joan Ferrer', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Ester Vila', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Laia Puig', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Nuria Serra', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Marta Roca', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Anna Camps', capacidad: 'apoyo', genero: 'F' },
        ],
    },
    {
        nombre: 'Terrassa',
        slug: 'terrassa',
        ciudad: 'Terrassa',
        direccion: 'Carrer de Sant Pau, 22',
        email_dominio: '@idmjiterrassa.org',
        lat: 41.561,
        lng: 2.0089,
        horarios: [...HORARIO_BASE, [0, '10:00', TIPO_ENSENANZA, false]],
        pulpito: [
            { nombre: 'Miquel', apellidos: 'Font' },
            { nombre: 'Albert', apellidos: 'Riera' },
            { nombre: 'Sergi', apellidos: 'Casas' },
            { nombre: 'Ramon', apellidos: 'Pla' },
            { nombre: 'Enric', apellidos: 'Vidal' },
            { nombre: 'Narcis', apellidos: 'Costa' },
            { nombre: 'Aleix', apellidos: 'Mas' },
            { nombre: 'Pol', apellidos: 'Grau' },
        ],
        laborG1: ['Miquel Font', 'Albert Riera', 'Sergi Casas', 'Ramon Pla', 'Enric Vidal', 'Narcis Costa', 'Aleix Mas'],
        laborG2: ['Pol Grau', 'Guim Padro', 'Isaac Julia', 'Bru Sunyer', 'Lluc Morera'],
        laborG3: ['Rosa Font', 'Clara Riera', 'Julia Casas', 'Aina Pla'],
        plano: [
            { nombre: 'Miquel Font', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Albert Riera', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Sergi Casas', capacidad: 'apoyo', genero: 'M' },
            { nombre: 'Ramon Pla', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Enric Vidal', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Rosa Font', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Clara Riera', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Julia Casas', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Aina Pla', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Mireia Vidal', capacidad: 'apoyo', genero: 'F' },
        ],
    },
    {
        nombre: 'Badalona',
        slug: 'badalona',
        ciudad: 'Badalona',
        direccion: 'Avinguda de Marti Pujol, 86',
        email_dominio: '@idmjibadalona.org',
        lat: 41.45,
        lng: 2.2474,
        horarios: [...HORARIO_BASE, [0, '10:00', TIPO_ENSENANZA, false]],
        pulpito: [
            { nombre: 'Victor', apellidos: 'Sala' },
            { nombre: 'Guillem', apellidos: 'Torres' },
            { nombre: 'Dani', apellidos: 'Prat' },
            { nombre: 'Ivan', apellidos: 'Romero' },
            { nombre: 'Adria', apellidos: 'Soto' },
            { nombre: 'Marcel', apellidos: 'Rius' },
            { nombre: 'Bernat', apellidos: 'Coll' },
            { nombre: 'Quim', apellidos: 'Pons' },
        ],
        laborG1: ['Victor Sala', 'Guillem Torres', 'Dani Prat', 'Ivan Romero', 'Adria Soto', 'Marcel Rius', 'Bernat Coll'],
        laborG2: ['Quim Pons', 'Eloi Bru', 'Jan Salvat', 'Teo Miret', 'Gil Rovira'],
        laborG3: ['Carme Sala', 'Ona Torres', 'Ivet Prat', 'Berta Romero'],
        plano: [
            { nombre: 'Victor Sala', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Guillem Torres', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Dani Prat', capacidad: 'apoyo', genero: 'M' },
            { nombre: 'Ivan Romero', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Adria Soto', capacidad: 'ambos', genero: 'M' },
            { nombre: 'Carme Sala', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Ona Torres', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Ivet Prat', capacidad: 'apoyo', genero: 'F' },
            { nombre: 'Berta Romero', capacidad: 'ambos', genero: 'F' },
            { nombre: 'Neus Soto', capacidad: 'apoyo', genero: 'F' },
        ],
    },
]

/** Citas bíblicas rotativas para las lecturas de julio. */
const LECTURAS: Array<[string, number, number, number, number]> = [
    ['Salmos', 133, 1, 133, 3],
    ['Salmos', 23, 1, 23, 6],
    ['Proverbios', 3, 5, 3, 6],
    ['Juan', 14, 1, 14, 6],
    ['Romanos', 12, 1, 12, 2],
    ['1 Corintios', 13, 1, 13, 8],
    ['Filipenses', 4, 4, 4, 9],
    ['Santiago', 1, 2, 1, 8],
    ['Isaías', 41, 10, 41, 13],
    ['Mateo', 5, 1, 5, 12],
    ['Efesios', 6, 10, 6, 18],
    ['Hebreos', 11, 1, 11, 6],
    ['Colosenses', 3, 12, 3, 17],
    ['1 Pedro', 5, 6, 5, 11],
]

// ─── Infra ────────────────────────────────────────────────────────────────────

function loadLocalEnv(): Record<string, string> {
    const envPath = path.join(process.cwd(), '.env.local')
    const out: Record<string, string> = {}
    for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    return out
}

const env = loadLocalEnv()
const admin: SupabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function fail(step: string, error: unknown): never {
    console.error(`✗ ${step}:`, error)
    process.exit(1)
}

function normalizarNombre(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function emailFor(nombre: string, dominio: string): string {
    return `${normalizarNombre(nombre).replace(/ /g, '.')}${dominio}`
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function upsertSede(seed: SedeSeed): Promise<string> {
    const { data, error } = await admin
        .from('sedes')
        .upsert(
            {
                nombre: seed.nombre,
                slug: seed.slug,
                ciudad: seed.ciudad,
                direccion: seed.direccion,
                email_dominio: seed.email_dominio,
                lat: seed.lat,
                lng: seed.lng,
                activo: true,
            },
            { onConflict: 'slug' },
        )
        .select('id')
        .single()
    if (error || !data) fail(`sede ${seed.slug}`, error)
    return data.id
}

async function upsertHorarios(sedeId: string, seed: SedeSeed): Promise<void> {
    const rows = seed.horarios.map(([dow, hora, tipo, festivo]) => ({
        sede_id: sedeId,
        day_of_week: dow,
        default_time: hora,
        tipo_culto_id: tipo,
        affected_by_laborable_festivo: festivo,
    }))
    const { error } = await admin
        .from('culto_schedules')
        .upsert(rows, { onConflict: 'sede_id,day_of_week,default_time' })
    if (error) fail(`horarios ${seed.slug}`, error)
}

async function ensurePulpitoUsers(sedeId: string, seed: SedeSeed): Promise<string[]> {
    const emails = seed.pulpito.map(p => emailFor(`${p.nombre} ${p.apellidos}`, seed.email_dominio))

    const { data: existing } = await admin
        .from('profiles')
        .select('id, email')
        .in('email', emails)
    const byEmail = new Map((existing ?? []).map(p => [p.email as string, p.id as string]))

    const ids: string[] = []
    for (let i = 0; i < seed.pulpito.length; i++) {
        const p = seed.pulpito[i]
        const email = emails[i]
        let id = byEmail.get(email)
        if (!id) {
            const { data: created, error } = await admin.auth.admin.createUser({
                email,
                password: DEMO_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    nombre: p.nombre,
                    apellidos: p.apellidos,
                    full_name: `${p.nombre} ${p.apellidos}`,
                    display_name: `${p.nombre} ${p.apellidos}`,
                },
            })
            if (error || !created.user) fail(`usuario ${email}`, error)
            id = created.user.id
        }
        const { error: profileError } = await admin.from('profiles').upsert(
            {
                id,
                email,
                nombre: p.nombre,
                apellidos: p.apellidos,
                rol: i === 0 ? 'EDITOR' : 'MIEMBRO',
                pulpito: true,
                sede_id: sedeId,
            },
            { onConflict: 'id' },
        )
        if (profileError) fail(`perfil ${email}`, profileError)
        ids.push(id)
    }
    return ids
}

async function seedMiembrosLabor(sedeId: string, seed: SedeSeed): Promise<void> {
    await admin.from('ofrenda_miembros').delete().eq('sede_id', sedeId)
    const rows = [
        ...seed.laborG1.map((nombre, i) => ({ nombre, grupo: 1, orden: i + 1 })),
        ...seed.laborG2.map((nombre, i) => ({ nombre, grupo: 2, orden: i + 1 })),
        ...seed.laborG3.map((nombre, i) => ({ nombre, grupo: 3, orden: i + 1 })),
    ].map(r => ({
        ...r,
        activo: true,
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        sede_id: sedeId,
    }))
    const { error } = await admin.from('ofrenda_miembros').insert(rows)
    if (error) fail(`miembros labor ${seed.slug}`, error)
}

async function seedPlanoPersonas(sedeId: string, seed: SedeSeed): Promise<void> {
    await admin.from('ofrenda_plano_personas').delete().eq('sede_id', sedeId)
    const rows = seed.plano.map((p, i) => ({
        nombre: p.nombre,
        nombre_normalizado: normalizarNombre(p.nombre),
        activo: true,
        capacidad: p.capacidad,
        genero: p.genero === 'M' ? 'hombre' : 'mujer',
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        prioridad_ofrendario: i < 2,
        sede_id: sedeId,
    }))
    const { error } = await admin.from('ofrenda_plano_personas').insert(rows)
    if (error) fail(`plano personas ${seed.slug}`, error)
}

async function seedCultosJulio(sedeId: string, seed: SedeSeed, pulpitoIds: string[]): Promise<number> {
    const desde = `${ANIO}-07-01`
    const hasta = `${ANIO}-07-31`
    await admin.from('cultos').delete().eq('sede_id', sedeId).gte('fecha', desde).lte('fecha', hasta)

    const tiposById = new Map([
        [TIPO_ESTUDIO, { ens: false, fin: true }],
        [TIPO_ALABANZA, { ens: false, fin: true }],
        [TIPO_ENSENANZA, { ens: true, fin: false }],
    ])

    const cultos: Record<string, unknown>[] = []
    let idx = 0
    for (let dia = 1; dia <= 31; dia++) {
        const fecha = new Date(ANIO, MES - 1, dia)
        const dow = fecha.getDay()
        const fechaStr = `${ANIO}-07-${String(dia).padStart(2, '0')}`
        for (const [hDow, hora, tipoId] of seed.horarios) {
            if (hDow !== dow) continue
            const flags = tiposById.get(tipoId)!
            const n = pulpitoIds.length
            const intro = pulpitoIds[idx % n]
            const fin = flags.fin ? pulpitoIds[(idx + 2) % n] : null
            const ens = flags.ens ? pulpitoIds[(idx + 4) % n] : null
            const test = flags.ens ? pulpitoIds[(idx + 6) % n] : null
            cultos.push({
                fecha: fechaStr,
                hora_inicio: hora,
                tipo_culto_id: tipoId,
                estado: fechaStr < HOY ? 'realizado' : 'planeado',
                es_laborable_festivo: false,
                id_usuario_intro: intro,
                id_usuario_finalizacion: fin,
                id_usuario_ensenanza: ens,
                id_usuario_testimonios: test,
                sede_id: sedeId,
            })
            idx++
        }
    }

    const { data: inserted, error } = await admin
        .from('cultos')
        .insert(cultos)
        .select('id, fecha, hora_inicio, tipo_culto_id, id_usuario_intro, id_usuario_finalizacion')
    if (error || !inserted) fail(`cultos ${seed.slug}`, error)

    // Lecturas: introducción para todos; finalización solo si el tipo la tiene.
    const lecturas: Record<string, unknown>[] = []
    inserted.forEach((c, i) => {
        const [libro, ci, vi, cf, vf] = LECTURAS[i % LECTURAS.length]
        lecturas.push({
            culto_id: c.id,
            tipo_lectura: 'introduccion',
            libro,
            capitulo_inicio: ci,
            versiculo_inicio: vi,
            capitulo_fin: cf,
            versiculo_fin: vf,
            id_usuario_lector: c.id_usuario_intro,
            es_repetida: false,
        })
        if (c.id_usuario_finalizacion) {
            const [libro2, ci2, vi2, cf2, vf2] = LECTURAS[(i + 5) % LECTURAS.length]
            lecturas.push({
                culto_id: c.id,
                tipo_lectura: 'finalizacion',
                libro: libro2,
                capitulo_inicio: ci2,
                versiculo_inicio: vi2,
                capitulo_fin: cf2,
                versiculo_fin: vf2,
                id_usuario_lector: c.id_usuario_finalizacion,
                es_repetida: false,
            })
        }
    })
    const { error: lecturasError } = await admin.from('lecturas_biblicas').insert(lecturas)
    if (lecturasError) fail(`lecturas ${seed.slug}`, lecturasError)

    return inserted.length
}

async function seedPlanLabores(sedeId: string, seed: SedeSeed, adminId: string | null): Promise<number> {
    await admin.from('ofrenda_planes').delete().eq('sede_id', sedeId).eq('anio', ANIO).eq('mes', MES)

    const { data: miembrosRows, error: miembrosError } = await admin
        .from('ofrenda_miembros')
        .select('*')
        .eq('sede_id', sedeId)
    if (miembrosError || !miembrosRows) fail(`plan labores ${seed.slug}`, miembrosError)

    const miembros: OfrendaMiembro[] = miembrosRows.map(m => ({
        id: m.id,
        nombre: m.nombre,
        grupo: m.grupo,
        orden: m.orden,
        activo: m.activo,
        puede_jueves: m.puede_jueves,
        puede_domingo_manana: m.puede_domingo_manana,
        puede_domingo_tarde: m.puede_domingo_tarde,
        fijoDiaTipo: m.fijo_dia_tipo ?? null,
        fijoRol: m.fijo_rol ?? null,
    }))

    const planCalc = generarPlan(ANIO, MES, 1, miembros)

    const { data: plan, error: planError } = await admin
        .from('ofrenda_planes')
        .insert({
            anio: ANIO,
            mes: MES,
            secuencia_puntero: 1,
            secuencia_puntero_fin: planCalc.punteroFin,
            sacos_jueves: 4,
            sacos_domingo: 8,
            sacos_domingo_tarde: 4,
            secuencia_maximo: 20,
            created_by: adminId,
            sede_id: sedeId,
        })
        .select('id')
        .single()
    if (planError || !plan) fail(`plan ${seed.slug}`, planError)

    const { data: servicios, error: srvError } = await admin
        .from('ofrenda_servicios')
        .insert(
            planCalc.servicios.map(s => ({
                plan_id: plan.id,
                fecha: s.fecha,
                dia_tipo: s.diaTipo,
                semana_iso: s.semanaIso,
                secuencia_desde: s.secuenciaDesde,
                secuencia_hasta: s.secuenciaHasta,
                secuencia_texto: s.secuenciaTexto,
                posicion: s.posicion,
            })),
        )
        .select('id, fecha, dia_tipo')
    if (srvError || !servicios) fail(`servicios ${seed.slug}`, srvError)

    const srvMap = new Map(servicios.map(s => [`${s.fecha}:${s.dia_tipo}`, s.id]))
    const asignaciones = planCalc.asignaciones
        .map(a => ({
            servicio_id: srvMap.get(`${a.servicioFecha}:${a.servicioTipo}`),
            rol: a.rol,
            miembro_id: a.miembroId,
            es_override: false,
        }))
        .filter(a => a.servicio_id)
    const { error: asigError } = await admin.from('ofrenda_asignaciones').insert(asignaciones)
    if (asigError) fail(`asignaciones ${seed.slug}`, asigError)

    return servicios.length
}

async function logSeed(sedeId: string, adminId: string | null, descripcion: string): Promise<void> {
    await admin.from('movimientos').insert({
        id_usuario: adminId,
        tipo: 'admin_sedes',
        descripcion,
        sede_id: sedeId,
    })
}

async function main() {
    console.log('— Seed sedes demo (julio 2026) —')

    const { data: jeffrey } = await admin
        .from('profiles')
        .select('id')
        .eq('email', 'jeffrey@idmjisabadell.org')
        .maybeSingle()
    const adminId = jeffrey?.id ?? null

    // Coordenadas de Sabadell (sede principal) para el mapa
    const { error: sabError } = await admin
        .from('sedes')
        .update({ lat: 41.5433, lng: 2.1094 })
        .eq('slug', 'sabadell')
        .is('lat', null)
    if (sabError) fail('coordenadas sabadell', sabError)

    for (const seed of SEDES) {
        const sedeId = await upsertSede(seed)
        await upsertHorarios(sedeId, seed)
        const pulpitoIds = await ensurePulpitoUsers(sedeId, seed)
        await seedMiembrosLabor(sedeId, seed)
        await seedPlanoPersonas(sedeId, seed)
        const nCultos = await seedCultosJulio(sedeId, seed, pulpitoIds)
        const nServicios = await seedPlanLabores(sedeId, seed, adminId)
        await logSeed(sedeId, adminId, `Sede «${seed.nombre}» creada con datos de julio ${ANIO} (seed demo)`)
        console.log(
            `✓ ${seed.nombre}: ${seed.horarios.length} horarios, ${pulpitoIds.length} usuarios púlpito, ` +
            `${seed.laborG1.length + seed.laborG2.length + seed.laborG3.length} miembros labor, ` +
            `${seed.plano.length} personas plano, ${nCultos} cultos julio, ${nServicios} servicios labores`,
        )
    }
    console.log('— Seed completado —')
}

main().catch(e => fail('seed', e))
