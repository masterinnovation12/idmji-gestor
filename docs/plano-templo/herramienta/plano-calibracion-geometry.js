/**
 * Geometría del plano (púlpito vs tarjetas). Usado por calibracion.html y vitest.
 */
const PULPITO_CARD_GAP = 32;

function pulpitoBounds(p) {
  const ty = p.cy - p.tarimaH / 2;
  const podiumY = ty - 8 - p.podiumH;
  const topY = podiumY - p.topH + 18;
  const labelY = ty + p.tarimaH + 22;
  const x0 = Math.min(p.cx - p.tarimaW / 2, p.cx - p.podiumW / 2, p.cx - p.topW / 2);
  const x1 = Math.max(p.cx + p.tarimaW / 2, p.cx + p.podiumW / 2, p.cx + p.topW / 2);
  const h = labelY - topY + 8;
  return { x: x0, y: topY, w: x1 - x0, h, bottom: topY + h };
}

function nameCardBounds(card, layout) {
  const t = layout.tarjetas || {};
  const w = ((t.minW ?? 108) + (t.maxW ?? 182)) / 2;
  const roleH = (t.roleFont ?? 16) + 5 + 6;
  const nameH = Math.max(40, (t.nameFont ?? 18) + 20);
  const pad = (t.pad ?? 8) * 2;
  const h = roleH + nameH + pad;
  return {
    x: card.x - w / 2,
    y: card.y - h / 2,
    w,
    h,
    bottom: card.y + h / 2,
  };
}

function rectsOverlapHoriz(a, b, gap = 0) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x;
}

/** Tarjetas cuyo rectángulo choca con la silueta del púlpito (con margen). */
function pulpitoOverlapsNameCards(pulpito, posiciones, layout, gap = PULPITO_CARD_GAP) {
  if (!pulpito || !Array.isArray(posiciones)) return [];
  const pb = pulpitoBounds(pulpito);
  const hits = [];
  for (const pos of posiciones) {
    if (!pos?.card) continue;
    const cb = nameCardBounds(pos.card, layout);
    if (!rectsOverlapHoriz(pb, cb)) continue;
    if (pb.y < cb.bottom + gap) {
      hits.push({
        id: pos.id,
        cardBottom: cb.bottom,
        pulpitTop: pb.y,
        deficit: cb.bottom + gap - pb.y,
      });
    }
  }
  return hits;
}

function minPulpitoCyClearOfCards(pulpito, posicionesList, layout, lienzoH, gap = PULPITO_CARD_GAP) {
  const pad = 12;
  const allPos = posicionesList.flat();
  let minCy = pulpito.cy;
  for (let cy = Math.round(pulpito.cy); cy <= lienzoH; cy++) {
    const trial = { ...pulpito, cy };
    const pb = pulpitoBounds(trial);
    if (pb.bottom > lienzoH - pad) continue;
    if (!pulpitoOverlapsNameCards(trial, allPos, layout, gap).length) {
      minCy = cy;
      break;
    }
  }
  return minCy;
}

const PLANO_CALIBRATION_GEOMETRY = {
  PULPITO_CARD_GAP,
  pulpitoBounds,
  nameCardBounds,
  pulpitoOverlapsNameCards,
  minPulpitoCyClearOfCards,
};

if (typeof window !== "undefined") window.PLANO_CALIBRATION_GEOMETRY = PLANO_CALIBRATION_GEOMETRY;
if (typeof module !== "undefined") module.exports = PLANO_CALIBRATION_GEOMETRY;
