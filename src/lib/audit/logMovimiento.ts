import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Tipos de movimiento de auditoría. Los `admin_*` son nuevos: trazan las
 * acciones del panel de administración (usuarios, sedes, catálogo).
 */
export type MovimientoTipo =
    | 'cambio_asignacion'
    | 'cambio_festivo'
    | 'cambio_himnos_coros'
    | 'admin_usuarios'
    | 'admin_sedes'
    | 'admin_himnario'

/**
 * Registra un movimiento de auditoría. Best-effort: nunca rompe la acción
 * principal si el insert falla (p. ej. RLS), solo lo deja en el log del server.
 */
export async function logMovimiento(
    supabase: SupabaseClient,
    userId: string | null,
    tipo: MovimientoTipo,
    descripcion: string,
): Promise<void> {
    try {
        const { error } = await supabase.from('movimientos').insert({
            id_usuario: userId,
            tipo,
            descripcion,
        })
        if (error) console.error('No se pudo registrar el movimiento de auditoría:', error.message)
    } catch (e) {
        console.error('No se pudo registrar el movimiento de auditoría:', e)
    }
}
