'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error.message)
        return { error: 'Credenciales incorrectas' }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function getPublicConfig() {
    const supabase = await createClient()


    type ConfigItem = { key: string; value: string | object | null }

    // Explicitly type the query result or cast it to avoid 'any'
    const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['app_name', 'church_name', 'church_location', 'login_title_color'])

    const config: Record<string, string> = {}

    // Cast data to ensure type safety and avoid lint errors
    const items = data as unknown as ConfigItem[] | null

    items?.forEach(item => {
        if (item.value) {
            config[item.key] = typeof item.value === 'string' ? item.value : JSON.stringify(item.value).replace(/"/g, '')
        }
    })

    return config
}
