import { describe, expect, it } from "vitest";
import defaults from "./plano-calibracion-default.json";

describe("plano-calibracion vistas 2D/3D", () => {
  it("JSON embebido es schema v3 con ambas vistas", () => {
    expect(defaults.schemaVersion).toBe(3);
    expect(defaults.vistas?.["2d"]?.sacos_8?.posiciones?.length).toBe(16);
    expect(defaults.vistas?.["3d"]?.sacos_8?.posiciones?.length).toBe(16);
  });

  it("lienzos 2D y 3D son distintos", () => {
    expect(defaults.vistas["2d"].lienzo).toEqual({ w: 1448, h: 1316 });
    expect(defaults.vistas["3d"].lienzo).toEqual({ w: 1024, h: 768 });
  });

  it("fondos 3D definidos por modo", () => {
    expect(defaults.vistas["3d"].fondos?.sacos_8).toBe("plano-3d-sacos-8.jpg");
    expect(defaults.vistas["3d"].fondos?.sacos_4).toBe("plano-3d-sacos-4.jpg");
  });

  it("2D sacos_4: personas en fila delantera, números en centro de columna", () => {
    const s8 = defaults.vistas["2d"].sacos_8;
    const s4 = defaults.vistas["2d"].sacos_4;
    const mid = (a: number, b: number) => Math.round((a + b) / 2);
    for (let n = 1; n <= 4; n++) {
      const front = s8.bloques.find(b => b.n === n)!;
      const back = s8.bloques.find(b => b.n === n + 4)!;
      const b4 = s4.bloques.find(b => b.n === n)!;
      expect(b4.labelPos).toEqual({
        x: mid(front.labelPos.x, back.labelPos.x),
        y: mid(front.labelPos.y, back.labelPos.y),
      });
    }
    for (const rol of ["ofrendario", "apoyo"] as const) {
      for (let n = 1; n <= 4; n++) {
        const p8 = s8.posiciones.find(p => p.bloque === n && p.rol === rol)!;
        const p4 = s4.posiciones.find(p => p.bloque === n && p.rol === rol)!;
        expect(p4.card).toEqual(p8.card);
        expect(p4.figura).toEqual(p8.figura);
      }
    }
  });
});
