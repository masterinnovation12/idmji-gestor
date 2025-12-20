/**
 * Esquemas de validación para formularios
 */

import { esEmailValido } from './helpers'

export interface ValidationResult {
    isValid: boolean
    errors: Record<string, string>
}

/**
 * Valida datos de login
 */
export function validarLogin(email: string, password: string): ValidationResult {
    const errors: Record<string, string> = {}

    if (!email) {
        errors.email = 'El email es requerido'
    } else if (!esEmailValido(email)) {
        errors.email = 'El email no es válido'
    }

    if (!password) {
        errors.password = 'La contraseña es requerida'
    } else if (password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

/**
 * Valida datos de registro
 */
export function validarRegistro(
    email: string,
    password: string,
    nombre: string,
    apellidos: string
): ValidationResult {
    const errors: Record<string, string> = {}

    if (!email) {
        errors.email = 'El email es requerido'
    } else if (!esEmailValido(email)) {
        errors.email = 'El email no es válido'
    }

    if (!password) {
        errors.password = 'La contraseña es requerida'
    } else if (password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!nombre || nombre.trim().length === 0) {
        errors.nombre = 'El nombre es requerido'
    }

    if (!apellidos || apellidos.trim().length === 0) {
        errors.apellidos = 'Los apellidos son requeridos'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

/**
 * Valida datos de un culto
 */
export function validarCulto(
    fecha: string,
    hora: string,
    tipoId: number | null
): ValidationResult {
    const errors: Record<string, string> = {}

    if (!fecha) {
        errors.fecha = 'La fecha es requerida'
    } else {
        const fechaObj = new Date(fecha)
        if (isNaN(fechaObj.getTime())) {
            errors.fecha = 'La fecha no es válida'
        }
    }

    if (!hora) {
        errors.hora = 'La hora es requerida'
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
        errors.hora = 'La hora no es válida (formato HH:MM)'
    }

    if (!tipoId) {
        errors.tipo = 'El tipo de culto es requerido'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

/**
 * Valida una lectura bíblica
 */
export function validarLectura(
    libro: string,
    capituloInicio: number,
    versiculoInicio: number,
    capituloFin?: number,
    versiculoFin?: number
): ValidationResult {
    const errors: Record<string, string> = {}

    if (!libro || libro.trim().length === 0) {
        errors.libro = 'El libro es requerido'
    }

    if (!capituloInicio || capituloInicio < 1) {
        errors.capituloInicio = 'El capítulo de inicio debe ser mayor a 0'
    }

    if (!versiculoInicio || versiculoInicio < 1) {
        errors.versiculoInicio = 'El versículo de inicio debe ser mayor a 0'
    }

    if (capituloFin && capituloFin < capituloInicio) {
        errors.capituloFin = 'El capítulo final no puede ser menor al inicial'
    }

    if (versiculoFin && capituloFin === capituloInicio && versiculoFin < versiculoInicio) {
        errors.versiculoFin = 'El versículo final no puede ser menor al inicial'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

/**
 * Sanitiza un string para prevenir XSS
 */
export function sanitizarString(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
}

/**
 * Valida que un array no esté vacío
 */
export function validarArrayNoVacio<T>(array: T[], nombreCampo: string): ValidationResult {
    if (!array || array.length === 0) {
        return {
            isValid: false,
            errors: { [nombreCampo]: `Debe seleccionar al menos un ${nombreCampo}` },
        }
    }

    return {
        isValid: true,
        errors: {},
    }
}
