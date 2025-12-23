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
    email_contacto: string | null
    telefono: string | null
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
    pulpito: z.boolean().optional().default(false),
    email_contacto: z.string().email().optional().or(z.literal('')),
    telefono: z.string().optional().or(z.literal(''))
})

const updateSchema = z.object({
    id: z.string().uuid(),
    nombre: z.string().min(1),
    apellidos: z.string().min(1),
    rol: z.string().min(1),
    pulpito: z.boolean().optional().default(false),
    currentAvatarUrl: z.string().optional(),
    email_contacto: z.string().email().optional().or(z.literal('')),
    telefono: z.string().optional().or(z.literal(''))
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
            email_contacto: profile.email_contacto || null,
            telefono: profile.telefono || null,
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
            pulpito: formData.get('pulpito') === 'true',
            email_contacto: formData.get('email_contacto'),
            telefono: formData.get('telefono')
        })

        if (!parsed.success) {
            console.error('Validation error createUser:', parsed.error.flatten().fieldErrors)
            return { success: false, error: 'Datos inválidos' }
        }

        const { email, password, nombre, apellidos, rol, pulpito, email_contacto, telefono } = parsed.data
        const avatarFile = formData.get('avatar') as File | null

        if (!email.endsWith(VALID_DOMAIN)) {
            return { success: false, error: `El email debe terminar en ${VALID_DOMAIN}` }
        }

        await ensureRoleAllowed(rol)

        // Verificar si el email ya existe en profiles
        const { data: existingProfile } = await getSupabaseAdmin()
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .maybeSingle()

        if (existingProfile) {
            return { success: false, error: 'Este email ya está registrado. No se pueden duplicar emails.' }
        }

        // Verificar también en auth.users usando listUsers
        const { data: { users: existingUsers } } = await getSupabaseAdmin().auth.admin.listUsers()
        const emailExists = existingUsers?.some(u => u.email === email)
        
        if (emailExists) {
            return { success: false, error: 'Este email ya está registrado. No se pueden duplicar emails.' }
        }

        // Crear display_name con nombre y apellidos
        const displayName = `${nombre} ${apellidos}`.trim()
        const fullName = displayName // Para compatibilidad

        // 1. Crear usuario en Auth
        const { data: authUser, error: createError } = await getSupabaseAdmin().auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { 
                nombre, 
                apellidos,
                full_name: fullName,
                display_name: displayName
            }
        })

        if (createError) {
            console.error('Supabase auth.admin.createUser error:', createError)
            throw new Error(createError.message || 'No se pudo crear el usuario (Auth)')
        }
        if (!authUser.user) throw new Error('No se pudo crear el usuario')

        const userId = authUser.user.id
        let avatarUrl = null

        // Actualizar user_metadata para asegurar que display_name y full_name estén correctos
        try {
            await getSupabaseAdmin().auth.admin.updateUserById(userId, {
                user_metadata: {
                    nombre,
                    apellidos,
                    full_name: fullName,
                    display_name: displayName
                }
            })
            console.log('Display name actualizado correctamente:', displayName)
        } catch (updateError) {
            console.warn('No se pudo actualizar display_name, continuando...', updateError)
        }

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

        // 3. Insertar/actualizar perfil (garantizar existencia)
        const { error: profileError } = await getSupabaseAdmin()
            .from('profiles')
            .upsert({
                id: userId,
                email,
                nombre,
                apellidos,
                rol,
                pulpito,
                avatar_url: avatarUrl,
                email_contacto: email_contacto || null,
                telefono: telefono || null
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('Supabase upsert profile error:', profileError)
            throw new Error(profileError.message || 'Error al guardar perfil')
        }

        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error creating user:', error)
        return { success: false, error: error.message || 'Error al crear usuario' }
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
            currentAvatarUrl: formData.get('currentAvatarUrl') as string | undefined,
            email_contacto: formData.get('email_contacto'),
            telefono: formData.get('telefono')
        })

        if (!parsed.success) {
            return { success: false, error: 'Datos inválidos' }
        }

        const { id: userId, nombre, apellidos, rol, pulpito, currentAvatarUrl, email_contacto, telefono } = parsed.data
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
                avatar_url: newAvatarUrl,
                email_contacto: email_contacto || null,
                telefono: telefono || null
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
        console.log('deleteUser started for ID:', userId)
        if (!await isAdmin()) {
            console.error('User is not admin')
            return { success: false, error: 'No autorizado' }
        }

        const supabaseAdmin = getSupabaseAdmin()
        if (!supabaseAdmin) {
            console.error('Supabase admin client not initialized')
            return { success: false, error: 'Error interno: cliente Supabase no inicializado' }
        }

        // 1. Obtener info de avatar ANTES de eliminar cualquier cosa
        let avatarUrl: string | null = null
        try {
            const { data: profile, error: profileFetchError } = await supabaseAdmin
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .single()

            if (profileFetchError && profileFetchError.code !== 'PGRST116') {
                console.warn('Error fetching profile for avatar cleanup (continuing anyway):', profileFetchError.message)
            } else if (profile?.avatar_url) {
                avatarUrl = profile.avatar_url
            }
        } catch (err) {
            console.warn('Failed to fetch profile for avatar cleanup (continuing anyway):', err)
        }

        // 2. Eliminar avatar de storage ANTES de eliminar el usuario/perfil
        if (avatarUrl) {
            try {
                const parts = avatarUrl.split('/')
                const fileName = parts[parts.length - 1]
                const { error: storageError } = await supabaseAdmin.storage.from('avatars').remove([fileName])
                
                if (storageError) {
                    console.warn('Failed to delete avatar from storage (non-critical):', storageError.message)
                } else {
                    console.log('Avatar deleted successfully for user:', userId)
                }
            } catch (err) {
                console.warn('Exception deleting avatar (non-critical):', err)
            }
        }

        // 3. Eliminar usuario de Auth PRIMERO (el perfil se eliminará automáticamente por CASCADE)
        console.log('Deleting auth user first for:', userId)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        
        if (authError) {
            console.error('Supabase auth.admin.deleteUser error:', authError)
            
            // Si el error indica que el usuario no existe, verificar si el perfil también se eliminó
            if (authError.message?.includes('not found') || authError.message?.includes('does not exist')) {
                const { data: remainingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .single()
                
                if (!remainingProfile) {
                    console.log('User and profile already deleted')
                    revalidatePath('/dashboard/admin/users')
                    return { success: true }
                }
            }
            
            // Si hay un error de base de datos, puede ser por claves foráneas
            // Intentar eliminar el perfil manualmente primero y luego Auth
            if (authError.message?.includes('Database error')) {
                console.log('Database error detected, trying to delete profile first, then auth')
                
                const { error: profileDeleteError } = await supabaseAdmin
                    .from('profiles')
                    .delete()
                    .eq('id', userId)
                
                if (profileDeleteError && profileDeleteError.code !== 'PGRST116') {
                    console.error('Error deleting profile:', profileDeleteError)
                } else {
                    console.log('Profile deleted manually, retrying auth delete')
                }
                
                // Reintentar eliminar de Auth después de eliminar el perfil
                const { error: retryAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
                
                if (retryAuthError) {
                    // Verificar si el perfil se eliminó al menos
                    const { data: remainingProfile } = await supabaseAdmin
                        .from('profiles')
                        .select('id')
                        .eq('id', userId)
                        .single()
                    
                    if (!remainingProfile) {
                        console.warn('Profile deleted but auth user deletion failed:', retryAuthError.message)
                        // Considerar éxito parcial - el perfil se eliminó
                        revalidatePath('/dashboard/admin/users')
                        return { success: true, error: `Perfil eliminado pero error al eliminar de Auth: ${retryAuthError.message}` }
                    }
                    
                    throw new Error(`Error al eliminar usuario de Auth: ${retryAuthError.message}`)
                } else {
                    console.log('Auth user deleted successfully on retry')
                }
            } else {
                // Otro tipo de error
                throw new Error(`Error al eliminar usuario de Auth: ${authError.message}`)
            }
        }

        // 4. Verificar que el perfil se eliminó automáticamente (debería por CASCADE)
        console.log('Verifying profile was deleted by CASCADE')
        const { data: remainingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single()
        
        if (remainingProfile) {
            // Si el perfil aún existe, eliminarlo manualmente
            console.log('Profile still exists, deleting manually')
            const { error: profileDeleteError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', userId)
            
            if (profileDeleteError && profileDeleteError.code !== 'PGRST116') {
                console.error('Error deleting remaining profile:', profileDeleteError)
                throw new Error(`Usuario eliminado de Auth pero error al eliminar perfil: ${profileDeleteError.message}`)
            }
        }

        console.log('User deleted successfully from both Auth and Profiles:', userId)
        revalidatePath('/dashboard/admin/users')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteUser action:', error)
        const errorMessage = error?.message || 'Error desconocido al eliminar usuario'
        return { success: false, error: errorMessage }
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
