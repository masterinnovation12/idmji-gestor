'use server'

import { createClient } from '@/lib/supabase/server'
import type { InstruccionCultoParaUI, RolInstruccionCulto } from '@/types/database'

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
    const id = typeof cultoTypeId === 'string' ? parseInt(cultoTypeId, 10) : cultoTypeId
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
