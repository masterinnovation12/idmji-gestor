import type { UserRole } from '@/types/database'

/**
 * Fuente única de los roles de la app (enum `user_role` en BD).
 * Antes se derivaban de un SELECT DISTINCT sobre profiles.rol: si ningún
 * usuario tenía un rol, desaparecía del selector de administración.
 */
export const USER_ROLES: readonly UserRole[] = ['ADMIN', 'EDITOR', 'MIEMBRO', 'SONIDO'] as const

export function isValidRole(rol: string): rol is UserRole {
    return (USER_ROLES as readonly string[]).includes(rol)
}
