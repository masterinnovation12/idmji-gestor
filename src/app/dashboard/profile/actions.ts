'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/types/database'

export async function updateProfile(
    updates: { nombre?: string, apellidos?: string, avatar_url?: string }
): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error updating profile:', error)
        return { success: false, error: 'Error al actualizar perfil' }
    }
}

export async function uploadAvatar(formData: FormData): Promise<ActionResponse<string>> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const file = formData.get('avatar') as File
        if (!file) return { success: false, error: 'No se proporcionó archivo' }

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) throw updateError

        return { success: true, data: publicUrl }
    } catch (error) {
        console.error('Error uploading avatar:', error)
        return { success: false, error: 'Error al subir avatar' }
    }
}
