'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { USER_ROLES, isValidRole } from '@/lib/auth/roles'
import { parseOverrides, type PermisosOverrides } from '@/lib/auth/permissions'
import { ActionResponse } from '@/types/database'

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
    sede_id: string | null
    sede_nombre: string | null
    permisos: PermisosOverrides
}

export interface SedeOption {
    id: string
    nombre: string
    email_dominio: string | null
    es_principal: boolean
    activo: boolean
}

const DEFAULT_DOMAIN = '@idmjisabadell.org'

const baseSchema = {
    nombre: z.string().min(1),
    apellidos: z.string().min(1),
    rol: z.string().min(1),
    pulpito: z.boolean().optional().default(false),
    email_contacto: z.string().email().optional().or(z.literal('')),
    telefono: z.string().optional().or(z.literal('')),
    sede_id: z.string().uuid().optional().or(z.literal('')),
}

const createSchema = z.object({
    ...baseSchema,
    email: z.string().email(),
    password: z.string().min(6),
})

const updateSchema = z.object({
    ...baseSchema,
    id: z.string().uuid(),
    currentAvatarUrl: z.string().optional(),
})

export async function getRoles(): Promise<ActionResponse<string[]>> {
    const { error } = await requireAdmin()
    if (error) return { success: false, error }
    return { success: true, data: [...USER_ROLES] }
}

/** Sedes disponibles para asignar usuarios (solo ADMIN). */
export async function getSedesOptions(): Promise<ActionResponse<SedeOption[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data, error: sedesError } = await ctx.supabase
        .from('sedes')
        .select('id, nombre, email_dominio, es_principal, activo')
        .order('es_principal', { ascending: false })
        .order('nombre')

    if (sedesError) return { success: false, error: sedesError.message }
    return { success: true, data: (data ?? []) as SedeOption[] }
}

export async function getUsers(): Promise<ActionResponse<UserData[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data: profiles, error: profileError } = await ctx.supabase
        .from('profiles')
        .select('*, sede:sedes(nombre)')
        .order('created_at', { ascending: false })

    if (profileError) {
        console.error('Error al obtener perfiles:', profileError)
        return { success: false, error: `Error al obtener perfiles: ${profileError.message}` }
    }

    const users: UserData[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || null,
        email_contacto: profile.email_contacto || null,
        telefono: profile.telefono || null,
        nombre: profile.nombre || 'Sin nombre',
        apellidos: profile.apellidos || 'Sin apellidos',
        rol: profile.rol || 'MIEMBRO',
        pulpito: profile.pulpito || false,
        avatar_url: profile.avatar_url || null,
        created_at: profile.created_at || new Date().toISOString(),
        sede_id: (profile.sede_id as string | null) ?? null,
        sede_nombre: (profile.sede as { nombre?: string } | null)?.nombre ?? null,
        permisos: parseOverrides(profile.permisos),
    }))

    users.sort((a, b) => {
        const nameA = a.nombre !== 'Sin nombre' ? a.nombre : a.email || ''
        const nameB = b.nombre !== 'Sin nombre' ? b.nombre : b.email || ''
        return nameA.localeCompare(nameB)
    })

    return { success: true, data: users }
}

/** Dominio de email exigido según la sede elegida (fallback al dominio por defecto). */
async function getSedeDomain(sedeId: string | undefined | null): Promise<string> {
    if (!sedeId) return DEFAULT_DOMAIN
    const admin = createAdminClient()
    const { data } = await admin.from('sedes').select('email_dominio').eq('id', sedeId).maybeSingle()
    return data?.email_dominio || DEFAULT_DOMAIN
}

function parsePermisosField(formData: FormData): PermisosOverrides {
    const raw = formData.get('permisos')
    if (typeof raw !== 'string' || !raw) return {}
    try {
        return parseOverrides(JSON.parse(raw))
    } catch {
        return {}
    }
}

export async function createUser(formData: FormData): Promise<ActionResponse<void>> {
    try {
        const { error: authError } = await requireAdmin()
        if (authError) return { success: false, error: authError }

        const sedeId = (formData.get('sede_id') as string) || ''
        const domain = await getSedeDomain(sedeId)

        let email = formData.get('email') as string
        if (email && !email.includes('@')) {
            email = `${email}${domain}`
        }

        const parsed = createSchema.safeParse({
            email,
            password: formData.get('password'),
            nombre: formData.get('nombre'),
            apellidos: formData.get('apellidos'),
            rol: formData.get('rol'),
            pulpito: formData.get('pulpito') === 'true',
            email_contacto: formData.get('email_contacto'),
            telefono: formData.get('telefono'),
            sede_id: sedeId,
        })

        if (!parsed.success) return { success: false, error: 'Datos inválidos' }

        const { email: validatedEmail, password, nombre, apellidos, rol, pulpito, email_contacto, telefono } = parsed.data
        const permisos = parsePermisosField(formData)
        const avatarFile = formData.get('avatar') as File | null

        if (!validatedEmail.endsWith(domain)) {
            return { success: false, error: `El email debe terminar en ${domain}` }
        }
        if (!isValidRole(rol)) return { success: false, error: 'Rol inválido' }

        const admin = createAdminClient()

        // Email único (profiles + auth)
        const { data: existingProfile } = await admin
            .from('profiles')
            .select('id')
            .eq('email', validatedEmail)
            .maybeSingle()
        if (existingProfile) {
            return { success: false, error: 'Este email ya está registrado. No se pueden duplicar emails.' }
        }
        const { data: { users: existingUsers } } = await admin.auth.admin.listUsers()
        if (existingUsers?.some(u => u.email === validatedEmail)) {
            return { success: false, error: 'Este email ya está registrado. No se pueden duplicar emails.' }
        }

        const displayName = `${nombre} ${apellidos}`.trim()

        // 1. Usuario en Auth
        const { data: authUser, error: createError } = await admin.auth.admin.createUser({
            email: validatedEmail,
            password,
            email_confirm: true,
            user_metadata: {
                nombre,
                apellidos,
                full_name: displayName,
                display_name: displayName,
            },
        })

        if (createError) throw new Error(createError.message || 'No se pudo crear el usuario (Auth)')
        if (!authUser.user) throw new Error('No se pudo crear el usuario')

        const userId = authUser.user.id
        let avatarUrl: string | null = null

        // 2. Avatar (opcional)
        if (avatarFile && avatarFile.size > 0) {
            const fileExt = avatarFile.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            const { error: uploadError } = await admin.storage
                .from('avatars')
                .upload(fileName, avatarFile, { contentType: avatarFile.type })

            if (uploadError) {
                console.error('Error subiendo avatar:', uploadError)
            } else {
                avatarUrl = admin.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
            }
        }

        // 3. Perfil (el trigger handle_new_user ya creó una fila base)
        const { error: profileError } = await admin
            .from('profiles')
            .upsert({
                id: userId,
                email: validatedEmail,
                nombre,
                apellidos,
                rol,
                pulpito,
                avatar_url: avatarUrl,
                email_contacto: email_contacto || null,
                telefono: telefono || null,
                ...(sedeId ? { sede_id: sedeId } : {}),
                permisos,
            }, { onConflict: 'id' })

        if (profileError) throw new Error(profileError.message || 'Error al guardar perfil')

        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/hermanos')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error creando usuario:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error al crear usuario'
        return { success: false, error: errorMessage }
    }
}

export async function updateUserFull(formData: FormData): Promise<ActionResponse<void>> {
    try {
        const { error: authError } = await requireAdmin()
        if (authError) return { success: false, error: authError }

        const parsed = updateSchema.safeParse({
            id: formData.get('id'),
            nombre: formData.get('nombre'),
            apellidos: formData.get('apellidos'),
            rol: formData.get('rol'),
            pulpito: formData.get('pulpito') === 'true',
            currentAvatarUrl: formData.get('currentAvatarUrl') as string | undefined,
            email_contacto: formData.get('email_contacto'),
            telefono: formData.get('telefono'),
            sede_id: (formData.get('sede_id') as string) || '',
        })

        if (!parsed.success) return { success: false, error: 'Datos inválidos' }

        const { id: userId, nombre, apellidos, rol, pulpito, currentAvatarUrl, email_contacto, telefono, sede_id } = parsed.data
        const permisos = parsePermisosField(formData)
        const avatarFile = formData.get('avatar') as File | null

        if (!isValidRole(rol)) return { success: false, error: 'Rol inválido' }

        const admin = createAdminClient()
        let newAvatarUrl = currentAvatarUrl

        if (avatarFile && avatarFile.size > 0) {
            if (currentAvatarUrl) {
                const fileName = currentAvatarUrl.split('/').pop()
                if (fileName) await admin.storage.from('avatars').remove([fileName])
            }
            const fileExt = avatarFile.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            const { error: uploadError } = await admin.storage
                .from('avatars')
                .upload(fileName, avatarFile, { contentType: avatarFile.type, upsert: true })

            if (uploadError) throw uploadError
            newAvatarUrl = admin.storage.from('avatars').getPublicUrl(fileName).data.publicUrl
        }

        const { error: updateError } = await admin
            .from('profiles')
            .update({
                nombre,
                apellidos,
                rol,
                pulpito,
                avatar_url: newAvatarUrl,
                email_contacto: email_contacto || null,
                telefono: telefono || null,
                ...(sede_id ? { sede_id } : {}),
                permisos,
            })
            .eq('id', userId)

        if (updateError) throw updateError

        await admin.auth.admin.updateUserById(userId, {
            user_metadata: { nombre, apellidos },
        })

        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/hermanos')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error actualizando usuario:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error al actualizar usuario'
        return { success: false, error: errorMessage }
    }
}

export async function deleteUser(userId: string): Promise<ActionResponse<void>> {
    try {
        const { error: authError } = await requireAdmin()
        if (authError) return { success: false, error: authError }

        const admin = createAdminClient()

        // 1. Avatar fuera de storage (no crítico si falla)
        const { data: profile } = await admin
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .maybeSingle()

        if (profile?.avatar_url) {
            const fileName = profile.avatar_url.split('/').pop()
            if (fileName) {
                const { error: storageError } = await admin.storage.from('avatars').remove([fileName])
                if (storageError) console.error('No se pudo borrar el avatar:', storageError.message)
            }
        }

        // 2. Usuario de Auth (profiles cae por CASCADE)
        const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)

        if (authDeleteError) {
            // Si Auth falla por FKs, borrar perfil primero y reintentar
            await admin.from('profiles').delete().eq('id', userId)
            const { error: retryError } = await admin.auth.admin.deleteUser(userId)
            if (retryError && !retryError.message?.includes('not found')) {
                throw new Error(`Error al eliminar usuario de Auth: ${retryError.message}`)
            }
        }

        // 3. Verificar que el perfil no quedó huérfano
        const { data: remaining } = await admin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle()
        if (remaining) {
            await admin.from('profiles').delete().eq('id', userId)
        }

        revalidatePath('/dashboard/admin/users')
        revalidatePath('/dashboard/hermanos')
        return { success: true }
    } catch (error: unknown) {
        console.error('Error eliminando usuario:', error)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar usuario'
        return { success: false, error: errorMessage }
    }
}

export async function getUserCounts(): Promise<ActionResponse<{ total: number, pulpito: number, admins: number }>> {
    const { error } = await requireAdmin()
    if (error) return { success: false, error }

    try {
        const admin = createAdminClient()
        const [total, pulpito, admins] = await Promise.all([
            admin.from('profiles').select('*', { count: 'exact', head: true }),
            admin.from('profiles').select('*', { count: 'exact', head: true }).eq('pulpito', true),
            admin.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'ADMIN'),
        ])

        return {
            success: true,
            data: {
                total: total.count || 0,
                pulpito: pulpito.count || 0,
                admins: admins.count || 0,
            },
        }
    } catch (error) {
        console.error('Error obteniendo conteos:', error)
        return { success: false, error: 'Error al obtener conteos' }
    }
}
