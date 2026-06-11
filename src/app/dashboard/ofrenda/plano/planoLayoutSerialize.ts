/**
 * Serializa PlanoVistaResuelta ↔ JSONB de ofrenda_plano_layouts.
 */

import { PLANO_ASSETS_BASE } from './planoData'
import type { PlanoLayoutElementos } from './planoSeed'
import type { PlanoVistaResuelta } from './planoTypes'

export function vistaResueltaToElementos(data: PlanoVistaResuelta): PlanoLayoutElementos {
    const fondoSrc = data.fondoUrl?.startsWith(`${PLANO_ASSETS_BASE}/`)
        ? data.fondoUrl.slice(`${PLANO_ASSETS_BASE}/`.length)
        : data.fondoUrl
            ? data.fondoUrl.replace(/^\//, '')
            : null

    return {
        schemaVersion: 3,
        lienzo: data.lienzo,
        layout: data.layout as unknown as Record<string, unknown>,
        fondoSrc,
        bloques: data.bloques,
        posiciones: data.posiciones.map(({ nombre: _n, ...rest }) => rest),
    }
}
