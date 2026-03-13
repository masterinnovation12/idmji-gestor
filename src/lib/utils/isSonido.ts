/**
 * Helper para detectar el rol de sonido.
 * Funciona con rol='SONIDO' (una vez migrado el enum en la BD) o como fallback
 * mediante el marcador availability._tipo='SONIDO' establecido durante la creación.
 */
export function isSonidoUser(user: {
    rol?: string | null
    availability?: Record<string, unknown> | null | unknown
}): boolean {
    if (user.rol === 'SONIDO') return true
    if (
        user.availability &&
        typeof user.availability === 'object' &&
        (user.availability as Record<string, unknown>)._tipo === 'SONIDO'
    ) return true
    return false
}
