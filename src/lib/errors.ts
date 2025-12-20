/**
 * Utilidades para manejo de errores
 */

export class AppError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public field?: string) {
        super(message, 'VALIDATION_ERROR', 400)
        this.name = 'ValidationError'
    }
}

export class AuthError extends AppError {
    constructor(message: string = 'No autorizado') {
        super(message, 'AUTH_ERROR', 401)
        this.name = 'AuthError'
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Recurso') {
        super(`${resource} no encontrado`, 'NOT_FOUND', 404)
        this.name = 'NotFoundError'
    }
}

/**
 * Maneja errores de Supabase y los convierte en errores de aplicación
 */
export function handleSupabaseError(error: any): AppError {
    if (error.code === 'PGRST116') {
        return new NotFoundError()
    }

    if (error.code === '23505') {
        return new ValidationError('Este registro ya existe')
    }

    if (error.code === '23503') {
        return new ValidationError('Referencia inválida')
    }

    return new AppError(error.message || 'Error en la base de datos', error.code)
}

/**
 * Formatea un error para mostrarlo al usuario
 */
export function formatError(error: unknown): string {
    if (error instanceof AppError) {
        return error.message
    }

    if (error instanceof Error) {
        return error.message
    }

    return 'Ha ocurrido un error inesperado'
}

/**
 * Logger simple para desarrollo
 */
export const logger = {
    error: (message: string, error?: unknown) => {
        if (process.env.NODE_ENV === 'development') {
            console.error(`[ERROR] ${message}`, error)
        }
    },

    warn: (message: string, data?: unknown) => {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[WARN] ${message}`, data)
        }
    },

    info: (message: string, data?: unknown) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[INFO] ${message}`, data)
        }
    },

    debug: (message: string, data?: unknown) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, data)
        }
    },
}
