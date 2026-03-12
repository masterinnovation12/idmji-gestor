# Fase 3 – Backend

Implementación en el servidor: fetch a las URLs CSV, parseo a JSON y Server Actions protegidas por autenticación.

---

## Objetivo

- Obtener los datos de cada Sheet vía `fetch` a la URL pública CSV.
- Parsear CSV a array de objetos con **lógica adaptativa** (ver `LOGICA_PARSER_CSV_ADAPTATIVO.md`): cabecera = primera fila no vacía; excluir filas totalmente vacías; excluir columnas totalmente vacías; nuevas columnas/filas en el Sheet se reflejan sin cambiar código.
- Exponer los datos mediante Server Action(s) solo a usuarios autenticados.
- Manejar errores (red, 403, CSV mal formado) sin dejar la app rota.

---

## Checklist de implementación

- [x] **3.1** Crear util o módulo que, dada una URL, haga `fetch`, lea el cuerpo como texto (UTF-8) y parsee CSV → array de objetos siguiendo **LOGICA_PARSER_CSV_ADAPTATIVO.md** (`src/lib/csv-sheets.ts`).
- [x] **3.2** Manejar edge cases: CSV vacío, una sola fila (solo cabecera), comas o comillas dentro de celdas (RFC 4180 básico en `parseCSVLine`).
- [x] **3.3** Crear Server Action(s) que reciban el identificador de hoja (estudios | enseñanzas | pastorado | instituto), resuelvan la URL desde env, llamen al fetcher/parser y devuelvan `{ success, data, error }` (`src/app/dashboard/archivos/actions.ts`).
- [x] **3.4** En cada acción: comprobar sesión (Supabase). Si no hay usuario autenticado, devolver error.
- [x] **3.5** (Opcional) Cache o revalidación: no implementado; el front hace polling cada 45 s.

---

## Tests senior – Backend

### BE-1. Autenticación obligatoria

- **Acción:** Llamar a la Server Action (o API route) que devuelve datos de una hoja **sin** estar logueado.
- **Esperado:** Respuesta de error (o redirección a login); nunca se devuelven datos del Sheet.

### BE-2. Respuesta correcta con sesión válida

- **Acción:** Con usuario autenticado, llamar a la acción con cada uno de los 4 identificadores.
- **Esperado:** Para cada uno, se recibe un array de objetos (o array vacío si el Sheet no tiene filas de datos). Las claves de cada objeto coinciden con la primera fila del CSV.

### BE-3. Encoding UTF-8

- **Acción:** Usar un Sheet con tildes, ñ, caracteres especiales.
- **Esperado:** Los valores parseados muestran correctamente esos caracteres (no � ni mojibake).

### BE-4. URL inexistente o 403

- **Acción:** Configurar una URL que devuelva 403 o 404 (o quitar la variable de env para simular “no configurado”).
- **Esperado:** La acción devuelve un mensaje de error claro (no un crash); el front puede mostrar “No se pudieron cargar los datos” o similar.

### BE-5. CSV vacío o solo cabecera

- **Acción:** Probar con un Sheet que solo tiene una fila (cabeceras) o está vacío.
- **Esperado:** Se devuelve array vacío `[]` (o array con un objeto vacío si se decide así); no excepción no controlada.

### BE-6. Timeout y redes inestables

- **Acción:** (Opcional) Simular timeout o red lenta en el `fetch`.
- **Esperado:** El servidor tiene un timeout razonable (ej. 10 s) y devuelve error controlado en lugar de colgar.

---

## Tests senior – Fuente de datos (CSV consumido por backend)

### FD-BE-1. Cabeceras con caracteres especiales

- **Acción:** Si el CSV tiene cabeceras con espacios, acentos o símbolos, el parser debe normalizarlas (ej. trim, reemplazar espacios por `_`) para usarlas como claves JSON.
- **Esperado:** No se generan claves `undefined`; las columnas son accesibles en el front de forma estable.

### FD-BE-2. Filas con distinto número de columnas

- **Acción:** CSV donde alguna fila tiene más o menos celdas que la cabecera.
- **Esperado:** Comportamiento definido: ignorar columnas extra, rellenar faltantes con `""` o `null`, y documentarlo. Sin crash.

### FD-BE-3. Adaptación: cabecera en primera fila no vacía

- **Acción:** CSV con varias filas vacías al inicio y luego una fila con cabeceras (ej. Enseñanzas, Estudios bíblicos).
- **Esperado:** Esa primera fila no vacía se usa como cabecera; las filas vacías anteriores no se usan ni se muestran como datos.

### FD-BE-4. Filas totalmente vacías no se muestran

- **Acción:** CSV con filas donde todas las celdas están vacías.
- **Esperado:** Esas filas no aparecen en el array devuelto; solo filas con al menos un valor en alguna columna.

### FD-BE-5. Columnas totalmente vacías no se muestran

- **Acción:** CSV con una columna que tiene cabecera pero todos los valores vacíos en las filas de datos.
- **Esperado:** Esa clave no aparece en los objetos (o no se envía al front); la tabla no muestra esa columna.

### FD-BE-6. Nueva columna/fila en el Sheet

- **Acción:** Añadir en Drive una columna con cabecera o una fila con datos; volver a cargar (o esperar el polling).
- **Esperado:** La nueva columna o fila aparece en la app sin cambiar código; no hay error.

---

## Criterios de aceptación de la fase

- Las 4 hojas se pueden leer desde el servidor usando las variables de entorno.
- Solo usuarios autenticados reciben datos (BE-1, BE-2).
- Errores de red o respuestas 403/404 se manejan sin romper la app (BE-4, BE-5, BE-6).
- El parseo CSV es robusto para UTF-8 y cabeceras/filas irregulares (BE-3, FD-BE-1, FD-BE-2).
- Lógica adaptativa aplicada: primera fila no vacía = cabecera; sin filas vacías; sin columnas vacías; nuevas columnas/filas en el Sheet se reflejan solas (FD-BE-3 a FD-BE-6). Ver `LOGICA_PARSER_CSV_ADAPTATIVO.md`.
