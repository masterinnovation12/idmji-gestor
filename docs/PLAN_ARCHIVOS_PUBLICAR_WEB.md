# Plan definitivo: Archivos (hojas) con “Publicar en la web”

**Opción elegida:** Solo lectura mediante enlaces públicos (Publicar en la web). Sin Service Account ni API key.

Trabajo primero en **local**; después se sube a remoto cuando esté validado.

---

## 1. Qué tienes que darme tú

Para poder implementar y dejar el plan con checks y comprobaciones, necesito **una de estas dos cosas** por cada una de las 4 hojas:

### Opción A – Las 4 URLs de “Publicar en la web” (recomendado)

Para **cada** Google Sheet (Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico):

1. Abre la hoja en Google Sheets.
2. **Archivo → Compartir → Publicar en la web** (o **Archivo → Compartir en la web**).
3. Elige la **pestaña** que quieres mostrar (o “Todas las hojas” si solo hay una).
4. Formato: **Valores separados por comas (.csv)**.
5. Pulsa **Publicar** y copia la **URL** que te dan.

**Dame estas 4 URLs**, una por hoja, con una etiqueta clara:

- URL **Estudios Bíblicos**: `https://...`
- URL **Enseñanzas**: `https://...`
- URL **Pastorado**: `https://...`
- URL **Instituto Bíblico**: `https://...`

Con eso basta para implementar. Las guardaremos en `.env.local` (no se suben a Git) y el servidor hará `fetch` a cada URL y parseará el CSV.

---

### Opción B – ID del documento + ID de la pestaña (gid)

Si prefieres no publicar aún y solo darme identificadores:

- **Spreadsheet ID:** está en la URL al abrir el Sheet:  
  `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
- **GID de la pestaña:** al hacer clic en la pestaña, la URL puede llevar `#gid=123456789`. Ese número es el `gid`.

Con **spreadsheet ID** y **gid** se puede construir la URL de exportación CSV:

`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={GID}`

**Dame para cada una de las 4 hojas:**

- Estudios Bíblicos: `SPREADSHEET_ID` + `gid` (o “primera hoja” si solo hay una).
- Enseñanzas: `SPREADSHEET_ID` + `gid`.
- Pastorado: `SPREADSHEET_ID` + `gid`.
- Instituto Bíblico: `SPREADSHEET_ID` + `gid`.

*(Nota: para que la URL de exportación funcione, la hoja tiene que estar publicada en la web o ser accesible; si no, Google puede devolver error. Por eso la Opción A suele ser más directa.)*

---

### Opcional – Estructura de las columnas

Si quieres que la tabla en la app muestre nombres de columna “bonitos” o un orden concreto, puedes indicar:

- Nombres de la **primera fila** (cabeceras) en cada Sheet, o
- Un listado tipo: “Columna A = Nombre, B = Fecha, C = Tema, …”

Si no lo indicas, usaremos la primera fila del CSV como cabecera tal cual.

---

## 2. Cómo lo adaptamos en la aplicación (qué es “mejor”)

Con la opción **“Publicar en la web”** (solo enlace, sin Service Account) la adaptación es:

- **Una sola sección en el dashboard:** por ejemplo “Archivos” o “Hojas” en el menú lateral.
- **Una página** (`/dashboard/archivos`) con **4 pestañas**: Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico. Así todo queda en una URL y el diseño es claro en móvil y desktop.
- **Datos en el servidor:** el navegador nunca recibe las URLs de los Sheets. La página llama a una Server Action (o API route); el servidor hace `fetch` a la URL pública del CSV, parsea y devuelve JSON. Solo usuarios autenticados pueden llamar a esa acción.
- **Tabla/cards:** los datos se muestran en tabla (desktop) y en cards o tabla con scroll horizontal (móvil), con el mismo estilo que el resto del dashboard.

Esto es lo que consideramos “mejor” para tu caso: mínimo mantenimiento (solo 4 URLs en `.env`), sin Google Cloud ni Service Account, y la app solo muestra lo que hay en cada Sheet.

---

## 3. Cómo ver los cambios en tiempo (real) cuando alguien edita en Drive

**Importante:** Con “Publicar en la web” Google **no envía** ningún aviso a la aplicación cuando cambia la hoja. No existe un “tiempo real” tipo push desde Google hacia nuestra app solo con ese enlace.

Opciones para que los cambios (nuevo título, nueva celda/fila) **se vean automáticamente** en la app:

| Opción | Descripción | “Tiempo real” | Complejidad |
|--------|-------------|--------------|-------------|
| **A. Recarga manual** | El usuario pulsa “Actualizar” o recarga la página (F5). | No automático. | Muy baja. |
| **B. Recarga automática (polling)** | Mientras el usuario está en la página Archivos, la app vuelve a pedir los datos al servidor cada X segundos (ej. 30 o 60). Si alguien añadió una fila en Drive, en la siguiente recarga ya aparece. | Casi en tiempo real (retraso de 30–60 s). | Baja. |
| **C. Drive API “watch” + webhook** | Google notifica a nuestro servidor cuando el archivo cambia; el servidor revalida y la próxima petición del cliente devuelve datos frescos. | Cercano a tiempo real. | Alta (Drive API, dominio público, webhook). |

**Recomendación:** **Opción B (polling)**. Es la que mejor se adapta a “Publicar en la web”:

- Cuando el usuario está en `/dashboard/archivos` (o en una pestaña concreta), cada **30–60 segundos** la app vuelve a llamar a la Server Action que lee el CSV. El servidor hace de nuevo `fetch` a la URL pública; esa URL siempre devuelve el **estado actual** del Sheet (incluidas celdas o títulos nuevos). La tabla se actualiza sin que el usuario tenga que refrescar a mano.
- Si el usuario no está en esa página, no hacemos polling (ahorramos peticiones).
- No hace falta Drive API ni webhooks; solo un `setInterval` (o `useEffect` con intervalo) en el cliente que llame a la acción y actualice el estado de la tabla.

**Resumen:** Los cambios en los Sheets de Drive **no** se ven en “tiempo real” tipo push, pero con **recarga automática cada 30–60 s** en la página Archivos sí se ven **automáticamente** al poco de que alguien añada un título o una celda/fila.

---

## 4. Resumen de lo que implementaremos

| Elemento | Decisión |
|----------|----------|
| **Fuente de datos** | 4 Google Sheets; cada uno con “Publicar en la web” en CSV. |
| **Variables de entorno** | 4 URLs (o 4 IDs + gid) en `.env.local`. |
| **Backend** | Server Action(s) que hagan `fetch` a la URL correspondiente, parseen CSV y devuelvan array de objetos. Solo usuarios autenticados. |
| **Frontend** | Una sección “Archivos” en el dashboard; página con 4 pestañas (Estudios, Enseñanzas, Pastorado, Instituto). Tabla/cards responsive. |
| **Actualización automática** | Polling cada 30–60 s mientras el usuario está en la página Archivos; así los cambios hechos en Drive se ven sin refrescar a mano. |
| **Escritura** | No; solo lectura. Los datos se siguen editando en Google Drive. |

---

## 5. Checklist de implementación (local)

### Fase 1 – Lo que tú haces (antes de codear)

- [ ] **1.1** Las 4 hojas son (o se convierten a) **Google Sheets** en Drive.
- [ ] **1.2** En cada Sheet: **Archivo → Compartir → Publicar en la web** → formato **CSV** → Publicar.
- [ ] **1.3** Entregas las **4 URLs** (Opción A) o los **4 pares (spreadsheet ID + gid)** (Opción B).
- [ ] **1.4** (Opcional) Indicar cabeceras o estructura de columnas por hoja.

### Fase 2 – Configuración en el proyecto

- [ ] **2.1** Añadir en `.env.local` las variables (no commitear):
  - `NEXT_PUBLIC_SHEET_ESTUDIOS_URL` o `SHEET_ESTUDIOS_CSV_URL`
  - `SHEET_ENSENANZAS_CSV_URL`
  - `SHEET_PASTORADO_CSV_URL`
  - `SHEET_INSTITUTO_CSV_URL`  
  *(o equivalentes con IDs si usamos Opción B).*
- [ ] **2.2** Documentar en `.env.example` los nombres de variables (sin valores) para que otro dev sepa qué rellenar.
- [ ] **2.3** Asegurar que `.env.local` y `.env*.local` están en `.gitignore`.

### Fase 3 – Backend (Next.js)

- [ ] **3.1** Crear módulo/util que, dada una URL de CSV, haga `fetch` y parsee el CSV a array de objetos (primera fila = claves). Manejar encoding UTF-8.
- [ ] **3.2** Crear Server Action(s) que reciban el identificador de hoja (estudios | enseñanzas | pastorado | instituto), tomen la URL del env y devuelvan los datos. En caso de error (red, 403, etc.) devolver mensaje claro o array vacío.
- [ ] **3.3** Proteger las acciones: comprobar que el usuario está autenticado (Supabase); si no, devolver error o redirigir.
- [ ] **3.4** (Opcional) Cache/revalidación (ej. `revalidate` o cache corto) para no hacer fetch en cada request.

### Fase 4 – Frontend

- [ ] **4.1** Añadir en el layout del dashboard (sidebar) un ítem de navegación, ej. “Archivos” o “Hojas”, que apunte a `/dashboard/archivos`.
- [ ] **4.2** Crear la ruta `/dashboard/archivos` (y si se usa subpáginas: `/dashboard/archivos/estudios-biblicos`, etc.).
- [ ] **4.3** Página con 4 pestañas (o 4 subpáginas) para Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico. Cada pestaña/página llama a la Server Action correspondiente y muestra los datos.
- [ ] **4.4** Mostrar datos en tabla (desktop) y/o cards o tabla con scroll horizontal (móvil), con el mismo estilo que el resto del dashboard (colores, tipografía, accesibilidad).
- [ ] **4.5** Estados: carga (skeleton o spinner), error (mensaje claro), vacío (sin filas).
- [ ] **4.6** Actualización automática: mientras el usuario está en la página Archivos, hacer polling (ej. cada 30–60 s) a la Server Action para refrescar los datos; así los cambios en Drive se ven sin recargar la página a mano.

### Fase 5 – Comprobaciones en local

- [ ] **5.1** Con las 4 URLs (o IDs) en `.env.local`, arrancar la app (`npm run dev`) y abrir `/dashboard/archivos`.
- [ ] **5.2** Comprobar que cada pestaña (o subpágina) muestra los datos del Sheet correcto.
- [ ] **5.3** Comprobar que, sin estar logueado, no se accede a los datos (redirección a login o mensaje de no autorizado).
- [ ] **5.4** Probar en vista móvil (responsive): tabla/cards legibles y sin overflow roto.
- [ ] **5.5** Cambiar un valor en una hoja en Drive (o añadir una fila); en la app, permanecer en la pestaña correspondiente y comprobar que en el siguiente ciclo de polling (30–60 s) los datos se actualizan sin pulsar “Actualizar”. Opcional: comprobar también que al recargar la página (F5) se ven los cambios.

---

## 6. Comprobaciones definitivas antes de dar por cerrado

- [ ] Las 4 hojas se ven correctamente en la app (datos y cabeceras).
- [ ] No se exponen las URLs en el cliente (las peticiones las hace el servidor).
- [ ] Solo usuarios autenticados pueden ver la sección Archivos.
- [ ] Diseño coherente con el resto del dashboard y usable en móvil.
- [ ] En la página Archivos, los datos se actualizan solos cada 30–60 s (polling) cuando alguien edita el Sheet en Drive.
- [ ] `.env.local` no está en Git; `.env.example` documenta las variables.

---

## 7. Siguiente paso

**Tú:** Hacer “Publicar en la web” en las 4 hojas (CSV) y enviarme las **4 URLs** (o los 4 pares ID + gid) y, si quieres, la estructura de columnas.

**Yo:** Con eso, crear el MD definitivo con los checks rellenados según avancemos y dejar implementado en local: backend (fetch + parse CSV + Server Actions), frontend (ruta, pestañas, tabla/cards) y comprobaciones de la sección 3 y 4.

Cuando todo funcione en local, se puede subir a remoto y actualizar este mismo documento con el estado final de los checks.
