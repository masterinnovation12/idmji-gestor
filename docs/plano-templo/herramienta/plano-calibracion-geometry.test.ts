import { describe, expect, it } from "vitest";
// JS compartido con calibracion.html (module.exports + window global)
import geo from "./plano-calibracion-geometry.js";
import defaultsJson from "./plano-calibracion-default.json";
import type {
  PlanoCalibracion,
  PlanoLayoutComun,
} from "../../../src/app/dashboard/ofrenda/plano/planoTypes";

const { pulpitoOverlapsNameCards, pulpitoBounds, minPulpitoCyClearOfCards, PULPITO_CARD_GAP } = geo;

const defaults = defaultsJson as unknown as PlanoCalibracion;
const vista2d = defaults.vistas["2d"];
const layout = vista2d.layout;
const pulpito = layout.pulpito;
const lienzoH = vista2d.lienzo.h;
const sacos8 = vista2d.sacos_8;
const sacos4 = vista2d.sacos_4;

describe("plano-calibracion-geometry", () => {
  it("el púlpito por defecto no solapa tarjetas en 8 sacos (2D)", () => {
    const hits = pulpitoOverlapsNameCards(pulpito, sacos8.posiciones, layout);
    expect(hits, hits.map((h: { id: string }) => h.id).join(", ")).toEqual([]);
  });

  it("el púlpito por defecto no solapa tarjetas en 4 sacos (2D)", () => {
    const hits = pulpitoOverlapsNameCards(pulpito, sacos4.posiciones, layout);
    expect(hits, hits.map((h: { id: string }) => h.id).join(", ")).toEqual([]);
  });

  it("cy 1135 (posición anterior) sí solapaba tarjetas centrales", () => {
    const low = { ...pulpito, cy: 1135 };
    const hits8 = pulpitoOverlapsNameCards(low, sacos8.posiciones, layout);
    const hits4 = pulpitoOverlapsNameCards(low, sacos4.posiciones, layout);
    expect(hits8.length + hits4.length).toBeGreaterThan(0);
  });

  it("el púlpito cabe dentro del lienzo 2D", () => {
    const b = pulpitoBounds(pulpito);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.bottom).toBeLessThanOrEqual(lienzoH - 12);
  });

  it("minPulpitoCyClearOfCards coincide con cy embebido", () => {
    const minCy = minPulpitoCyClearOfCards(
      pulpito,
      [sacos8.posiciones, sacos4.posiciones],
      layout,
      lienzoH,
      PULPITO_CARD_GAP,
    );
    expect(pulpito.cy).toBeGreaterThanOrEqual(minCy);
    const pb = pulpitoBounds(pulpito);
    const cards = [...sacos8.posiciones, ...sacos4.posiciones];
    const maxCardBottom = Math.max(
      ...cards.map((p) => geo.nameCardBounds(p.card, layout).bottom),
    );
    expect(pb.y).toBeGreaterThanOrEqual(maxCardBottom + PULPITO_CARD_GAP);
  });

  it("layout 3D embebido no incluye púlpito", () => {
    // El layout 3D no debe arrastrar el púlpito 2D (ni el alias antiguo `pulpit`)
    const l3 = defaults.vistas["3d"].layout as PlanoLayoutComun & {
      pulpito?: unknown;
      pulpit?: unknown;
    };
    expect(l3.pulpito).toBeUndefined();
    expect(l3.pulpit).toBeUndefined();
  });
});
