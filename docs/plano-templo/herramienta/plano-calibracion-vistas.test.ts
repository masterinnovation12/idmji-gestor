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
});
