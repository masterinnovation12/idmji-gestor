'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

        // 1. Obtener todos los usuarios de Auth (Source of Truth)
        const { data: { users: authUsers }, error: authError } = await getSupabaseAdmin().auth.admin.listUsers()
        if (authError) throw authError

        // 2. Obtener perfiles existentes
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')

        if (profileError) throw profileError

        // 3. Combinar datos
        const enrichedUsers: UserData[] = authUsers.map(authUser => {
            const profile = profiles?.find(p => p.id === authUser.id)

            return {
                id: authUser.id,
                email: authUser.email || null,
                nombre: profile?.nombre || 'Sin nombre',
                apellidos: profile?.apellidos || 'Sin apellidos',
                rol: profile?.rol || 'MIEMBRO',
                pulpito: profile?.pulpito || false,
                avatar_url: profile?.avatar_url || null,
                created_at: authUser.created_at
            }
        })

        // Ordenar por nombre (o email si no nombre)
        enrichedUsers.sort((a, b) => {
            const nameA = a.nombre !== 'Sin nombre' ? a.nombre : a.email || ''
            const nameB = b.nombre !== 'Sin nombre' ? b.nombre : b.email || ''
            return nameA.localeCompare(nameB)
        })

        return { success: true, data: enrichedUsers }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Error al cargar usuarios' }
    }
}

export async function createUser(formData: FormData): Promise<ActionResponse<void>> {
    try {
        if (!await isAdmin()) return { success: false, error: 'No autorizado' }

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const nombre = formData.get('nombre') as string
        const apellidos = formData.get('apellidos') as string
        const rol = formData.get('rol') as string
        const pulpito = formData.get('pulpito') === 'true'
        const avatarFile = formData.get('avatar') as File | null

        if (!email.endsWith(VALID_DOMAIN)) {
            return { success: false, error: `El email debe terminar en ${VALID_DOMAIN}` }
        }

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

        const userId = formData.get('id') as string
        const nombre = formData.get('nombre') as string
        const apellidos = formData.get('apellidos') as string
        const rol = formData.get('rol') as string
        const pulpito = formData.get('pulpito') === 'true'
        const avatarFile = formData.get('avatar') as File | null
        const currentAvatarUrl = formData.get('currentAvatarUrl') as string

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
