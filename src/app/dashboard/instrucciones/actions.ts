'use server'

import { createClient } from '@/lib/supabase/server'
import type { InstruccionCultoParaUI, RolInstruccionCulto } from '@/types/database'

/* ── Tipos para la página de instrucciones ─────────────────────────── */
export type RolInfo = {
  rol: RolInstruccionCulto
  titulo: string
  contenido: string
}

export type CultoInstrucciones = {
  cultoTypeId: number
  nombre: string
  color: string
  roles: RolInfo[]
}

/**
 * Obtiene todas las instrucciones de culto agrupadas por tipo, según idioma.
 * Accesible para cualquier usuario autenticado.
 */
export async function getAllInstrucciones(
  language: 'es-ES' | 'ca-ES' = 'es-ES'
): Promise<{ success: boolean; data?: CultoInstrucciones[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const isCa = language === 'ca-ES'

    const { data, error } = await supabase
      .from('instrucciones_culto')
      .select(`
        id, rol,
        titulo_es, titulo_ca,
        contenido_es, contenido_ca,
        culto_types!culto_type_id(id, nombre, color)
      `)
      .order('id')

    if (error) return { success: false, error: error.message }
    if (!data) return { success: true, data: [] }

    // Agrupar por tipo de culto
    const map = new Map<number, CultoInstrucciones>()
    for (const row of data) {
      const ct = row.culto_types as { id: number; nombre: string; color: string } | null
      if (!ct) continue
      if (!map.has(ct.id)) {
        map.set(ct.id, { cultoTypeId: ct.id, nombre: ct.nombre, color: ct.color ?? '#6366f1', roles: [] })
      }
      map.get(ct.id)!.roles.push({
        rol: row.rol as RolInstruccionCulto,
        titulo: isCa ? (row.titulo_ca || row.titulo_es) : (row.titulo_es || row.titulo_ca),
        contenido: isCa ? (row.contenido_ca || row.contenido_es) : (row.contenido_es || row.contenido_ca),
      })
    }

    return { success: true, data: Array.from(map.values()) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}

/**
 * Obtiene la instrucción para un tipo de culto y rol.
 * Devuelve título y contenido según el idioma (es/ca).
 */
export async function getInstruccionCulto(
  cultoTypeId: number | string,
  rol: RolInstruccionCulto,
  language: 'es-ES' | 'ca-ES' = 'es-ES'
): Promise<{ success: boolean; error?: string; data?: InstruccionCultoParaUI }> {
  try {
    const supabase = await createClient()
    const id = typeof cultoTypeId === 'string' ? Number.parseInt(cultoTypeId, 10) : cultoTypeId
    if (Number.isNaN(id)) {
      return { success: false, error: 'culto_type_id inválido' }
    }

    const { data, error } = await supabase
      .from('instrucciones_culto')
      .select('titulo_es, titulo_ca, contenido_es, contenido_ca')
      .eq('culto_type_id', id)
      .eq('rol', rol)
      .maybeSingle()

    if (error) {
      console.error('getInstruccionCulto:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: true, data: undefined }
    }

    const isCa = language === 'ca-ES'
    const result: InstruccionCultoParaUI = {
      titulo: isCa ? (data.titulo_ca || data.titulo_es) : (data.titulo_es || data.titulo_ca),
      contenido: isCa ? (data.contenido_ca || data.contenido_es) : (data.contenido_es || data.contenido_ca),
    }
    return { success: true, data: result }
  } catch (e) {
    console.error('getInstruccionCulto:', e)
    return { success: false, error: e instanceof Error ? e.message : 'Error desconocido' }
  }
}
