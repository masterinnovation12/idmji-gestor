
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Nombres y Apellidos para generar usuarios aleatorios
const NOMBRES = ['Juan', 'Pedro', 'Maria', 'Ana', 'Luis', 'Carlos', 'Jose', 'Marta', 'Lucia', 'Sofia', 'Miguel', 'David', 'Elena', 'Carmen', 'Pablo', 'Jorge', 'Raul', 'Daniel', 'Andres', 'Isabel']
const APELLIDOS = ['Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Gonzalez', 'Rodriguez', 'Fernandez', 'Perez', 'Gomez', 'Ruiz', 'Diaz', 'Hernandez', 'Alvarez', 'Moreno', 'Munoz', 'Romero', 'Alonso', 'Gutierrez', 'Navarro', 'Torres']

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseServiceKey) {
            return NextResponse.json({
                error: 'SUPABASE_SERVICE_ROLE_KEY is missing. Cannot seed users securely.'
            }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        const seedResults = {
            usersCreated: 0,
            cultosCreated: 0,
            assignmentsCreated: 0
        }

        // 1. Crear Usuarios (Hermanos con pulpito=true y Miembros)
        console.log('Seeding users...')
        for (let i = 0; i < 20; i++) {
            const nombre = NOMBRES[Math.floor(Math.random() * NOMBRES.length)]
            const apellido = APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)]
            const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${Math.floor(Math.random() * 1000)}@test.com`
            const password = 'password123'
            const isPulpito = Math.random() > 0.3 // 70% probabilidad de ser de púlpito
            const rol = isPulpito ? (Math.random() > 0.8 ? 'ADMIN' : 'EDITOR') : 'MIEMBRO'

            // Crear usuario Auth
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    nombre,
                    apellidos: apellido,
                    full_name: `${nombre} ${apellido}`,
                }
            })

            if (authError) {
                console.warn(`Error creating user ${email}:`, authError.message)
                continue
            }

            if (authUser.user) {
                // Actualizar perfil (Trigger debería haberlo creado, pero actualizamos rol y pulpito)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        nombre,
                        apellidos: apellido,
                        rol,
                        pulpito: isPulpito,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
                    })
                    .eq('id', authUser.user.id)

                if (!profileError) seedResults.usersCreated++
            }
        }

        // 2. Generar Cultos (3 meses: mes pasado, actual, siguiente)
        console.log('Seeding cultos...')
        const today = new Date()
        const monthsCheck = [-1, 0, 1] // Mes anterior, actual, siguiente

        // Obtener IDs de usuarios de púlpito para asignar
        const { data: pulpitoUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('pulpito', true)

        const pulpitoIds = pulpitoUsers?.map(u => u.id) || []

        if (pulpitoIds.length > 0) {
            for (const monthOffset of monthsCheck) {
                const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
                const month = targetDate.getMonth()
                const year = targetDate.getFullYear()

                // Generar días del mes
                const daysInMonth = new Date(year, month + 1, 0).getDate()

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day)
                    const dayOfWeek = currentDate.getDay() // 0=Dom, 1=Lun...

                    let tipoCultoId: number | null = null

                    // Lunes (1) y Sábado (6) -> Estudio (ID simulado, depende de tu DB real)
                    // Martes (2), Miércoles (3), Viernes (5) -> Alabanza
                    // Jueves (4), Domingo (0) -> Enseñanza

                    // NOTA: Esto asume que los IDs son fijos o necesita buscarlos. 
                    // Para simplificar, asumiremos IDs estándar o buscaremos por nombre si es posible, 
                    // pero insertaremos buscando por nombre primero.

                    let tipoNombre = ''
                    if (dayOfWeek === 1 || dayOfWeek === 6) tipoNombre = 'Estudio Bíblico'
                    else if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 5) tipoNombre = 'Alabanza'
                    else if (dayOfWeek === 4 || dayOfWeek === 0) tipoNombre = 'Enseñanza'
                    else continue // No hay culto

                    // Buscar ID del tipo
                    const { data: tipoData } = await supabase
                        .from('culto_types')
                        .select('id')
                        .eq('name', tipoNombre)
                        .single()

                    if (!tipoData) continue
                    tipoCultoId = tipoData.id

                    // Crear Culto
                    const fechaStr = currentDate.toISOString().split('T')[0]
                    const hora = dayOfWeek === 0 ? '10:00' : '19:00' // Domingo 10am, resto 19pm

                    // Upsert culto (evitar duplicados si ya existen)
                    const { data: culto, error: cultoError } = await supabase
                        .from('cultos')
                        .upsert({
                            fecha: fechaStr,
                            hora,
                            tipo_culto_id: tipoCultoId,
                            actividades: [] // Inicializar vacío
                        }, { onConflict: 'fecha, hora' })
                        .select()
                        .single()

                    if (culto && !cultoError) {
                        seedResults.cultosCreated++

                        // 3. Asignar Roles Aleatorios (si es fecha pasada o muy cercana)
                        // Asignar aleatoriamente a uno de los ids disponibles
                        const randomUser = () => pulpitoIds[Math.floor(Math.random() * pulpitoIds.length)]

                        // Determinamos columnas a actualizar según tipo
                        const updates: Record<string, string> = {}

                        // Intro y Final (común en Estudio y Alabanza)
                        if (tipoNombre === 'Estudio Bíblico' || tipoNombre === 'Alabanza') {
                            updates.usuario_intro_id = randomUser()
                            updates.usuario_final_id = randomUser()
                        }

                        // Enseñanza (Intro, Enseñanza, Testimonios)
                        if (tipoNombre === 'Enseñanza') {
                            updates.usuario_intro_id = randomUser()
                            updates.usuario_enseñanza_id = randomUser()
                            updates.usuario_testimonios_id = randomUser()
                        }

                        if (Object.keys(updates).length > 0) {
                            await supabase
                                .from('cultos')
                                .update(updates)
                                .eq('id', culto.id)

                            seedResults.assignmentsCreated++
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, results: seedResults })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during seeding'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
