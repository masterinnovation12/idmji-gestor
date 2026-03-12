# Fase 1 – Preparación y enlaces

Responsable: **usuario** (obtener y entregar las URLs o IDs). Sin esto no se puede implementar el backend ni el frontend.

---

## Objetivo

Tener las 4 fuentes de datos (Google Sheets) publicadas en la web en formato CSV y entregar las URLs (o pares Spreadsheet ID + gid) para que el servidor pueda hacer `fetch` y parsear.

---

## Checklist de preparación

- [x] **1.1** Las 4 hojas existen como **Google Sheets** en Drive (no solo .xlsx).
- [x] **1.2** En cada Sheet: **Archivo → Compartir → Publicar en la web** → pestaña elegida → formato **CSV** → Publicar.
- [x] **1.3** Se han copiado las **4 URLs** resultantes (o los 4 pares Spreadsheet ID + gid).
- [ ] **1.4** (Opcional) Se ha anotado la estructura de la primera fila (cabeceras) de cada hoja para documentación o mapeo en la app.

---

## Tests senior – Fuente de datos (CSV / “base de datos”)

Estos criterios validan que la **fuente de datos** (los Sheets publicados) está lista para ser consumida por el backend. Un senior comprobaría:

### FD-1. Acceso público sin login

- **Acción:** Abrir cada URL de exportación CSV en una ventana de incógnito (sin iniciar sesión en Google).
- **Esperado:** La respuesta es **texto plano CSV** (cabecera + filas), no una página de login ni 403.
- **Si falla:** Revisar que la hoja está publicada (“Publicar en la web”) o compartida con “Cualquier persona con el enlace puede ver”.

### FD-2. Formato y encoding

- **Acción:** Hacer `GET` a cada URL (navegador o `curl`) y revisar el contenido.
- **Esperado:** Contenido legible; caracteres especiales (tildes, ñ, etc.) correctos (UTF-8).
- **Si falla:** En Google Sheets, comprobar que las celdas no tienen caracteres corruptos; la exportación CSV suele ser UTF-8.

### FD-3. Estabilidad de la URL

- **Acción:** Anotar si la URL incluye un “published id” (`/e/.../pub`) o el formato `.../export?format=csv&gid=...`.
- **Esperado:** Ambas formas son válidas; la URL no debe cambiar mientras no se “deje de publicar” o se cambie la pestaña publicada. Si se vuelve a publicar, puede cambiar el enlace en el formato “pub”.

### FD-4. Cabecera (primera fila no vacía)

- **Acción:** Ver el CSV de cada hoja. El backend usa como cabecera la **primera fila que tenga al menos una celda con contenido** (ver `LOGICA_PARSER_CSV_ADAPTATIVO.md`).
- **Esperado:** Esa fila define los nombres de columnas; si hace falta se normalizarán en backend (trim, espacios → `_`). Las filas vacías anteriores se ignoran.

### FD-5. Consistencia entre las 4 hojas (opcional)

- **Acción:** Revisar si las 4 hojas comparten la misma estructura (mismas columnas) o son distintas.
- **Esperado:** Documentado para decidir si la UI usa una sola tabla genérica o vistas distintas por tipo de archivo.

---

## Criterios de aceptación de la fase

- Las 4 URLs (o 4 pares ID + gid) están definidas y probadas (FD-1, FD-2).
- La primera fila de cada CSV es adecuada para usarse como cabecera (FD-4).
- El equipo de desarrollo tiene las URLs o los IDs para configurarlas en `.env.local` (Fase 2).

---

## Entrega al desarrollo

- Enviar por chat (o indicar que están en `.env.local`) las 4 URLs con etiquetas: **Estudios Bíblicos**, **Enseñanzas**, **Pastorado**, **Instituto Bíblico**.
- Opcional: listado de cabeceras o columnas por hoja para documentación.
