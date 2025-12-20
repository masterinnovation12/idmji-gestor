import { createClient } from '@/lib/supabase/server'
import LoginPage from './login/page'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Si ya está autenticado, ir al dashboard
  if (user) {
    redirect('/dashboard')
  }

  // Si no está autenticado, mostrar login directamente
  return <LoginPage />
}
