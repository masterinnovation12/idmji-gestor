/**
 * planoLayout.ts — Motor puro de geometría del plano 2D del Templo de Sabadell
 *
 * Porte testeable (sin DOM) de buildSvg() de la herramienta de calibración
 * (docs/plano-templo/herramienta/calibracion.html). Calcula asientos, etiquetas
 * de columna, alfolí y púlpito como datos puros; PlanoSvgTemplo.tsx los pinta.
 *
 * Convención del templo: 4 columnas numeradas de DERECHA a IZQUIERDA vistas desde
 * el púlpito (columna 1 = derecha). Bloque N ↔ columna N; en modo 8 sacos cada
 * columna se parte en sección delantera (bloques 1–4) y trasera (5–8).
 *
 * @author Equipo de Desarrollo IDMJI
 * @date 2026-06-11
 */

import type { PlanoBloque, PlanoLayout2d, PlanoModo } from './planoTypes'

// ─── Configuración real de asientos (dato del usuario, 662 asientos) ──────────

export interface TemploColumna {
    n: number
    filas: number
    asientos: number
}

/** Mapeo bloque → columna (y sección delantera/trasera en modo 8 sacos). */
export interface BloqueMapEntry {
    col: number
    sec?: 'del' | 'tra'
}

export const TEMPLO_SABADELL = {
    id: 'sabadell',
    nombre: 'Templo de Sabadell',
    columnas: [
        { n: 1, filas: 18, asientos: 8 },
        { n: 2, filas: 20, asientos: 11 },
        { n: 3, filas: 17, asientos: 10 },
        { n: 4, filas: 16, asientos: 8 },
    ] as TemploColumna[],
    bloques8: {
        1: { col: 1, sec: 'del' }, 2: { col: 2, sec: 'del' }, 3: { col: 3, sec: 'del' }, 4: { col: 4, sec: 'del' },
        5: { col: 1, sec: 'tra' }, 6: { col: 2, sec: 'tra' }, 7: { col: 3, sec: 'tra' }, 8: { col: 4, sec: 'tra' },
    } as Record<number, BloqueMapEntry>,
    bloques4: {
        1: { col: 1 }, 2: { col: 2 }, 3: { col: 3 }, 4: { col: 4 },
    } as Record<number, BloqueMapEntry>,
}

/** Total de asientos del templo (validación: 662). */
export function totalAsientos(columnas: TemploColumna[] = TEMPLO_SABADELL.columnas): number {
    return columnas.reduce((acc, c) => acc + c.filas * c.asientos, 0)
}

// ─── Geometría calculada ──────────────────────────────────────────────────────

export interface SeatRect {
    x: number
    y: number
    w: number
    h: number
    fill: string
}

export interface ColumnaLabel {
    x: number
    y: number
    text: string
}

export interface AlfoliGeometry {
    bodyX: number
    bodyY: number
    bodyW: number
    bodyH: number
    doorX: number
    doorY: number
    doorW: number
    doorH: number
    labelCx: number
    labelCy: number
    labelFs: number
}

export interface PulpitoGeometry {
    tarimaX: number
    tarimaY: number
    tarimaW: number
    tarimaH: number
    podiumX: number
    podiumY: number
    podiumW: number
    podiumH: number
    topX: number
    topY: number
    topW: number
    topH: number
    labelX: number
    labelY: number
    labelFs: number
}

export interface PlanoSvgGeometry {
    lienzo: { w: number; h: number }
    pared: { x: number; y: number; w: number; h: number; stroke: number }
    seats: SeatRect[]
    columnaLabels: ColumnaLabel[]
    alfoli: AlfoliGeometry
    pulpito: PulpitoGeometry
}

/** Color del asiento según columna y mitad (delantera/trasera) en el modo dado. */
export function colorAsiento(
    modo: PlanoModo,
    bloques: PlanoBloque[],
    colN: number,
    esDelantera: boolean,
): string {
    const mapping = modo === 'sacos_4' ? TEMPLO_SABADELL.bloques4 : TEMPLO_SABADELL.bloques8
    for (const [bn, m] of Object.entries(mapping)) {
        if (m.col !== colN) continue
        if (modo === 'sacos_4' || (m.sec === 'del') === esDelantera) {
            return bloques.find(b => b.n === Number(bn))?.color ?? '#94a3b8'
        }
    }
    return '#94a3b8'
}

/** Límites del púlpito (caja que envuelve tarima, podio, atril y rótulo). */
export function pulpitoBounds(p: PlanoLayout2d['pulpito']) {
    const ty = p.cy - p.tarimaH / 2
    const podiumY = ty - 8 - p.podiumH
    const topY = podiumY - p.topH + 18
    const labelY = ty + p.tarimaH + 22
    const x0 = Math.min(p.cx - p.tarimaW / 2, p.cx - p.podiumW / 2, p.cx - p.topW / 2)
    const x1 = Math.max(p.cx + p.tarimaW / 2, p.cx + p.podiumW / 2, p.cx + p.topW / 2)
    return { x: x0, y: topY, w: x1 - x0, h: labelY - topY + 8 }
}

/**
 * Calcula toda la geometría del plano SVG 2D para un layout + modo + colores de bloques.
 * Réplica exacta de buildSvg() de la herramienta (mismas fórmulas, mismos redondeos).
 */
export function computePlanoSvgGeometry(
    layout: PlanoLayout2d,
    modo: PlanoModo,
    bloques: PlanoBloque[],
): PlanoSvgGeometry {
    const W = layout.lienzo.w
    const H = layout.lienzo.h
    const { w: seatW, h: seatH, gapX: seatGapX, rowH, frontY } = layout.asiento
    const aisle = layout.pasillo

    const colWidths = TEMPLO_SABADELL.columnas.map(c => c.asientos * seatW + (c.asientos - 1) * seatGapX)
    const totalW = colWidths.reduce((a, b) => a + b, 0) + aisle * 3
    const availW = W - layout.margenPared.izq - layout.margenPared.der
    let xRight = layout.margenPared.izq + availW - (availW - totalW) / 2

    const seats: SeatRect[] = []
    const columnaLabels: ColumnaLabel[] = []

    TEMPLO_SABADELL.columnas.forEach((col, ci) => {
        const w = colWidths[ci]
        const x0 = xRight - w
        const frontRows = Math.ceil(col.filas / 2)
        for (let r = 0; r < col.filas; r++) {
            const esDelantera = r < frontRows
            const y = frontY - (r + 1) * rowH + (rowH - seatH) / 2
            const fill = colorAsiento(modo, bloques, col.n, esDelantera)
            for (let s = 0; s < col.asientos; s++) {
                seats.push({ x: x0 + s * (seatW + seatGapX), y, w: seatW, h: seatH, fill })
            }
        }
        const labelY = Math.max(layout.margenPared.sup + 18, frontY - col.filas * rowH - 16)
        columnaLabels.push({
            x: x0 + w / 2,
            y: labelY,
            text: `Columna ${col.n} · ${col.filas}×${col.asientos}`,
        })
        xRight = x0 - aisle
    })

    // Alfolí/diezmo (cuerpo + puerta + rótulo, mismas fórmulas que la herramienta)
    const a = layout.alfolid
    const ax = a.cx - a.w / 2
    const ay = a.cy - a.h / 2
    const bodyW = a.w - a.doorW
    const labelFs = Math.min(14, Math.max(11, Math.round(bodyW / 17)))
    const alfoli: AlfoliGeometry = {
        bodyX: ax,
        bodyY: ay,
        bodyW,
        bodyH: a.h,
        doorX: ax + bodyW,
        doorY: a.cy - a.doorH / 2,
        doorW: a.doorW,
        doorH: a.doorH,
        labelCx: ax + bodyW / 2,
        labelCy: a.cy - 2,
        labelFs,
    }

    // Púlpito (tarima + podio + atril + rótulo)
    const p = layout.pulpito
    const ty = p.cy - p.tarimaH / 2
    const podiumY = ty - 8 - p.podiumH
    const pulpito: PulpitoGeometry = {
        tarimaX: p.cx - p.tarimaW / 2,
        tarimaY: ty,
        tarimaW: p.tarimaW,
        tarimaH: p.tarimaH,
        podiumX: p.cx - p.podiumW / 2,
        podiumY,
        podiumW: p.podiumW,
        podiumH: p.podiumH,
        topX: p.cx - p.topW / 2,
        topY: podiumY - p.topH + 18,
        topW: p.topW,
        topH: p.topH,
        labelX: p.cx,
        labelY: ty + p.tarimaH + 22,
        labelFs: Math.max(14, Math.round(18 * (p.scale || 1))),
    }

    return {
        lienzo: { w: W, h: H },
        pared: {
            x: layout.pared.inset,
            y: layout.pared.inset,
            w: W - layout.pared.inset * 2,
            h: H - layout.pared.inset * 2,
            stroke: layout.pared.stroke,
        },
        seats,
        columnaLabels,
        alfoli,
        pulpito,
    }
}

/** SVG string del fondo 2D (para export PNG). */
export function serializePlanoSvg(geo: PlanoSvgGeometry): string {
    const a = geo.alfoli
    const p = geo.pulpito
    const seats = geo.seats
        .map(
            s =>
                `<g><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="5" fill="${s.fill}"/><rect x="${s.x}" y="${s.y}" width="${s.w}" height="6" rx="3" fill="rgba(255,255,255,.28)"/></g>`,
        )
        .join('')
    const labels = geo.columnaLabels
        .map(
            l =>
                `<text x="${l.x}" y="${l.y}" text-anchor="middle" font-family="Inter,Arial" font-size="17" font-weight="800" fill="#64748b">${escapeXml(l.text)}</text>`,
        )
        .join('')
    const { w, h } = geo.lienzo
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="plano-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe7d8"/><stop offset="1" stop-color="#e3d7c0"/></linearGradient>
<linearGradient id="plano-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98e4b"/><stop offset="1" stop-color="#9c6428"/></linearGradient>
<linearGradient id="plano-tarima" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#plano-floor)"/>
<rect x="${geo.pared.x}" y="${geo.pared.y}" width="${geo.pared.w}" height="${geo.pared.h}" fill="none" stroke="#b9b1a0" stroke-width="${geo.pared.stroke}" rx="8"/>
<g>
<rect x="${a.bodyX}" y="${a.bodyY}" width="${a.bodyW}" height="${a.bodyH}" fill="#ddd5c4" stroke="#b9b1a0" stroke-width="4" rx="6"/>
<rect x="${a.doorX}" y="${a.doorY}" width="${a.doorW}" height="${a.doorH}" fill="#c4b8a8" stroke="#8a8270" stroke-width="3" rx="4"/>
<line x1="${a.doorX}" y1="${a.doorY}" x2="${a.doorX}" y2="${a.doorY + a.doorH}" stroke="#6b5d4a" stroke-width="2"/>
<text x="${a.labelCx}" y="${a.labelCy}" text-anchor="middle" font-family="Inter,Arial" font-weight="800" fill="#7a7262">
<tspan x="${a.labelCx}" dy="0" font-size="${a.labelFs}">alfolí/</tspan>
<tspan x="${a.labelCx}" dy="${Math.round(a.labelFs * 1.15)}" font-size="${Math.max(10, a.labelFs - 1)}">diezmo</tspan>
</text>
</g>
<g>${seats}</g>
${labels}
<g>
<rect x="${p.tarimaX}" y="${p.tarimaY}" width="${p.tarimaW}" height="${p.tarimaH}" rx="14" fill="url(#plano-tarima)" stroke="#64748b" stroke-width="2"/>
<rect x="${p.podiumX}" y="${p.podiumY}" width="${p.podiumW}" height="${p.podiumH}" rx="10" fill="url(#plano-wood)" stroke="#7c4a17" stroke-width="3"/>
<rect x="${p.topX}" y="${p.topY}" width="${p.topW}" height="${p.topH}" rx="6" fill="url(#plano-wood)" stroke="#7c4a17" stroke-width="3"/>
<text x="${p.labelX}" y="${p.labelY}" text-anchor="middle" font-family="Inter,Arial" font-size="${p.labelFs}" font-weight="800" fill="#334155">PÚLPITO</text>
</g>
</svg>`
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
