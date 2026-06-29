# 13 — Condicionantes al generar Labor ofrenda

> Reglas del motor `planoEngine` + validaciones previas.  
> **UI:** icono **ⓘ** junto al título «Generar plano» con lista legible (ES/CA).

---

## Catálogo de condicionantes

### A. Emparejamiento en el mismo saco (ofrendario + apoyo)

| # | Regla | Detalle |
|---|-------|---------|
| A1 | **Hombre + hombre** | Permitido en el mismo bloque. |
| A2 | **Mujer + mujer** | Permitido en el mismo bloque. |
| A3 | **Hombre + mujer** | Solo si están registrados como **pareja** en `ofrenda_plano_parejas`. |
| A4 | **Hombre + mujer sin pareja** | **Prohibido** en el mismo bloque. |
| A5 | **Parejas matrimoniales** | Si ambos están en el pool del turno, **prioridad** a asignarlos juntos (uno ofrendario, otro apoyo). |
| A6 | **Rol en pareja** | Si son **pareja registrada**: el **hombre es ofrendario** y la **mujer es apoyo** (salvo que la capacidad lo impida — ver D3; entonces el motor no asigna o avisa). |
| A7 | **Mismo género sin pareja** | H+H o M+M: quien tenga **estrella activa** (`prioridad_ofrendario`) hace **ofrendario**; la otra persona, apoyo. |
| A8 | **Sin estrella en M+M / H+H** | Si ninguno tiene estrella, el motor elige ofrendario por **rotación** (equidad). |
| A9 | **Dos con estrella** | Si **varias** tienen ⭐ en el mismo bloque H+H / M+M, desempate por **rotación** (confirmado usuario). |

### B. Una persona por servicio

| # | Regla | Detalle |
|---|-------|---------|
| B1 | **Un solo rol por día** | La misma persona no puede ser ofrendario en un saco y apoyo en otro **el mismo servicio** (misma fecha). |

### C. Turno y disponibilidad

| # | Regla | Detalle |
|---|-------|---------|
| C1 | **Pool por día** | Jueves → solo quien tenga `puede_jueves`. Dom mañana → `puede_domingo_manana`. Dom tarde → `puede_domingo_tarde`. |
| C2 | **Sin turno** | Personas con los tres flags en false **no entran** en la generación (hasta asignarlas en Personas). |
| C3 | **Activo** | Solo personas con `activo = true`. |
| C4 | **Semana** | Alcance semanal = trío jueves + domingo mañana + domingo tarde de la **misma semana ISO**. |

### D. Capacidad (ofrendario vs apoyo)

| # | Regla | Detalle |
|---|-------|---------|
| D1 | **Rol ofrendario** | Requiere `capacidad` = `ofrendario` o `ambos`. |
| D2 | **Rol apoyo** | Requiere `capacidad` = `apoyo` o `ambos`. |
| D3 | **Solo apoyo** | María Edilma Moreno y Gleidis Amador: **nunca** ofrendario. |

### E. Rotación y equidad

| # | Regla | Detalle |
|---|-------|---------|
| E1 | **Rotación** | Repartir turnos de forma equitativa dentro del alcance (semana/mes). |
| E2 | **Entre meses** | El puntero de rotación **continúa** donde quedó el mes anterior (por turno). |
| E3 | **Anti-repetición** | Evitar la misma persona en dos servicios **consecutivos** del mismo turno cuando hay alternativas. |
| E4 | **Aleatoriedad controlada** | Dentro del mismo nivel de prioridad, barajar para no repetir siempre el mismo orden. |

### F. Sacos y plano

| # | Regla | Detalle |
|---|-------|---------|
| F1 | **Número de sacos** | Jueves y dom tarde: según `sacos_jueves` / `sacos_domingo_tarde` (habitual 4). Dom mañana: `sacos_domingo` (habitual 8). |
| F2 | **Dos roles por saco** | Cada bloque lleva exactamente un ofrendario y un apoyo. |
| F3 | **Plano calibrado** | Solo modos 4 u 8 sacos en el lienzo (valores intermedios no tienen disposición). |

### G. Validaciones antes de generar

| # | Comprobación | Si falla |
|---|--------------|----------|
| G1 | Existe plan del mes | No se puede generar |
| G2 | Personas suficientes en el pool | «Faltan personas en [turno]» |
| G3 | Género definido en elegibles | «Falta género en [nombre]» |
| G4 | Balance ofrendario/apoyo posible | «Capacidad insuficiente para ofrendarios» |

---

### H. Prioridad ofrendario (estrella ⭐)

| # | Regla | Detalle |
|---|-------|---------|
| H1 | **Campo BD** | `prioridad_ofrendario boolean` en `ofrenda_plano_personas` (UI: icono estrella). |
| H2 | **Solo mismo género** | La estrella aplica al emparejar **H+H** o **M+M**; en parejas manda la regla A6 (hombre ofrendario). |
| H3 | **Capacidad** | La estrella no anula D3: quien es solo apoyo nunca será ofrendario aunque tenga estrella. |
| H4 | **Toggle en Personas** | En la tarjeta de cada persona: botón estrella on/off (varias personas pueden tenerla activa). |
| H5 | **Varias estrellas** | Permitidas; si coinciden en el mismo saco, **rotación** decide ofrendario. |

---

## Condicionantes adicionales (ampliar cuando indiques)

Espacio para reglas que aún no están cerradas. Ejemplos posibles:

- Mínimo de días entre repeticiones de la misma pareja en bloque
- Preferencia fija de rol (siempre ofrendario vs apoyo) para ciertas personas
- No separar parejas en servicios distintos el mismo mes
- Límite máximo de veces al mes por persona

**→ Si tienes más condicionantes, dímelos y los añado al catálogo y al icono ⓘ.**

---

## UI — Icono informativo «ⓘ»

### Ubicación

Panel **Labor ofrenda → Generar plano**, junto al título:

```
┌─────────────────────────────────────────────────────────┐
│  Generar plano  ⓘ                                       │
│  Asignación automática de ofrendario y apoyo por saco   │
│  …                                                      │
│  [ Semana ] [ Mes ]     [ Generar ] [ Regenerar ]       │
└─────────────────────────────────────────────────────────┘
```

### Comportamiento

| Plataforma | Interacción |
|------------|-------------|
| Desktop | Hover o clic en ⓘ → **popover** con lista |
| Móvil | Tap → **sheet** inferior (patrón `OfrendaLiquidShell`) |

- `aria-label` traducido (`ofrenda.planoGenerate.rulesInfoLabel`)
- Icono: `Info` de lucide-react, tamaño discreto, color muted / dorado suave
- No bloquea el botón Generar

### Wireframe popover

```
┌─ Condicionantes de asignación ─────────────── [×] ┐
│                                                   │
│  • En cada saco: hombre+hombre, mujer+mujer,     │
│    o pareja registrada (hombre+mujer).            │
│  • Hombre y mujer sin pareja no van juntos.       │
│  • Una persona solo un rol por servicio.          │
│  • Solo personas del turno del día (jueves /       │
│    domingo mañana / domingo tarde).               │
│  • Respeto de capacidad: solo apoyo, ofrendario   │
│    o ambos.                                       │
│  • Rotación equitativa; continúa entre meses.     │
│  • Si son pareja: el hombre hace ofrendario y la mujer apoyo. │
│  • En hombre+hombre o mujer+mujer: quien tenga ⭐ hace        │
│    ofrendario; si ninguno, rotación equitativa.               │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Implementación técnica

| Pieza | Archivo |
|-------|---------|
| Lista de reglas (fuente única) | `planoGenerateRules.ts` — array `{ id, labelKey }` |
| Componente ⓘ | `PlanoGenerateRulesInfo.tsx` |
| Panel generar | `PlanoGeneratePanel.tsx` |
| i18n | `ofrenda.planoGenerate.rules.*` en `ofrendaKeys.ts` |

**Importante:** el motor y el popover leen la **misma fuente** (`planoGenerateRules.ts`) para no desincronizar texto y lógica.

```typescript
// planoGenerateRules.ts — ejemplo
export const PLANO_GENERATE_RULE_IDS = [
  'pairingGender',
  'pairingCoupleOnly',
  'oneRolePerService',
  'turnPool',
  'capacity',
  'rotation',
  'coupleManOfrendario',
  'starSameGender',
  'starFallback',
] as const
```

### Tests

- Popover renderiza todas las claves i18n
- Paridad ES/CA en `translations.parity.test.ts`
- Catálogo exportado para documentación en Vitest (opcional)

---

## Claves i18n propuestas (ES)

| Clave | Texto ES |
|-------|----------|
| `ofrenda.planoGenerate.title` | Generar plano |
| `ofrenda.planoGenerate.rulesInfoLabel` | Ver condicionantes de asignación |
| `ofrenda.planoGenerate.rulesTitle` | Condicionantes de asignación |
| `ofrenda.planoGenerate.rules.pairingGender` | En cada saco: dos hombres, dos mujeres, o una pareja registrada (hombre y mujer). |
| `ofrenda.planoGenerate.rules.pairingCoupleOnly` | Un hombre y una mujer solo pueden ir juntos si son pareja en el directorio. |
| `ofrenda.planoGenerate.rules.oneRolePerService` | Cada persona tiene un solo rol por servicio (mismo día). |
| `ofrenda.planoGenerate.rules.turnPool` | Solo se asignan personas del turno correspondiente: jueves, domingo mañana o domingo tarde. |
| `ofrenda.planoGenerate.rules.activeOnly` | Solo personas activas y con al menos un turno asignado. |
| `ofrenda.planoGenerate.rules.capacity` | Se respeta la capacidad: ofrendario, apoyo o ambos (quienes son solo apoyo nunca hacen ofrendario). |
| `ofrenda.planoGenerate.rules.rotation` | Rotación equitativa entre el grupo; el orden continúa al mes siguiente. |
| `ofrenda.planoGenerate.rules.couplePriority` | Si una pareja está disponible, se prioriza en el mismo saco. |
| `ofrenda.planoGenerate.rules.coupleManOfrendario` | En una pareja, el hombre hace ofrendario y la mujer apoyo. |
| `ofrenda.planoGenerate.rules.starSameGender` | En dos hombres o dos mujeres, quien tenga la estrella ⭐ hace ofrendario. |
| `ofrenda.planoGenerate.rules.starFallback` | Si ninguno tiene estrella en el mismo género, se alterna por rotación. |
| `ofrenda.plano.personas.starOfrendario` | Prioridad ofrendario |
| `ofrenda.plano.personas.starOfrendarioHelp` | En parejas del mismo sexo en un saco, esta persona hará ofrendario al generar el plano. En parejas hombre-mujer, el hombre hace ofrendario. |
| `ofrenda.planoGenerate.rules.antiRepeat` | Se evita repetir a la misma persona en servicios consecutivos del mismo turno cuando es posible. |

Catalán: redacción normativa en `ofrendaKeysCa` (ofrena, suport, parella…).

---

## Resumen para el usuario

| Pregunta | Respuesta |
|----------|---------|
| ¿Tenemos reglas pareja / M+M / H+H? | **Sí**, A1–A5 |
| ¿Hay más condicionantes? | **Sí**, turno, capacidad, 1 rol/día, rotación, etc. (catálogo arriba) |
| ¿Aparecerán en UI? | **Sí**, icono ⓘ con lista al generar plano labor ofrenda |
| ¿Puedes añadir más? | **Sí**, dímelos y entran en motor + popover |
