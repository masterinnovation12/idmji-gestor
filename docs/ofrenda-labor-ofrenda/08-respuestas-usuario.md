# 08 — Respuestas del usuario (confirmadas)

> Actualizado: 2026-06-29

## Resueltas

| ID | Pregunta | Respuesta |
|----|----------|-----------|
| **P2** | ¿Dos roles el mismo día? | **No.** Una persona = un solo rol por servicio/día. |
| **P3** | Capacidad | **Solo apoyo:** María Edilma Moreno, Gleidis Amador. **Ambos** (ofrendario y apoyo): Eymy, Maria del Mar, Georgina, Leni y el resto. |
| **P4** | Regenerar labores vs plano | **Por separado** (botones y flujos independientes). |
| **P6** | Gleidis, Yicely, María Edilma | Las tres son **mujer**. **Gleidis ↔ Ramiro Zapata** (pareja nueva). **Yicely:** sin pareja, sin reglas especiales. |
| **P5** | Semana | Siempre el trío **jueves + domingo mañana + domingo tarde** de la misma semana ISO. |
| **P7** | Export PNG labor ofrenda | Plano actual + cabecera **«Labor ofrenda»** homogénea. Toggle **Plano \| Lista**. Mockups recibidos → spec en [10-especificacion-export-labor-ofrenda.md](./10-especificacion-export-labor-ofrenda.md). Logo **más grande** (~112px) que mockup. |
| **P8** | Una o dos páginas | Delegado al agente tras QA → **recomendación: dos secciones en la misma página** (ver [09-qa-regeneracion-y-export.md](./09-qa-regeneracion-y-export.md)). |
| **P9** | Rotación entre meses | **Continúa** entre meses (puntero persistente, como secuencia de sacos). |
| **P10** | Desactivar con pareja | **Sí**, se rompe la pareja automáticamente. |

| **P1** | Turnos | Jueves A (16), Dom mañana B (21), Dom tarde C (12) — [11-turnos-p1-grupos.md](./11-turnos-p1-grupos.md) |
| **Cabecera export** | Logo unificado **112px**, misma cabecera plano + lista | ✅ Confirmado |
| **Pareja** | Hombre → **ofrendario**, mujer → **apoyo** | ✅ |
| **Estrella ⭐** | En H+H o M+M, quien la tenga → prioridad ofrendario; **varias permitidas**, desempate rotación | ✅ |
| **Responsive** | Mobile-first, tablet, desktop — [14-diseno-responsive.md](./14-diseno-responsive.md) | ✅ |
| **QA senior** | Tests por fase + Playwright chromium + **@Browser MCP** — [15-qa-tests-senior.md](./15-qa-tests-senior.md) | ✅ |

## Acciones de datos derivadas

### Capacidad (migración/seed)

```sql
UPDATE ofrenda_plano_personas SET capacidad = 'apoyo'
WHERE nombre_normalizado IN ('maria edilma moreno', 'gleidis amador');
```

### Nueva pareja

```sql
-- Gleidis Amador (mujer) + Ramiro Zapata (hombre)
INSERT INTO ofrenda_plano_parejas (mujer_persona_id, hombre_persona_id)
SELECT m.id, h.id
FROM ofrenda_plano_personas m, ofrenda_plano_personas h
WHERE m.nombre_normalizado = 'gleidis amador'
  AND h.nombre_normalizado = 'ramiro zapata'
ON CONFLICT DO NOTHING;
```

### Género (seed futuro)

| Persona | Género |
|---------|--------|
| Gleidis Amador | mujer |
| Yicely Ruiz | mujer |
| María Edilma Moreno | mujer |
