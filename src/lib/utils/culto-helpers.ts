import { Culto } from '@/types/database'

export type CultoStatus = 'complete' | 'pending'

export function getCultoStatus(culto: Partial<Culto>): CultoStatus {
    const type = culto.tipo_culto
    if (!type) return 'pending'

    // Verify constraints based on DB flags
    // If a flag is undefined (e.g. not selected), default to false (safe for legacy data).

    // Intro
    if (type.tiene_lectura_introduccion) {
        if (!culto.id_usuario_intro && !culto.usuario_intro) return 'pending'
    }

    // Finalizacion
    if (type.tiene_lectura_finalizacion) {
        if (!culto.id_usuario_finalizacion && !culto.usuario_finalizacion) return 'pending'
    }

    // Ensenanza
    if (type.tiene_ensenanza) {
        if (!culto.id_usuario_ensenanza && !culto.usuario_ensenanza) return 'pending'
    }

    // Testimonios
    if (type.tiene_testimonios) {
        if (!culto.id_usuario_testimonios && !culto.usuario_testimonios) return 'pending'
    }

    return 'complete'
}
