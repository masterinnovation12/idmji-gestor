# Variables de entorno para Archivos (Google Sheets) en Vercel

La página **Dashboard → Archivos** usa estas 4 variables. El código las busca **exactamente** con estos nombres (sensible a mayúsculas y sin espacios).

## Nombres exactos que deben aparecer en Vercel

| # | Nombre exacto en Vercel |
|---|-------------------------|
| 1 | `SHEET_ENSENANZAS_CSV_URL` |
| 2 | `SHEET_ESTUDIOS_CSV_URL` |
| 3 | `SHEET_INSTITUTO_CSV_URL` |
| 4 | `SHEET_PASTORADO_CSV_URL` |

- Sin espacio antes/después del nombre.
- Todo en MAYÚSCULAS.
- Guión bajo `_` entre palabras.
- Para que la página de Archivos funcione en **producción**, estas variables deben estar asignadas al entorno **Production** (no solo Preview/Development).

## Comprobar qué ve el servidor en producción

Tras desplegar, puedes llamar a:

```
GET https://tu-dominio.vercel.app/api/archivos/env-check
```

La respuesta indica para cada variable si el servidor la ve (`true`) o no (`false`), sin mostrar valores. Si alguna sale `false`, en Vercel revisa nombre y que esté en **Production**.

## Dónde verlas en Vercel

1. [vercel.com](https://vercel.com) → tu equipo → proyecto **idmji-gestor**
2. **Settings** → **Environment Variables**
3. Comprueba que las 4 variables de la tabla existan y que **Production** esté marcado para cada una.
