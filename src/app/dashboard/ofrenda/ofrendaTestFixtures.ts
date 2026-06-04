import type { OfrMiembro } from './actions'
import { DISPONIBILIDAD_TURNOS_DEFAULT } from './ofrendaMemberAvailability'

export function makeOfrMiembro(
    partial: Partial<OfrMiembro> & Pick<OfrMiembro, 'id' | 'nombre' | 'grupo'>,
): OfrMiembro {
    return {
        activo: true,
        orden: 0,
        profile_id: null,
        created_at: '2026-01-01T00:00:00Z',
        ...DISPONIBILIDAD_TURNOS_DEFAULT,
        ...partial,
    }
}
