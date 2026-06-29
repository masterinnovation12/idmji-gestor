'use server'

import { createClient } from '@/lib/supabase/server'

export type PlanoAuthError = 'no_auth' | 'no_permission'

export async function requireEditor() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'no_auth' as PlanoAuthError, supabase: null, userId: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'EDITOR'].includes(profile.rol)) {
        return { error: 'no_permission' as PlanoAuthError, supabase: null, userId: null }
    }
    return { error: null, supabase, userId: user.id }
}
