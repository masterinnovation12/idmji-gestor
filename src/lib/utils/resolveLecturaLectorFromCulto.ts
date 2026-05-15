/**
 * Lector en púlpito = asignación del culto (intro / finalización), no quien pulsa "guardar" en la app.
 * Si no hay hermano asignado aún, se usa el usuario que registra (fallback desde el cliente).
 */
function pickAssigned(id: string | null | undefined): string | null {
    if (id == null) return null
    const t = id.trim()
    return t.length > 0 ? t : null
}

export function resolveLecturaLectorFromCulto(params: {
    tipoLectura: 'introduccion' | 'finalizacion'
    idUsuarioIntro: string | null
    idUsuarioFinalizacion: string | null
    fallbackUserId: string
}): string {
    const { tipoLectura, fallbackUserId } = params
    if (tipoLectura === 'introduccion') {
        return pickAssigned(params.idUsuarioIntro) ?? fallbackUserId
    }
    return pickAssigned(params.idUsuarioFinalizacion) ?? fallbackUserId
}
