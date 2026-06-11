/**
 * planoData.ts — Calibración embebida del plano del Templo de Sabadell
 *
 * Fuente de verdad ÚNICA hasta la Fase 4 (Supabase): el JSON exportado por la
 * herramienta de calibración (docs/plano-templo/herramienta/plano-calibracion-default.json).
 * Se importa directamente para evitar copias que deriven; cuando el usuario recalibre
 * y actualice ese JSON, la app lo refleja en el siguiente build.
 *
 * Las fotos de la vista 3D viven en public/plano-templo/ (copiadas de la herramienta).
 *
 * @author Equipo de Desarrollo IDMJI
 * @date 2026-06-11
 */

import calibracionJson from '../../../../../docs/plano-templo/herramienta/plano-calibracion-default.json'
import type {
    PlanoCalibracion,
    PlanoModo,
    PlanoVista,
    PlanoVistaResuelta,
} from './planoTypes'

/** Calibración oficial (schema v3) tipada. */
export const PLANO_CALIBRACION = calibracionJson as unknown as PlanoCalibracion

/** Ruta pública base de los assets del plano (fotos 3D). */
export const PLANO_ASSETS_BASE = '/plano-templo'

/**
 * Resuelve los datos necesarios para pintar una vista+modo concretos:
 * lienzo, layout, bloques, posiciones y (en 3D) la URL pública de la foto de fondo.
 */
export function getPlanoVista(vista: PlanoVista, modo: PlanoModo): PlanoVistaResuelta {
    if (vista === '2d') {
        const v = PLANO_CALIBRACION.vistas['2d']
        const pack = v[modo]
        return {
            vista,
            modo,
            lienzo: v.lienzo,
            layout: v.layout,
            bloques: pack.bloques,
            posiciones: pack.posiciones,
            fondoUrl: null,
        }
    }
    const v = PLANO_CALIBRACION.vistas['3d']
    const pack = v[modo]
    return {
        vista,
        modo,
        lienzo: v.lienzo,
        layout: v.layout,
        bloques: pack.bloques,
        posiciones: pack.posiciones,
        fondoUrl: `${PLANO_ASSETS_BASE}/${v.fondos[modo]}`,
    }
}

/** Color del bloque N dentro de un pack (fallback gris pizarra como en la herramienta). */
export function colorDeBloque(bloques: { n: number; color: string }[], n: number): string {
    return bloques.find(b => b.n === n)?.color ?? '#64748b'
}
