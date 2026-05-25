/**
 * Verifica datos reales de instrucciones Alabanza en Supabase (post-migración temas_alabanza).
 * Solo corre si hay NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o anon + credenciales de lectura.
 */
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { sortInstruccionRoles } from '@/lib/instrucciones/sortInstruccionRoles'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const canRun = Boolean(url && key)

describe.skipIf(!canRun)('instrucciones Alabanza — Supabase remoto', () => {
  it('tiene temas_alabanza publicado con contenido y intro/final en Próximamente', async () => {
    const supabase = createClient(url!, key!)
    const { data, error } = await supabase
      .from('instrucciones_culto')
      .select('rol, publicado, contenido_es, titulo_es, culto_types!inner(nombre)')
      .ilike('culto_types.nombre', '%Alabanza%')

    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(3)

    const byRol = Object.fromEntries((data ?? []).map((r) => [r.rol, r]))

    expect(byRol.temas_alabanza?.publicado).toBe(true)
    expect((byRol.temas_alabanza?.contenido_es as string)?.length).toBeGreaterThan(100)
    expect(byRol.temas_alabanza?.titulo_es).toContain('Temas')

    expect(byRol.introduccion?.publicado).toBe(false)
    expect((byRol.introduccion?.contenido_es as string)?.trim() ?? '').toBe('')

    expect(byRol.finalizacion?.publicado).toBe(false)

    const roles = sortInstruccionRoles('Alabanza', (data ?? []).map((r) => ({
      rol: r.rol as 'temas_alabanza' | 'introduccion' | 'finalizacion',
      titulo: r.titulo_es as string,
      contenido: r.contenido_es as string,
      publicado: r.publicado as boolean,
    })))
    expect(roles.map((r) => r.rol)).toEqual(['temas_alabanza', 'introduccion', 'finalizacion'])
  })
})
