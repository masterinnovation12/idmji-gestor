# E2E Labor Ofrenda — Navegador Chromium (MCP @Browser)

> **Estado:** ✅ Verificado 2026-06-30  
> QA senior final con **cursor-ide-browser** y/o Playwright **chromium**.  
> URL: **`http://localhost:3004/dashboard/ofrenda`**

## Arranque

```bash
npm run dev
```

Login: usuario con rol `EDITOR` o `ADMIN`.

## Flujo MCP (cursor-ide-browser)

1. `browser_navigate` → `http://localhost:3004/dashboard/ofrenda`
2. `browser_lock` (si hay pestaña existente)
3. `browser_snapshot` — localizar segmento **Labor ofrenda**
4. Recorrer sub-pestañas: Personas → Generar → Plano → Exportar
5. `browser_take_screenshot` en hitos (opcional)
6. `browser_unlock` al terminar

## Verificaciones obligatorias

| # | Área | Qué comprobar |
|---|------|----------------|
| 1 | Shell | Dos secciones; mes global |
| 2 | Personas | Turnos, ⭐, parejas, sección sin turno |
| 3 | Generar | ⓘ lista condicionantes; generar semana |
| 4 | Plano | Nombres en sacos; 4/8 según día |
| 5 | Export | PNG plano + lista; cabecera Labor ofrenda |
| 6 | i18n | Cambiar a catalán; sin castellanismos ofrena/suport |
| 7 | Responsive | Snapshot en viewport estrecho (móvil) |

## Playwright (CI / regresión)

```bash
$env:PLAYWRIGHT_BASE_URL="http://localhost:3004"
npx playwright test e2e/labor-ofrenda-plano.spec.ts --project=chromium
```

Archivo a crear en implementación: `e2e/labor-ofrenda-plano.spec.ts`

## Viewports recomendados

- Desktop: 1280×720
- Tablet: 768×1024
- Móvil: 390×844 (iPhone 14 class)

Ver matriz completa en [15-qa-tests-senior.md](./15-qa-tests-senior.md).
