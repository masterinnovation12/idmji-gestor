---
description: Test + build web, commit/push rama actual, merge a main, push producción y volver
triggers:
  - "sube a producción"
  - "subelo todo en local y en remoto"
  - "haz test build web"
  - "merge a main"
  - "publicar en main"
  - "deploy producción"
---

# Deploy a producción (main → Vercel)

Workflow seguro y repetible para publicar cambios en **producción**.  
En este proyecto, **Vercel despliega desde `main`**: merge + push a `main` = producción actualizada.

## Cuándo usar este workflow

Ejecutar cuando el usuario pida explícitamente algo como:

> «Haz test build web completo; si pasa, guárdalo todo en local y remoto, merge a main, súbelo a remoto y vuelve a la rama actual.»

**No ejecutar** commit/merge/push si el usuario **no** lo ha pedido.

---

## Objetivo (checklist)

1. `npm test` — suite completa Vitest
2. `npm run build` — build de producción Next.js
3. Corregir errores y repetir hasta que ambos pasen
4. Commit + push en la **rama actual** (p. ej. `desarrollo`)
5. Merge a `main` + push `origin main`
6. Volver a la **rama en la que estabas** al empezar
7. Confirmar estado final con `git status`

---

## Reglas de seguridad Git (obligatorias)

- **Nunca** `git config`, `--force` en `main`, ni `push --force` a `main/master`
- **Nunca** commitear `.env`, `.env.local`, credenciales ni secretos
- **Nunca** `git add .` a ciegas: hay artefactos locales (screenshots QA, `.log`, `.png` sueltos) que **no** deben subirse
- **Nunca** hacer commit vacío si no hay cambios relevantes
- Si un **pre-commit hook** falla: corregir y crear un **commit nuevo** (no `--amend` salvo reglas del proyecto)
- **No** push a remoto salvo que el usuario lo pida (este workflow sí lo incluye)

---

## Pasos del agente

### 0. Guardar contexto de rama

```powershell
cd c:\idmji-gestor
$ramaTrabajo = git branch --show-current
git status -sb
git diff --stat
```

Anotar `$ramaTrabajo` — al final **debes volver a esta rama**, no asumir siempre `desarrollo`.

---

### 1. Tests (obligatorio)

```powershell
npm test
```

- Si falla: analizar, corregir, repetir hasta **0 fallos**
- No saltar tests por prisa

---

### 2. Build de producción (obligatorio)

```powershell
npm run build
```

- Si falla: analizar, corregir, repetir `npm test` + `npm run build` hasta pasar
- Warnings de `baseline-browser-mapping` o middleware deprecado no bloquean si el build termina con éxito

---

### 3. Validación opcional (recomendada si hubo cambios amplios)

```powershell
npm run lint
```

- Solo si hay tiempo o el usuario lo pide; **no sustituye** test + build

### 3b. E2E (opcional, no bloqueante por defecto)

```powershell
npm run test:e2e
```

- Requiere `.env.e2e.local` y credenciales; muchos tests hacen `skip` sin ellas
- **No** bloquear el deploy estándar si E2E no está configurado en la máquina

---

### 4. Revisar qué se va a commitear

```powershell
git status
git diff
git diff --cached
```

**Incluir** solo archivos del cambio (código, tests, migraciones, docs del feature, etc.).

**Excluir** habitualmente:

| No commitear | Ejemplos |
|--------------|----------|
| Capturas / QA local | `qa-*.png`, `dashboard-*.png`, `*-calendar-*.png` |
| Logs | `dev-*.log`, `dev-server*.log` |
| Temporales | `.tmp-*.html` |
| Build / deps | `.next/`, `node_modules/` (ya en `.gitignore`) |
| Secretos | `.env*` |

Staging explícito (ejemplo):

```powershell
git add src/ supabase/ public/ package.json package-lock.json
# Añadir solo las rutas que correspondan al cambio
```

---

### 5. Commit en la rama actual

Mensaje en español, estilo del repo (`feat:`, `fix:`, `chore:`), 1–2 líneas enfocadas en el **porqué**:

```powershell
git commit -m "fix(pwa): descripción breve del cambio" -m "Detalle opcional si hace falta."
```

Si **no hay cambios** tras test/build: **no** crear commit vacío; pasar al merge solo si `main` ya debe recibir commits previos sin pushear.

---

### 6. Push de la rama de trabajo

```powershell
git push -u origin HEAD
```

---

### 7. Merge a `main` y push producción

```powershell
git fetch origin
git checkout main
git pull origin main
git merge $ramaTrabajo -m "merge: $ramaTrabajo into main"
git push origin main
```

- Si hay **conflictos**: resolverlos, `npm test` + `npm run build` de nuevo, commit de merge, luego push
- Si `main` es la rama de trabajo actual, adaptar (pull + push directo sin merge)

---

### 8. Volver a la rama de trabajo

```powershell
git checkout $ramaTrabajo
git status -sb
```

Verificar que estás en la rama correcta y que el working tree está limpio (solo untracked locales permitidos).

---

## Criterio de éxito

| Criterio | Estado |
|----------|--------|
| `npm test` pasó | ☐ |
| `npm run build` pasó | ☐ |
| Commit(s) en rama de trabajo | ☐ |
| Push `origin/<rama-trabajo>` | ☐ |
| `main` mergeado y pusheado | ☐ |
| De vuelta en `$ramaTrabajo` | ☐ |
| Sin secretos ni basura en el commit | ☐ |

---

## Después del push a `main`

- Vercel suele desplegar automáticamente en 1–3 minutos
- Comprobar en el dashboard de Vercel o la URL de producción si el usuario lo pide
- Variables de entorno de producción: ver `docs/VERCEL_ENV_COMPLETO.md`

---

## Frases que activan este workflow

El agente debe reconocer variantes como:

- «Haz test build web completo…»
- «Si pasa, guárdalo en local y remoto»
- «Merge a main y súbelo»
- «Vuelve a la rama actual / desarrollo»
- «Sube a producción»

---

## Mejoras respecto a versiones anteriores de este doc

- ✅ `npm test` **antes** del build (antes solo había build)
- ✅ Volver a **rama actual** guardada, no hardcodear `desarrollo`
- ✅ `git add` **selectivo** (antes `git add .` subía basura)
- ✅ Reglas Git de seguridad alineadas con el proyecto
- ✅ Triggers en frontmatter para invocación del agente
- ✅ Nota Vercel = `main`
- ✅ E2E opcional documentado

---

## Integración con Cursor (recomendado)

Este archivo vive en `.agent/workflows/` y **no se carga solo** en cada chat.

Para que el agente lo aplique sin repetir la frase entera, crear además:

`.cursor/rules/deploy-produccion.mdc` con `alwaysApply: false` y descripción que enlace a este workflow.

Comando sugerido al agente: **«Ejecuta @.agent/workflows/deploy-produccion-main.md»**
