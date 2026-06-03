# QA — Paridad PNG/PDF exportación Ofrenda (post-fix)

## Problemas reportados

1. Solapamiento subtítulo semana + leyenda (PDF, a veces PNG).
2. PNG y PDF con diseño distinto.
3. Texto «CGMJCI · IDMJI» en cabecera — eliminar.
4. Columnas de días demasiado anchas (especialmente semanal).

## Correcciones

| Ítem | Solución |
|------|----------|
| Solapamiento | Cabecera PDF en bloques verticales (igual que PNG); altura dinámica 40/48 mm; leyenda debajo del subtítulo con margen |
| Paridad | `exportLayoutMetrics.ts` — mismos anchos de columna px/mm en PNG y PDF |
| CGMJCI | Eliminado bloque derecho en PNG; PDF sin texto institucional extra |
| Columnas | Reparto completo del ancho (1600 px mínimo PNG; PDF: `(ancho útil − 54mm) / N`) |
| PNG recortado | Portal `overflow: visible` + medición de alto real en `exportCapture.ts` |

## Checklist verificación

### Automatizado (2026-05-29)

- [x] Vitest: `exportLayoutMetrics`, `exportWeekUtils`, `ExportLayout.export` — 10/10 OK
- [x] `npm run build` — OK
- [ ] E2E Playwright (`ofrenda-export-scope.spec.ts`) — omitido sin credenciales E2E en CI local

### Manual (recomendado tras desplegar)

- [ ] Semanal PNG: sin CGMJCI, subtítulo y leyenda separados, 3 columnas estrechas
- [ ] Semanal PDF A4: misma estructura, sin solapamientos
- [ ] Mensual PNG/PDF: columnas más compactas que antes
- [ ] Vista previa = descarga PNG
