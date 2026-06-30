# 🎨 Guía de diseño "Liquid Premium" — IDMJI Gestor

> Playbook para aplicar el lenguaje visual **liquid premium** (cabecera marino +
> franja dorada + tarjeta crema + botones navy/dorado) al resto de la aplicación.
> Se implementó primero en **todo `/dashboard/ofrenda`** (commit `60d4373`).
> Este documento explica **en qué me basé, qué clases existen y cómo replicarlo**.

---

## 1. Filosofía

El lenguaje nació de los **modales premium** que ya existían (`OfrendaLiquidShell`:
PersonaPicker, notificaciones, "Posiciones") y que el usuario quería ver en **toda**
la pantalla, no solo en los pop-ups. La idea: un **marco unificado** (marino + dorado +
crema) en cada superficie, manteniendo el **color de sección** (verde/azul…) solo como
señal de identidad, no como relleno de cada botón.

**Regla de oro:** el _marco_ es siempre marino+dorado+crema; el _acento de sección_ es
un detalle de identidad (toggle activo, subrayado de pestaña, leyendas, tintes por
categoría). Los colores semánticos (rojo=borrar, ámbar=aviso/on-off) se respetan.

---

## 2. Tokens (colores exactos)

Definidos como variables CSS en `src/app/globals.css` (≈ línea 208), bajo los
selectores `.ofrenda-liquid-surface, .ofrenda-liquid-backdrop, .ofrenda-liquid-scope`:

| Token | Valor | Uso |
|---|---|---|
| `--ofrenda-gold` | `#b8964a` | Borde dorado principal |
| `--ofrenda-gold-deep` | `#b68f2f` | Dorado oscuro (texto/labels) |
| `--ofrenda-gold-light` | `#d4b86a` | Dorado claro (hover) |
| `--ofrenda-gold-shine` | `#e3cc92` | Brillo del "rim" |
| `--ofrenda-gold-pale` | `#f8f3e8` | **Crema** (fondos, hover) |
| `--ofrenda-gold-rim` | `linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)` | Franja dorada |

**Marino (navy) corporativo:** `#1f2e85` → `#283593` → `#151f5c`.
- Gradiente cabecera: `linear-gradient(135deg,#1f2e85 0%,#283593 54%,#151f5c 100%)`
- Gradiente botón: `linear-gradient(135deg,#1f2e85 0%,#283593 100%)` (Tailwind: `bg-gradient-to-br from-[#1f2e85] to-[#283593]`)

---

## 3. Clases CSS reutilizables (en línea, no-modales)

Viven en `src/app/globals.css` (tras `.ofrenda-liquid-handle`). **Para usarlas, el
contenedor raíz de la pantalla debe llevar la clase `ofrenda-liquid-scope`** (expone
las variables doradas a los hijos).

| Clase | Qué es |
|---|---|
| `ofrenda-liquid-scope` | Ámbito raíz: expone las variables doradas. Ponla en el `<div>` de más arriba de la página. |
| `ofrenda-liquid-card` | Tarjeta/panel crema con borde dorado suave + sombra. El contenedor por defecto. |
| `ofrenda-liquid-headbar` | Cabecera marino con franja dorada (`::after`). Va dentro de una card con `overflow-hidden`. |
| `ofrenda-liquid-nav` + `ofrenda-liquid-nav-arrow` | Navegador (mes/semana): marco crema + flechas marino. |
| `ofrenda-liquid-segment` | Contenedor de segmented control (toggles). El botón activo se pinta en línea. |
| `ofrenda-liquid-segment-btn` (+`--active`) | Botón de segment con activo marino (para toggles sin acento de sección). |
| `ofrenda-liquid-chip` (+`--active`) | Chip de fecha/filtro, activo marino. |
| `ofrenda-liquid-pill` | Píldora crema con borde dorado (valores/badges destacados). |
| `ofrenda-liquid-search` | Input de búsqueda/texto liquid (borde dorado, focus dorado). |
| `ofrenda-liquid-btn-primary` / `-secondary` | Botones del **sistema de modales** (tienen `flex:1`; en línea usa las recetas Tailwind de abajo). |

---

## 4. Reglas de decisión

| Elemento | Regla |
|---|---|
| **Botón primario / CTA** | Navy + borde dorado (receta abajo). Aunque la sección sea verde/azul. |
| **Botón secundario** | Blanco + borde dorado suave, hover crema. |
| **Botón destructivo** | Se queda **rojo** (semántico). |
| **Toggle on/off de estado** | Se queda **ámbar/verde** (semántico: activar/desactivar). |
| **Contenedor (panel/tabla/lista)** | `ofrenda-liquid-card`. |
| **Cabecera de panel/acordeón** | `ofrenda-liquid-headbar` (marino + franja). |
| **Inputs / búsqueda** | `ofrenda-liquid-search`. |
| **Segmented controls (2D/3D, mes/semana, alcance)** | Contenedor crema/dorado, activo navy+dorado. |
| **Chips de fecha** | `ofrenda-liquid-chip` / `--active`. |
| **Acento de sección (verde/azul)** | SOLO en: toggle de sección, subrayado de pestaña, leyendas de grupo, tintes por día/categoría. |
| **Interiores de una card** | **Siempre claros** (independientes del tema): usa `bg-white/70`, `#f8f3e8`, `#1f2e85`, `rgba(184,150,74,.x)` — NO `bg-background`/`bg-muted`/`text-foreground`/`border-border`. |

---

## 5. Recetas copy-paste (Tailwind)

```tsx
// Botón PRIMARIO (CTA)
"border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation"

// Botón SECUNDARIO
"border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] font-bold rounded-xl hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors touch-manipulation"

// Contenedor de SEGMENTED CONTROL
"inline-flex rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1"
//   · botón ACTIVO:
"bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]"
//   · botón INACTIVO:
"text-slate-500 hover:text-[#1f2e85]"

// FILA de lista (activa)
"bg-white border border-[rgba(184,150,74,0.3)] rounded-xl shadow-[0_1px_4px_rgba(31,46,133,0.05)]"
//   · inactiva/deshabilitada:
"border-dashed border-[rgba(184,150,74,0.25)] bg-[#f8f3e8]/40 opacity-70"

// BANNER / info dorado
"bg-gradient-to-br from-[#f8f3e8] to-white border border-[rgba(184,150,74,0.35)] text-[#1f2e85] rounded-2xl"

// ESTADO VACÍO (dashed)
"border-2 border-dashed border-[rgba(184,150,74,0.3)] rounded-2xl"
```

```tsx
// PANEL con cabecera marino (estructura típica)
<div className="ofrenda-liquid-card overflow-hidden">
  <button className="ofrenda-liquid-headbar w-full flex items-center justify-between px-4 py-3.5">
    <span className="text-white font-bold">Título</span>
  </button>
  <div className="px-4 py-4 bg-white/70"> … </div>
</div>
```

---

## 6. Cómo aplicarlo a una pantalla nueva (checklist)

1. Añade `ofrenda-liquid-scope` al `<div>` raíz de la página.
2. Envuelve cada bloque (panel, tabla, lista) en `ofrenda-liquid-card`.
3. Cabeceras de panel → `ofrenda-liquid-headbar`.
4. Botones: primario→navy/dorado, secundario→blanco/dorado, borrar→rojo.
5. Inputs/búsqueda → `ofrenda-liquid-search`.
6. Toggles → contenedor `segment` crema/dorado + activo navy.
7. Sustituye `bg-background`/`bg-muted`/`text-foreground`/`border-border` por valores
   claros explícitos **dentro de las cards** (independencia de tema).
8. Conserva el acento de sección solo donde sea identidad.
9. **i18n**: todo texto nuevo por `useI18n()` (ver `CLAUDE.md`).
10. Verifica (sección 8).

---

## 7. Independencia de tema (importante)

Las cards liquid son **siempre claras** (crema/blanco), como los modales —incluso en
modo oscuro—. Por eso, **dentro** de una card no uses utilidades dependientes del tema
(`bg-background`, `bg-muted`, `text-foreground`, `border-border`): se verían oscuras
sobre crema. Usa valores fijos claros. El _fondo_ de la página sí puede seguir el tema;
las cards "flotan" claras encima (igual que un modal sobre su backdrop).

---

## 8. Verificación (lo que usé)

**Capturas reales** con Playwright (login auto vía `.env.e2e.local`) en escritorio y
móvil, revisando cada pestaña antes/después.

**Tests E2E de regresión visual** — `e2e/ofrenda-liquid-design.spec.ts`. La aserción
clave comprueba el color **real** computado (no la clase), robusta a refactors:

```ts
const GOLD = /184,\s*150,\s*74/   // #b8964a en rgb()
const NAVY = /31,\s*46,\s*133/    // #1f2e85 en rgb()
// borde dorado:
expect(await el.evaluate(n => getComputedStyle(n).borderTopColor)).toMatch(GOLD)
// cabecera/botón navy (gradiente):
expect(await el.evaluate(n => getComputedStyle(n).backgroundImage)).toMatch(NAVY)
```

Comandos de cierre tras cualquier cambio:
```bash
npx tsc --noEmit
npx vitest run                       # incluye i18n (paridad + catalán)
node scripts/check-i18n-hardcoded.mjs
npx playwright test --project=chromium
npm run build                        # build de producción
npm run lint                         # 0 errores/warnings
```

---

## 9. Generalizar a TODA la app (recomendación a futuro)

Hoy las clases se llaman `ofrenda-liquid-*` y las variables se exponen vía
`.ofrenda-liquid-scope`. Para usarlo fuera de ofrenda tienes dos caminos:

- **Rápido (sin renombrar):** añade `ofrenda-liquid-scope` al raíz de la pantalla nueva
  y reutiliza las clases tal cual. Funciona ya.
- **Limpio (recomendado si se generaliza mucho):** renombra el prefijo a algo neutro
  (p. ej. `app-liquid-*` / `liquid-*`) y mueve las variables doradas a `:root` o a un
  `.liquid-scope` genérico. Hazlo con un find-and-replace global + actualiza los tests
  que referencian las clases. Mantén las recetas Tailwind de la sección 5 idénticas.

> Sugerencia de orden para extenderlo: Cultos → Lecturas → Hermanos → Himnario →
> Instrucciones → Historial → Admin. Una pantalla por PR, con su captura antes/después
> y los tests de la sección 8 en verde.

---

## 10. Anti-patrones (qué NO hacer)

- ❌ Pintar cada botón con el color de sección (rompe la homogeneidad). Primarios = navy/dorado.
- ❌ Usar `bg-background`/`bg-muted`/`border-border` dentro de una card liquid (se rompe en modo oscuro).
- ❌ Hardcodear texto visible (debe pasar por i18n — ver `CLAUDE.md`).
- ❌ Quitar el rojo de borrar o el ámbar de on/off (son semánticos).
- ❌ ARIA a medias (p. ej. `role="combobox"` sin `aria-controls`): o completo, o input simple.

---

_Referencia de implementación: commit `60d4373` (rama `desarrollo`). Archivos núcleo:
`src/app/globals.css` (clases `ofrenda-liquid-*`), `src/app/dashboard/ofrenda/**`._
