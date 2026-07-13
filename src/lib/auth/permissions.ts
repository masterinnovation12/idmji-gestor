/**
 * Catálogo de permisos granulares por usuario.
 *
 * Regla de resolución (debe mantenerse en sintonía con public.user_can() en BD,
 * migración 20260711120000_sedes_y_permisos.sql):
 *   1. ADMIN → siempre permitido (no se puede recortar).
 *   2. Override en profiles.permisos (jsonb { clave: boolean }) → gana.
 *   3. Sin override: EDITOR permitido, resto de roles denegado.
 */

import type { TranslationKey } from '@/lib/i18n/types'

export const PERMISSION_KEYS = [
    'cultos.gestionar',
    'cultos.editarDetalle',
    'cultos.asignarHermanos',
    'lecturas.gestionar',
    'himnos.gestionar',
    'himnario.gestionar',
    'hermanos.gestionar',
    'laborGeneral.gestionar',
    'laborPlano.gestionar',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

/** Overrides por usuario guardados en profiles.permisos */
export type PermisosOverrides = Partial<Record<PermissionKey, boolean>>

export type PermissionGroup = 'cultos' | 'labores' | 'contenido'

export interface PermissionDef {
    key: PermissionKey
    group: PermissionGroup
    labelKey: TranslationKey
    descriptionKey: TranslationKey
}

/** Definición para la UI de administración (etiquetas i18n por clave). */
export const PERMISSION_DEFS: PermissionDef[] = [
    {
        key: 'cultos.gestionar',
        group: 'cultos',
        labelKey: 'admin.permisos.cultosGestionar',
        descriptionKey: 'admin.permisos.cultosGestionarDesc',
    },
    {
        key: 'cultos.editarDetalle',
        group: 'cultos',
        labelKey: 'admin.permisos.cultosEditarDetalle',
        descriptionKey: 'admin.permisos.cultosEditarDetalleDesc',
    },
    {
        key: 'cultos.asignarHermanos',
        group: 'cultos',
        labelKey: 'admin.permisos.cultosAsignarHermanos',
        descriptionKey: 'admin.permisos.cultosAsignarHermanosDesc',
    },
    {
        key: 'lecturas.gestionar',
        group: 'contenido',
        labelKey: 'admin.permisos.lecturasGestionar',
        descriptionKey: 'admin.permisos.lecturasGestionarDesc',
    },
    {
        key: 'himnos.gestionar',
        group: 'contenido',
        labelKey: 'admin.permisos.himnosGestionar',
        descriptionKey: 'admin.permisos.himnosGestionarDesc',
    },
    {
        key: 'himnario.gestionar',
        group: 'contenido',
        labelKey: 'admin.permisos.himnarioGestionar',
        descriptionKey: 'admin.permisos.himnarioGestionarDesc',
    },
    {
        key: 'hermanos.gestionar',
        group: 'labores',
        labelKey: 'admin.permisos.hermanosGestionar',
        descriptionKey: 'admin.permisos.hermanosGestionarDesc',
    },
    {
        key: 'laborGeneral.gestionar',
        group: 'labores',
        labelKey: 'admin.permisos.laborGeneralGestionar',
        descriptionKey: 'admin.permisos.laborGeneralGestionarDesc',
    },
    {
        key: 'laborPlano.gestionar',
        group: 'labores',
        labelKey: 'admin.permisos.laborPlanoGestionar',
        descriptionKey: 'admin.permisos.laborPlanoGestionarDesc',
    },
]

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, TranslationKey> = {
    cultos: 'admin.permisos.grupoCultos',
    labores: 'admin.permisos.grupoLabores',
    contenido: 'admin.permisos.grupoContenido',
}

/** Sujeto mínimo para evaluar permisos (perfil parcial). */
export interface PermissionSubject {
    rol?: string | null
    permisos?: Record<string, unknown> | null
}

/** Permiso por defecto según rol, sin overrides. */
export function roleDefault(rol: string | null | undefined): boolean {
    if (rol === 'ADMIN' || rol === 'EDITOR') return true
    return false
}

/** ¿Puede el sujeto realizar la acción? (misma lógica que public.user_can) */
export function can(subject: PermissionSubject | null | undefined, perm: PermissionKey): boolean {
    if (!subject) return false
    if (subject.rol === 'ADMIN') return true
    const override = subject.permisos?.[perm]
    if (typeof override === 'boolean') return override
    return subject.rol === 'EDITOR'
}

/** ¿Puede realizar al menos una de las acciones? */
export function canAny(
    subject: PermissionSubject | null | undefined,
    perms: readonly PermissionKey[],
): boolean {
    return perms.some(p => can(subject, p))
}

/** Normaliza un jsonb de BD a overrides tipados (ignora claves desconocidas). */
export function parseOverrides(raw: unknown): PermisosOverrides {
    const out: PermisosOverrides = {}
    if (!raw || typeof raw !== 'object') return out
    for (const key of PERMISSION_KEYS) {
        const v = (raw as Record<string, unknown>)[key]
        if (typeof v === 'boolean') out[key] = v
    }
    return out
}
