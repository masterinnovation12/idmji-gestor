# E2E: Instrucciones de culto (con MCP Browser)

Test manual/automático del flujo **Instrucciones de culto** usando el MCP **cursor-ide-browser** (Chrome DevTools / navegador integrado).

## Objetivo

Comprobar que un usuario autenticado puede:
1. Ir al calendario de cultos.
2. Abrir el detalle de un culto (p. ej. Alabanza).
3. Pulsar **Ver instrucciones** en una sección (Introducción o Finalización).
4. Ver el modal con las instrucciones y poder cerrarlo.

## Requisitos

- Servidor en marcha: `npm run dev` (p. ej. `http://localhost:3000`).
- Usuario con sesión iniciada en el navegador que use el MCP (o hacer login antes).

## Pasos del test (MCP)

1. **Navegar a cultos**  
   `browser_navigate` → `http://localhost:3000/dashboard/cultos`

2. **Abrir un culto**  
   `browser_snapshot` para obtener refs, luego `browser_click` en un enlace de culto (p. ej. "mar 10 Alabanza 19:00 Pendiente").

3. **Abrir instrucciones**  
   En la página de detalle, `browser_click` en el botón "Ver instrucciones" (ref del botón con ese nombre).  
   - Si el click falla por "intercepted", el div decorativo del Card ya tiene `pointer-events-none` en `CultoDetailClient.tsx`.

4. **Comprobar modal**  
   `browser_snapshot`: debe aparecer el modal con el título "Introducción — Culto de Alabanza" (o el placeholder si la migración aún no se ha aplicado). Tras aplicar `20260311100000_seed_instruccion_alabanza_introduccion.sql`, se verá el contenido completo de la instrucción (temas para preparar la alabanza, reverencia, etc.).

5. **Cerrar modal**  
   `browser_click` en el botón "Cerrar" (aria-label) o en el overlay.

## Cambios realizados para el test

- **CultoDetailClient.tsx**: div decorativo del Card con `pointer-events-none` para que el botón "Ver instrucciones" no quede tapado. Botón con `data-testid="ver-instrucciones-btn"`.
- **Modal.tsx**: botón de cierre con `aria-label="Cerrar"` para accesibilidad y E2E.

## Playwright (alternativa)

El test automatizado está en `e2e/instrucciones-culto.spec.ts`. Usa credenciales de `.env.e2e.local`.  
Para que pase de forma estable, conviene tener el servidor ya levantado (`npm run dev`) y ejecutar:

```bash
npx playwright test e2e/instrucciones-culto.spec.ts --project=chromium
```
