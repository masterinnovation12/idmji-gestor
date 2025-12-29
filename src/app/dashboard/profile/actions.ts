/**
 * Perfil Actions - IDMJI Gestor de Púlpito
 * 
 * Lógica del servidor para la gestión de perfiles y avatares.
 * Implementa limpieza automática de storage y sincronización de datos.
 * 
 * Características:
 * - Actualización de perfil con validación Zod
 * - Subida de avatar con limpieza de archivos antiguos
 * - Revalidación de rutas afectadas (hermanos, users, profile)
 * 
 * @author Antigravity AI
 * @date 2024-12-23
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Esquema de validación para la actualización del perfil
const updateProfileSchema = z.object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
    email_contacto: z.string().email('Email de contacto inválido').optional().or(z.literal('')).nullable(),
    telefono: z.string().optional().or(z.literal('')).nullable(),
    availability: z.record(z.object({
        intro: z.boolean().optional(),
        finalization: z.boolean().optional(),
        teaching: z.boolean().optional(),
        testimonies: z.boolean().optional()
    })).optional()
})

/**
 * Actualiza los datos del perfil del usuario actual.
 * Sincroniza nombre, apellidos, email de contacto y teléfono.
 * 
 * @param updates Datos a actualizar
 * @returns Promesa con la respuesta de la acción
 */
export async function updateProfile(
    updates: {
        nombre: string,
        apellidos: string,
        email_contacto?: string | null,
        telefono?: string | null,
        availability?: Record<string, any>
    }
): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        // Validar datos con Zod
        const parsed = updateProfileSchema.safeParse(updates)
        if (!parsed.success) {
            const errorMsg = parsed.error.errors[0]?.message || 'Datos inválidos'
            return { success: false, error: errorMsg }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                nombre: updates.nombre,
                apellidos: updates.apellidos,
                email_contacto: updates.email_contacto || null,
                telefono: updates.telefono || null,
                availability: updates.availability || {}
            })
            .eq('id', user.id)

        if (error) throw error

        const fullName = `${updates.nombre} ${updates.apellidos}`.trim()

        // Actualizar metadatos del usuario en Auth
        await supabase.auth.updateUser({
            data: {
                nombre: updates.nombre,
                apellidos: updates.apellidos,
                full_name: fullName,
                display_name: fullName
            }
        })

        // Revalidar rutas afectadas para reflejar los cambios al instante
        revalidatePath('/dashboard/profile')
        revalidatePath('/dashboard/hermanos')
        revalidatePath('/dashboard/admin/users')

        return { success: true }
    } catch (error: any) {
        console.error('Error updating profile:', error)
        return { success: false, error: error.message || 'Error al actualizar perfil' }
    }
}

/**
 * Sube un nuevo avatar y elimina el anterior del Storage para optimizar espacio.
 * 
 * @param formData FormData con el archivo 'avatar'
 * @returns Promesa con la URL del nuevo avatar
 */
export async function uploadAvatar(formData: FormData): Promise<ActionResponse<string>> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const file = formData.get('avatar') as File
        if (!file) return { success: false, error: 'No se proporcionó archivo' }

        // 1. Obtener el perfil actual para identificar el avatar antiguo
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

        // 2. Generar nombre único y subir nuevo archivo
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // 3. Limpieza: Borrar el avatar antiguo del storage si existía uno diferente
        if (profile?.avatar_url) {
            try {
                const urlParts = profile.avatar_url.split('/')
                const oldFileName = urlParts[urlParts.length - 1]

                // Solo borrar si el nombre del archivo es diferente al nuevo
                if (oldFileName && oldFileName !== fileName) {
                    await supabase.storage
                        .from('avatars')
                        .remove([oldFileName])
                    console.log('Avatar antiguo eliminado del storage:', oldFileName)
                }
            } catch (deleteError) {
                console.warn('No se pudo eliminar el avatar antiguo (no crítico):', deleteError)
            }
        }

        // 4. Actualizar la referencia en el perfil del usuario
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) throw updateError

        // Sincronizar también con metadatos de auth
        await supabase.auth.updateUser({
            data: { avatar_url: publicUrl }
        })

        // Revalidar rutas para actualizar la UI globalmente
        revalidatePath('/dashboard/profile')
        revalidatePath('/dashboard/hermanos')
        revalidatePath('/dashboard/admin/users')

        return { success: true, data: publicUrl }
    } catch (error: any) {
        console.error('Error uploading avatar:', error)
        return { success: false, error: error.message || 'Error al subir avatar' }
    }
}

/**
 * Elimina el avatar del usuario del Storage y actualiza el perfil.
 * 
 * @returns Promesa con la respuesta de la acción
 */
export async function deleteAvatar(): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        // 1. Obtener el perfil actual para identificar el avatar a eliminar
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

        if (!profile?.avatar_url) {
            return { success: false, error: 'No hay avatar para eliminar' }
        }

        // 2. Extraer el nombre del archivo de la URL
        const urlParts = profile.avatar_url.split('/')
        const fileName = urlParts[urlParts.length - 1]

        // 3. Eliminar el archivo del Storage
        if (fileName) {
            const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([fileName])

            if (deleteError) {
                console.warn('Error al eliminar del storage (continuando):', deleteError)
                // Continuamos aunque falle la eliminación del storage
            } else {
                console.log('Avatar eliminado del storage:', fileName)
            }
        }

        // 4. Actualizar el perfil para eliminar la referencia al avatar
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id)

        if (updateError) throw updateError

        // 5. Actualizar también los metadatos de auth
        await supabase.auth.updateUser({
            data: { avatar_url: null }
        })

        // 6. Revalidar rutas para actualizar la UI globalmente
        revalidatePath('/dashboard/profile')
        revalidatePath('/dashboard/hermanos')
        revalidatePath('/dashboard/admin/users')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting avatar:', error)
        return { success: false, error: error.message || 'Error al eliminar avatar' }
    }
}
