'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ActionResponse } from '@/types/database'
import { revalidatePath } from 'next/cache'

// Función para obtener cliente ADMIN (lazy initialization)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase configuration is missing. Please check environment variables.')
    }
    
    return createAdminClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

export interface UserData {
    id: string
    nombre: string
    apellidos: string
    email: string | null
    rol: string
    pulpito: boolean
    avatar_url: string | null
    created_at: string
}

const VALID_DOMAIN = '@idmjisabadell.org'
const FALLBACK_ROLES = ['ADMIN', 'EDITOR', 'MIEMBRO'] as const

const createSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    nombre: z.string().min(1),
    apellidos: z.string().min(1),
    rol: z.string().min(1),
    pulpito: z.boolean().optional().default(false)
})

const updateSchema = z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
    apellidos: z.string().min(1),
    rol: z.string().min(1),
    pulpito: z.boolean().optional().default(false),
    currentAvatarUrl: z.string().optional()
})

export async function getRoles(): Promise<ActionResponse<string[]>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const { data, error } = await getSupabaseAdmin()
            .from('profiles')
            .select('rol', { count: 'exact', head: false })
            .not('rol', 'is', null)

        if (error) throw error

        const distinct = Array.from(new Set((data || []).map((r: any) => r.rol).filter(Boolean)))
        const roles = distinct.length > 0 ? distinct : [...FALLBACK_ROLES]

        return { success: true, data: roles }
    } catch (error) {
        console.error('Error fetching roles:', error)
        return { success: false, error: 'Error al cargar roles' }
    }
}

async function ensureRoleAllowed(rol: string) {
    const rolesResult = await getRoles()
    const allowedRoles = rolesResult.success && rolesResult.data && rolesResult.data.length > 0
        ? rolesResult.data
        : [...FALLBACK_ROLES]

    if (!allowedRoles.includes(rol)) {
        throw new Error('Rol inválido')
    }
}

// Verificar si el usuario actual es ADMIN
async function isAdmin(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    return profile?.rol === 'ADMIN'
}

export async function getUsers(): Promise<ActionResponse<UserData[]>> {
    try {
        if (!await isAdmin()) {
            return { success: false, error: 'No autorizado' }
        }

        const supabase = await createClient()

        // Obtener perfiles existentes (incluyen email de la tabla profiles)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (profileError) {
            console.error('Profile error:', profileError)
            throw new Error(`Error al obtener perfiles: ${profileError.message}`)
        }

        // Mapear perfiles a UserData
        const enrichedUsers: UserData[] = (profiles || []).map(profile => ({
            id: profile.id,
            email: profile.email || null,
            nombre: profile.nombre || 'Sin nombre',
            apellidos: profile.apellidos || 'Sin apellidos',
            rol: profile.rol || 'MIEMBRO',
            pulpito: profile.pulpito || false,
            avatar_url: profile.avatar_url || null,
            created_at: profile.created_at || new Date().toISOString()
        }))

        // Ordenar por nombre (o email si no nombre)
        enrichedUsers.sort((a, b) => {
            const nameA = a.nombre !== 'Sin nombre' ? a.nombre : a.email || ''
            const nameB = b.nombre !== 'Sin nombre' ? b.nombre : b.email || ''
            return nameA.localeCompare(nameB)
        })

        return { success: true, data: enrichedUsers }
    } catch (error: any) {
        console.error('Error fetching users:', error)
        const errorMessage = error?.message || 'Error al cargar usuarios'
        return { success: false, error: errorMessage }
    }
}

export async function createUser(formData: FormData): Promise<ActionResponse<void>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const parsed = createSchema.safeParse({
            email: formData.get('email'),
            password: formData.get('password'),
            nombre: formData.get('nombre'),
            apellidos: formData.get('apellidos'),
            rol: formData.get('rol'),
            pulpito: formData.get('pulpito') === 'true'
        })

        if (!parsed.success) {
            return { success: false, error: 'Datos inválidos' }
        }

        const { email, password, nombre, apellidos, rol, pulpito } = parsed.data
        const avatarFile = formData.get('avatar') as File | null

        if (!email.endsWith(VALID_DOMAIN)) {
            return { success: false, error: `El email debe terminar en ${VALID_DOMAIN}` }
        }

        await ensureRoleAllowed(rol)

        // 1. Crear usuario en Auth
        const { data: authUser, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre, apellidos }
        })

        if (createError) throw createError
        if (!authUser.user) throw new Error('No se pudo crear el usuario')

        const userId = authUser.user.id
        let avatarUrl = null

        // 2. Subir avatar si existe
        if (avatarFile && avatarFile.size > 0) {
            const fileExt = avatarFile.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await getSupabaseAdmin().storage
                .from('avatars')
                .upload(fileName, avatarFile, { contentType: avatarFile.type })

            if (uploadError) {
                console.error('Error uploading avatar:', uploadError)
            } else {
                const { data: publicUrl } = getSupabaseAdmin().storage
                    .from('avatars')
                    .getPublicUrl(fileName)
                avatarUrl = publicUrl.publicUrl
            }
        }

        // 3. Actualizar perfil (Trigger lo crea, pero actualizamos datos extra)
        const { error: profileError } = await getSupabaseAdmin()
            .from('profiles')
            .update({
                nombre,
                apellidos,
                rol,
                pulpito,
                avatar_url: avatarUrl // Actualizar URL si se subió foto
            })
            .eq('id', userId)

        if (profileError) throw profileError

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, error: error.message || 'Error al crear usuario' }
    }
}

export async function cleanupNonDomainUsers(): Promise<ActionResponse<number>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const { data: { users }, error } = await getSupabaseAdmin().auth.admin.listUsers()
        if (error) throw error

        const invalidUsers = users.filter(u => !u.email?.endsWith(VALID_DOMAIN))
        let deletedCount = 0

        for (const user of invalidUsers) {
            // Eliminar avatar si tiene
            const { data: profile } = await getSupabaseAdmin()
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single()

            if (profile?.avatar_url) {
                const parts = profile.avatar_url.split('/')
                const fileName = parts[parts.length - 1]
                await getSupabaseAdmin().storage.from('avatars').remove([fileName])
            }

            // Eliminar usuario
            await getSupabaseAdmin().auth.admin.deleteUser(user.id)
            deletedCount++
        }

        revalidatePath('/dashboard/admin/users')
        return { success: true, data: deletedCount }
    } catch (error) {
        console.error('Error cleaning users:', error)
        return { success: false, error: 'Error al limpiar usuarios' }
    }
}

export async function updateUserFull(formData: FormData): Promise<ActionResponse<void>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const parsed = updateSchema.safeParse({
            id: formData.get('id'),
            nombre: formData.get('nombre'),
            apellidos: formData.get('apellidos'),
            rol: formData.get('rol'),
            pulpito: formData.get('pulpito') === 'true',
            currentAvatarUrl: formData.get('currentAvatarUrl') as string | undefined
        })

        if (!parsed.success) {
            return { success: false, error: 'Datos inválidos' }
        }

        const { id: userId, nombre, apellidos, rol, pulpito, currentAvatarUrl } = parsed.data
        const avatarFile = formData.get('avatar') as File | null

        await ensureRoleAllowed(rol)

        let newAvatarUrl = currentAvatarUrl

        // Gestionar Avatar
        if (avatarFile && avatarFile.size > 0) {
            // 1. Borrar anterior si existe
            if (currentAvatarUrl) {
                const parts = currentAvatarUrl.split('/')
                const fileName = parts[parts.length - 1]
                await getSupabaseAdmin().storage.from('avatars').remove([fileName])
            }

            // 2. Subir nuevo
            const fileExt = avatarFile.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`

            const { error: uploadError } = await getSupabaseAdmin().storage
                .from('avatars')
                .upload(fileName, avatarFile, { contentType: avatarFile.type, upsert: true })

            if (uploadError) throw uploadError

            const { data: publicUrl } = getSupabaseAdmin().storage
                .from('avatars')
                .getPublicUrl(fileName)

            newAvatarUrl = publicUrl.publicUrl
        }

        // Actualizar tabla Profiles
        const { error: updateError } = await getSupabaseAdmin()
            .from('profiles')
            .update({
                nombre,
                apellidos,
                rol,
                pulpito,
                avatar_url: newAvatarUrl
            })
            .eq('id', userId)

        if (updateError) throw updateError

        // Actualizar metadatos de usuario (opcional pero recomendado)
        await getSupabaseAdmin().auth.admin.updateUserById(userId, {
            user_metadata: { nombre, apellidos }
        })

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'Error al actualizar usuario' }
    }
}

export async function deleteUser(userId: string): Promise<ActionResponse<void>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        // 1. Obtener info de avatar para borrarlo
        const { data: profile } = await getSupabaseAdmin()
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single()

        // 2. Borrar avatar de storage
        if (profile?.avatar_url) {
            const parts = profile.avatar_url.split('/')
            const fileName = parts[parts.length - 1]
            await getSupabaseAdmin().storage.from('avatars').remove([fileName])
        }

        // 3. Borrar usuario (Auth + Cascad profile)
        const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId)
        if (error) throw error

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Error al eliminar usuario' }
    }
}

export async function getUserCounts(): Promise<ActionResponse<{ total: number, pulpito: number, admins: number }>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const { count: total } = await getSupabaseAdmin().from('profiles').select('*', { count: 'exact', head: true })
        const { count: pulpito } = await getSupabaseAdmin().from('profiles').select('*', { count: 'exact', head: true }).eq('pulpito', true)
        const { count: admins } = await getSupabaseAdmin().from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'ADMIN')

        return {
            success: true,
            data: {
                total: total || 0,
                pulpito: pulpito || 0,
                admins: admins || 0
            }
        }
    } catch (error) {
        console.error('Error getting counts:', error)
        return { success: false, error: 'Error al obtener conteos' }
    }
}
