/**
 * Constantes de la aplicación según MVP
 */

// Rutas de la aplicación
export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    DASHBOARD: '/dashboard',
    CULTOS: '/dashboard/cultos',
    LECTURAS: '/dashboard/lecturas',
    HIMNARIO: '/dashboard/himnario',
    HERMANOS: '/dashboard/hermanos',
    PROFILE: '/dashboard/profile',
    ADMIN: '/dashboard/admin',
} as const

// Roles de usuario
export const USER_ROLES = {
    ADMIN: 'ADMIN',
    EDITOR: 'EDITOR',
    MIEMBRO: 'MIEMBRO',
} as const

// Estados de culto
export const CULTO_ESTADOS = {
    PLANEADO: 'planeado',
    REALIZADO: 'realizado',
} as const

// Tipos de lectura
export const TIPOS_LECTURA = {
    INTRODUCCION: 'introduccion',
    FINALIZACION: 'finalizacion',
} as const

// Tipos de festivo
export const TIPOS_FESTIVO = {
    NACIONAL: 'nacional',
    AUTONOMICO: 'autonomico',
    LOCAL: 'local',
    LABORABLE_FESTIVO: 'laborable_festivo',
} as const

// DEPRECATED: Horarios y tipos ahora se gestionan en base de datos (tabla culto_schedules)
// Se mantienen las claves de días por si son útiles en otros helpers, pero no la lógica de negocio.

// Límites de la aplicación según MVP
export const LIMITES = {
    MAX_HIMNOS_POR_CULTO: 3,  // Máximo 3 himnos
    MAX_COROS_POR_CULTO: 3,   // Máximo 3 coros
    MAX_LECTURAS_POR_CULTO: 2,
    SEARCH_DEBOUNCE_MS: 300,
    MIN_SEARCH_LENGTH: 2,
} as const

// Mensajes de la aplicación
export const MENSAJES = {
    ERROR_GENERICO: 'Ha ocurrido un error. Por favor, intenta de nuevo.',
    EXITO_GUARDADO: 'Cambios guardados correctamente.',
    CONFIRMAR_ELIMINAR: '¿Estás seguro de que deseas eliminar este elemento?',
    CONFIRMAR_GENERAR_CULTOS: '¿Generar cultos para este mes? Esto creará cultos según el calendario semanal.',
    SIN_RESULTADOS: 'No se encontraron resultados.',
    CARGANDO: 'Cargando...',
} as const

// Configuración de animaciones
export const ANIMACIONES = {
    DURACION_CORTA: 0.2,
    DURACION_MEDIA: 0.3,
    DURACION_LARGA: 0.5,
    EASE: [0.4, 0, 0.2, 1],
} as const
