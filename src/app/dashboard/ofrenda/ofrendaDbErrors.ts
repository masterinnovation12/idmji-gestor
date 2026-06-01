/**
 * Traduce errores crudos de Postgres/Supabase a mensajes legibles en Labor Ofrenda.
 */
export function formatOfrendaActionError(message: string | undefined): string {
    if (!message?.trim()) return 'Error desconocido al guardar.'

    const m = message.toLowerCase()

    if (
        m.includes('ofrenda_planes') &&
        (m.includes('secuencia_puntero') || m.includes('secuencia_puntero_fin')) &&
        m.includes('check constraint')
    ) {
        return (
            'El puntero de la secuencia de sacos supera el límite permitido en la base de datos. ' +
            'El máximo del ciclo puede ser hasta 99; si el error continúa, avisa al administrador ' +
            'para aplicar la migración de punteros (1–99).'
        )
    }

    if (m.includes('secuencia_maximo') && m.includes('check constraint')) {
        return 'El máximo del ciclo debe estar entre 1 y 99.'
    }

    if (
        (m.includes('sacos_jueves') ||
            m.includes('sacos_domingo') ||
            m.includes('sacos_domingo_tarde')) &&
        m.includes('check constraint')
    ) {
        return 'Los sacos por servicio deben estar entre 1 y 20.'
    }

    if (m.includes('check constraint')) {
        return (
            'Los valores no cumplen las reglas de la base de datos. ' +
            'Revisa: sacos por servicio (1–20) y máximo del ciclo (1–99).'
        )
    }

    return message
}

export function isOfrendaDbConstraintError(message: string | undefined): boolean {
    if (!message) return false
    return message.toLowerCase().includes('check constraint')
}
