# Plan: Ver hojas de cálculo de Google Drive en la aplicación

Objetivo: tener una página (o subpáginas) dentro del dashboard que muestren los datos de **4 hojas de cálculo** que están en Google Drive, con el mismo diseño de la app. La “base de datos” para esa vista son esas hojas (Excel/Sheets).

---

## 1. Fuentes de datos

| # | Nombre              | Descripción / Uso |
|---|---------------------|-------------------|
| 1 | Estudios Bíblicos   | Hoja en Drive que rellenáis |
| 2 | Enseñanzas          | Hoja en Drive que rellenáis |
| 3 | Pastorado           | Hoja en Drive que rellenáis |
| 4 | Instituto Bíblico   | Hoja en Drive que rellenáis |

**Importante:**  
- Si son **archivos .xlsx** subidos a Drive: la API de **Google Sheets no puede leerlos directamente**. Hay que convertirlos a **Google Sheets** (Archivo → Guardar como → Google Hoja de cálculo) o leer el .xlsx vía **Drive API** (descargar y parsear en el servidor).  
- Si ya son **Google Sheets** (o los convertís): se leen con la **Google Sheets API** sin descargar archivos. Es la opción más simple y la que recomienda la comunidad.

En el resto del plan se asume que las 4 fuentes son **Google Sheets** (o se convierten a eso).

---

## 2. Cómo lo hace la comunidad

Resumen de lo que se usa en proyectos tipo “ver datos de Sheets en mi web”:

1. **Google Sheets API (recomendado para datos privados)**  
   - Proyecto en Google Cloud → activar Sheets API → crear **Service Account** → descargar JSON con `client_email` y `private_key`.  
   - Compartir cada Sheet con el email del Service Account (como “Editor” o “Lector”).  
   - En el servidor (Next.js): con `googleapis` y ese JSON, leer rangos (`spreadsheets.values.get`).  
   - Ventaja: hojas privadas, solo tu backend tiene acceso; la app muestra los datos con tu diseño.

2. **“Publicar en la web” (solo lectura, datos públicos)**  
   - En cada Sheet: Archivo → Compartir → “Publicar en la web” → publicar como CSV o “enlace público”.  
   - Se puede leer por URL (p. ej. CSV) sin API key.  
   - Ventaja: cero configuración de API. Desventaja: cualquiera con el enlace puede ver los datos; no recomendable si son datos internos.

3. **Drive API para .xlsx**  
   - Si insistís en dejar los archivos como .xlsx en Drive: con Drive API se descarga el archivo y en el servidor se parsea con una librería (ej. `xlsx` en Node).  
   - Más complejo y más coste de CPU; normalmente es mejor convertir a Google Sheets y usar la opción 1.

**Recomendación:**  
Usar **Google Sheets API con Service Account** y que las 4 hojas sean Google Sheets (o se conviertan). Así la “base de datos” para esta funcionalidad son esos 4 Sheets en Drive, y la app solo los muestra con su diseño.

---

## 3. Dónde ponerlo en la aplicación: página vs subpáginas

- **Una sola página con pestañas (tabs)**  
  - Ruta sugerida: `/dashboard/archivos` o `/dashboard/hojas`.  
  - En la misma página: 4 pestañas (Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico). Cada pestaña carga y muestra la hoja correspondiente.  
  - Ventaja: un solo enlace en el menú, diseño muy claro en móvil y desktop.

- **Una subpágina por hoja**  
  - Rutas: `/dashboard/archivos/estudios-biblicos`, `/dashboard/archivos/ensenanzas`, `/dashboard/archivos/pastorado`, `/dashboard/archivos/instituto-biblico`.  
  - Menú: un ítem “Archivos” o “Hojas” que lleve a una página índice, o 4 ítems en el sidebar.  
  - Ventaja: URLs directas para cada “base de datos”; mejor si queréis enlaces o favoritos concretos.

**Recomendación:**  
Una **página principal** tipo “Archivos / Hojas de Drive” con **4 subpáginas** (o 4 tabs en esa página). Así mantenemos una sola entrada en el sidebar (“Archivos” o el nombre que elijáis) y dentro se elige la hoja. Si preferís todo en una sola URL con tabs, se puede hacer en `/dashboard/archivos` sin subrutas.

---

## 4. Plan de implementación (checklist)

### Fase 1: Google Cloud y Sheets

- [ ] **1.1** Crear (o usar) un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
- [ ] **1.2** Activar **Google Sheets API** y, si usáis Drive para .xlsx, **Google Drive API**.
- [ ] **1.3** Crear una **Service Account** (Cuenta de servicio): IAM → Cuentas de servicio → Crear. Descargar la clave JSON (contiene `client_email` y `private_key`).
- [ ] **1.4** Para cada una de las 4 hojas en Drive: abrir la hoja → Compartir → añadir el **email del Service Account** (`client_email` del JSON) como **Editor** (o Lector si solo queréis leer). Así la “base de datos” sigue siendo solo esos Sheets en Drive.
- [ ] **1.5** Si hoy son .xlsx: convertirlos a Google Sheets (Archivo → Guardar como → Google Hoja de cálculo) y usar esos enlaces/IDs en la app.

### Fase 2: Configuración en el proyecto

- [ ] **2.1** Añadir en `.env.local` (nunca commitear el JSON entero):
  - `GOOGLE_SHEETS_CLIENT_EMAIL` = `client_email` del JSON.
  - `GOOGLE_SHEETS_PRIVATE_KEY` = la clave privada del JSON (en una línea, con `\n` como texto si hace falta).
  - Opcional: `GOOGLE_SHEETS_ESTUDIOS_ID`, `GOOGLE_SHEETS_ENSENANZAS_ID`, `GOOGLE_SHEETS_PASTORADO_ID`, `GOOGLE_SHEETS_INSTITUTO_ID` = IDs de cada spreadsheet (el ID está en la URL del Sheet: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`).
- [ ] **2.2** Instalar dependencia: `googleapis` (o `google-auth-library` + `googleapis` según la guía que sigáis).
- [ ] **2.3** Crear un módulo de servidor que, dado un spreadsheetId, lea un rango (por ejemplo la primera hoja completa) y devuelva un array de objetos (por ejemplo primera fila = cabeceras). Ese módulo será la “capa de base de datos” que usa los 4 Sheets.

### Fase 3: Backend (Next.js)

- [ ] **3.1** Crear **Server Actions** (o rutas API) que reciban el identificador de qué hoja quieren (Estudios / Enseñanzas / Pastorado / Instituto) y llamen al módulo anterior con el ID correspondiente.
- [ ] **3.2** Definir qué rango leer en cada Sheet (ej. “Hoja1!A:Z” o “Datos!A1:Z1000”). Si todas las hojas tienen la misma estructura (misma fila de cabecera), se puede parametrizar por env.
- [ ] **3.3** Proteger las acciones: solo usuarios autenticados (y si queréis, solo ciertos roles) pueden pedir estos datos. Así la “base de datos” en Drive sigue siendo privada y solo la app la expone a usuarios logueados.

### Fase 4: Frontend (página/subpáginas y diseño)

- [ ] **4.1** Decidir estructura final: una página con 4 tabs **o** una página índice + 4 subpáginas.
- [ ] **4.2** Añadir en el **layout del dashboard** (sidebar) un nuevo ítem de navegación, por ejemplo “Archivos” o “Enseñanzas y estudios”, que apunte a `/dashboard/archivos` (o la ruta que elijáis).
- [ ] **4.3** Crear la página (y subpáginas o tabs) que:
  - Llame a la Server Action/API con el identificador de la hoja.
  - Muestre los datos en tablas/tarjetas con el **mismo diseño** de la aplicación (colores, tipografía, responsive, accesibilidad).
- [ ] **4.4** Manejar estados: carga, error (hoja no encontrada, sin permiso, etc.) y vacío. Pensar en móvil: tablas horizontales con scroll o vistas en cards si hay muchas columnas.

### Fase 5: Contenido y mantenimiento

- [ ] **5.1** Documentar en el repo qué columnas/cabeceras tiene cada Sheet para que el frontend sepa qué mostrar (o definir un “contrato” común si las 4 hojas tienen estructura similar).
- [ ] **5.2** Si elegís **lectura + escritura**: mismo Service Account, mismos IDs; en el backend usar `spreadsheets.values.append` (añadir fila), `update` o `batchUpdate` (editar celdas). Los datos añadidos desde la app y desde Drive quedan en el mismo Sheet (sincronización automática al ser la misma hoja).

---

## 5. Resumen técnico: dos caminos

| Aspecto | Solo lectura (enlace público) | Lectura + escritura (sync Drive ↔ app) |
|--------|--------------------------------|----------------------------------------|
| **Fuente de datos** | 4 Google Sheets; “Publicar en la web” (CSV). | 4 Google Sheets; compartidos con Service Account. |
| **Acceso** | URL pública de cada Sheet (guardada en `.env`). `fetch` + parse CSV. | Google Sheets API con Service Account (`client_email` + `private_key` en `.env`). |
| **Editar desde la app** | ❌ No. | ✅ Sí: `append`, `update`, `batchUpdate`. |
| **Sincronización** | Solo ves lo que hay; no escribes. | La hoja es la fuente de verdad: lo que cambies en Drive o en la app se ve en ambos al leer de nuevo. |
| **Dónde en la app** | Misma sección “Archivos” (o similar): una página con 4 tabs o 4 subpáginas. | Igual; además formularios/botones para añadir/editar filas. |
| **Seguridad** | La URL puede ser pública; mejor guardarla en `.env` y usarla solo en servidor. | Credenciales solo en servidor; Server Actions protegidas por autenticación (y opcionalmente por rol). |

---

## 6. Referencias rápidas

- [Google Sheets API (Node.js)](https://developers.google.com/sheets/api/quickstart/nodejs)  
- [Compartir un Sheet con una Service Account](https://stackoverflow.com/questions/34682456/sharing-google-sheet-with-service-account-email)  
- Uso en Next.js: Server Actions o Route Handlers que usen `googleapis` con JWT del Service Account; leer con `spreadsheets.values.get`.  
- IDs de spreadsheet: en la URL `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

Cuando tengáis los 4 Sheets creados/compartidos y el JSON de la Service Account, el siguiente paso sería implementar el módulo de lectura y la primera página (por ejemplo “Estudios Bíblicos”) y luego replicar para las otras 3 con el mismo patrón.

---

## 7. Investigación: lectura + escritura y sincronización

### 7.1 ¿Solo con el enlace (“Publicar en la web”) se puede editar?

**No.** La opción “Publicar en la web” (Archivo → Compartir → Publicar en la web) genera una **URL de solo lectura**. Quien tenga esa URL puede ver los datos (p. ej. en CSV), pero **no puede escribir ni editar** desde esa URL. No existe en Google una forma de “dar el enlace como Editor” y que la aplicación, sin autenticación, escriba en la hoja. Para **escribir** desde la app hace falta autenticación (Service Account u OAuth).

### 7.2 ¿Cómo se puede escribir desde la aplicación?

Para que la app **añada o modifique** datos en el Sheet:

| Método | Lectura | Escritura | Requiere |
|--------|---------|-----------|----------|
| **Publicar en la web** (URL CSV) | ✅ Solo con la URL | ❌ No | Nada |
| **Google Sheets API** (servidor) | ✅ | ✅ | Service Account **o** OAuth |
| **Servicios tipo SheetAPI.dev** | ✅ | ✅ | Compartir la hoja con su SA o subir tu JSON de SA |

- **Service Account (recomendado en servidor):** Creas una cuenta de servicio en Google Cloud, descargas el JSON (`client_email` + `private_key`), compartes cada Sheet con ese `client_email` como Editor. Desde Next.js, con la librería `googleapis`, el servidor lee (`spreadsheets.values.get`) y escribe (`spreadsheets.values.append`, `update`, `batchUpdate`). Sin caducidad de tokens, ideal para backend.
- **OAuth:** El usuario inicia sesión con Google; la app escribe en su nombre. Los tokens caducan y hay que refrescarlos; más lógico cuando cada usuario escribe “en su propia hoja”.
- **SheetAPI.dev (u otros):** Ofrecen una API REST sobre tu Sheet. Por debajo siguen usando una Service Account (la tuya o la de ellos). No evitan la necesidad de “compartir la hoja” con una identidad que pueda escribir.

Conclusión: para **añadir datos desde la aplicación** hace falta usar la **Google Sheets API con autenticación** (en la práctica, Service Account en nuestro backend).

### 7.3 Sincronización: Drive ↔ aplicación

La “base de datos” es la **propia hoja en Google Drive**. No hay dos copias: hay una sola fuente de verdad (el Sheet).

- **Si alguien edita en Google Drive:** La próxima vez que la app **lea** (al cargar la página, al refrescar, o al hacer una nueva petición), obtendrá los datos actuales. No hay “sincronización” extra: leer es siempre “ver el estado actual del Sheet”.
- **Si alguien añade/edita desde la aplicación:** La app llama a la API de escritura (`append`, `update`, etc.). Los cambios se escriben en el mismo Sheet. Quien abra la hoja en Drive (o quien recargue la página en la app) verá esos cambios.

Por tanto: **sí se “sincronizan”** en el sentido de que tanto los cambios hechos en Drive como los hechos desde la app quedan en el mismo Sheet; lo que no hay es “tiempo real” automático: la app ve los cambios de Drive cuando vuelve a leer (p. ej. al recargar o al reabrir la pestaña). Si se quisiera avisar a la app cuando alguien edita en Drive, habría que usar **Drive API “watch”** (webhooks) o hacer polling; para la mayoría de casos, “leer al cargar/refrescar” es suficiente.

### 7.4 Resumen lectura + escritura + sync

| Objetivo | Opción | Qué hacer |
|----------|--------|-----------|
| **Solo ver datos** (sin escribir desde la app) | Publicar en la web | Publicar cada Sheet como CSV, guardar la URL en `.env`, hacer `fetch` a esa URL y parsear. Sin Service Account. |
| **Ver + añadir/editar desde la app** y que todo quede en el mismo Sheet | Sheets API + Service Account | Crear Service Account, compartir cada Sheet con su email como Editor, usar `googleapis` en el servidor para `get` / `append` / `update`. Los cambios en Drive y en la app son los mismos datos. |
| **“Sincronización”** | La hoja es la fuente de verdad | No hay pasos extra: si editas en Drive o desde la app, la próxima lectura ya muestra lo nuevo. Opcional: revalidar cada X segundos o usar Drive watch para notificaciones. |

### 7.5 Referencias (investigación)

- Google Sheets API: lectura y escritura (append, update, batchUpdate) requieren autenticación (Service Account u OAuth).  
- “Publish to web”: solo lectura; no permite escritura desde la API ni desde la URL.  
- Sincronización: la misma hoja; lectura = estado actual; escritura vía API actualiza ese estado.  
- Servicios como SheetAPI.dev: facilitan una API REST pero por detrás usan Service Account; no permiten “solo enlace público” para escribir.
