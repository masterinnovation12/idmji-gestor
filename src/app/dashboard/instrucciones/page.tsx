/**
 * Página de Instrucciones por tipo de culto.
 * Accesible para cualquier usuario autenticado (cualquier rol).
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import { getAllInstrucciones } from './actions'
import InstruccionesPageClient from './InstruccionesPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InstruccionesPage() {
  unstable_noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Obtener idioma del perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('idioma')
    .eq('id', user.id)
    .single()

  const language: 'es-ES' | 'ca-ES' = profile?.idioma === 'ca-ES' ? 'ca-ES' : 'es-ES'

  const result = await getAllInstrucciones(language)

  return (
    <InstruccionesPageClient cultos={result.data ?? []} />
  )
}
