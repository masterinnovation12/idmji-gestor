'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { can as canFn, parseOverrides, type PermissionKey, type PermisosOverrides } from '@/lib/auth/permissions'

/**
 * Contexto de acceso del usuario actual (rol + permisos granulares + sede).
 * Para OCULTAR controles en la UI; la seguridad real la imponen los guards
 * de las server actions y las políticas RLS.
 */

interface AccessState {
    loading: boolean
    rol: string | null
    permisos: PermisosOverrides
    sedeId: string | null
    isAdmin: boolean
    can: (perm: PermissionKey) => boolean
}

const defaultState: AccessState = {
    loading: true,
    rol: null,
    permisos: {},
    sedeId: null,
    isAdmin: false,
    can: () => false,
}

const AccessContext = createContext<AccessState>(defaultState)

export function AccessProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = useMemo(() => createClient(), [])
    const [state, setState] = useState<Omit<AccessState, 'can' | 'isAdmin'>>({
        loading: true,
        rol: null,
        permisos: {},
        sedeId: null,
    })

    useEffect(() => {
        let isMounted = true

        async function fetchAccess() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !isMounted) {
                if (isMounted) setState(s => ({ ...s, loading: false }))
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('rol, permisos, sede_id')
                .eq('id', user.id)
                .single()

            if (!isMounted) return
            setState({
                loading: false,
                rol: profile?.rol ?? null,
                permisos: parseOverrides(profile?.permisos),
                sedeId: (profile?.sede_id as string | null) ?? null,
            })
        }

        fetchAccess()
        return () => { isMounted = false }
    }, [supabase])

    const value = useMemo<AccessState>(() => ({
        ...state,
        isAdmin: state.rol === 'ADMIN',
        can: (perm: PermissionKey) => canFn({ rol: state.rol, permisos: state.permisos }, perm),
    }), [state])

    return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

/** Permisos del usuario actual. Mientras carga, `can()` devuelve false. */
export function useAccess(): AccessState {
    return useContext(AccessContext)
}
