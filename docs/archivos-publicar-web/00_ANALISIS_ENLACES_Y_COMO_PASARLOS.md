# Análisis de enlaces (Sheets/Excel) y cómo pasarlos

Documento de análisis de las URLs de exportación CSV de Google Sheets y guía paso a paso para obtener los enlaces y configurar el acceso antes de implementar la funcionalidad "Archivos".

---

## 1. Análisis de los enlaces de Google Sheets

### 1.1 Dos formas de obtener una URL que devuelva CSV

| Origen | URL típica | Cuándo usarla |
|--------|------------|----------------|
| **Publicar en la web** | La que te da Google al pulsar "Publicar" (puede ser tipo `.../pub?output=csv` o `.../export?format=csv&gid=...`) | Recomendada: un solo paso, copiar y pegar. |
| **Construida a mano** | `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={GID}` | Útil si ya tienes el ID y el gid y no quieres usar el diálogo "Publicar en la web". |

- **SPREADSHEET_ID:** está en la URL al abrir el documento:  
  `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
- **GID:** identificador de la pestaña. Al hacer clic en una pestaña, la URL puede cambiar a algo como `...edit#gid=123456789`. El número `123456789` es el **gid**. Si solo hay una hoja, suele ser `0` o un número fijo.

### 1.2 Requisito de acceso para que la URL funcione

- La URL de exportación CSV **no pide login** solo si el documento está expuesto de una de estas formas:
  1. **"Publicar en la web"** (Archivo → Compartir → Publicar en la web): el contenido publicado queda accesible por URL sin iniciar sesión.
  2. **Compartir con "Cualquier persona con el enlace puede ver"**: entonces la URL `.../export?format=csv&gid=...` también puede funcionar sin login (depende del contexto; "Publicar en la web" es el más fiable para nuestro uso).

Si la hoja es **privada** (solo tú o tu organización), al hacer `fetch` a la URL desde el servidor obtendrás **403 Forbidden** o una página de login. Por tanto, para la opción "solo enlace" **tienes que permitir acceso de solo lectura** mediante "Publicar en la web" (recomendado) o compartir con "Cualquier persona con el enlace puede ver".

### 1.3 Formato de la respuesta

- Al pedir la URL con `format=csv`, Google devuelve **texto plano** (CSV): primera fila = cabeceras, resto = filas de datos. Encoding típico **UTF-8**. Nuestra app hará `fetch` a esa URL en el servidor y parseará el CSV a JSON (array de objetos con las cabeceras como claves).

---

## 2. Qué tienes que hacer tú: paso a paso

### 2.1 Comprobar que cada hoja es Google Sheets

- Si hoy son **archivos .xlsx** en Drive: abrirlos con Google Sheets y **Archivo → Guardar como → Google Hoja de cálculo**. Usaremos esas hojas, no los .xlsx.

### 2.2 Publicar cada una de las 4 hojas en la web (recomendado)

Para **cada** una de las 4 (Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico):

1. Abre el documento en **Google Sheets** (en el navegador).
2. Menú **Archivo → Compartir → Publicar en la web** (en algunos idiomas: **Archivo → Compartir en la web**).
3. En el diálogo:
   - **Vínculo:** deja "Toda la hoja de cálculo" o elige la **pestaña concreta** que quieras que vea la app (por ejemplo "Hoja 1" o "Datos").
   - **Formato:** elige **"Valores separados por comas (.csv)"**.
4. Pulsa **"Publicar"** (o "Vincular").
5. Copia la **URL** que te muestra Google (suele ser larga; puede contener `/pub?` o `/export?format=csv&gid=...`).
6. Repite para las otras 3 hojas.

**No hace falta cambiar ningún otro acceso** si usas "Publicar en la web": ese acto ya hace que el contenido elegido sea accesible por URL sin login. No tienes que poner "Cualquier persona con el enlace puede editar"; solo publicar es suficiente para que nuestra app **lea** el CSV.

### 2.3 Cómo pasarme los enlaces

Puedes hacer **una** de estas dos cosas:

- **Opción A:** Pegar aquí en el chat las 4 URLs, con una etiqueta por hoja, por ejemplo:
  - **Estudios Bíblicos:** `https://docs.google.com/...`
  - **Enseñanzas:** `https://docs.google.com/...`
  - **Pastorado:** `https://docs.google.com/...`
  - **Instituto Bíblico:** `https://docs.google.com/...`
- **Opción B:** Añadir tú las URLs en tu `.env.local` con los nombres de variables que te indiquemos (por ejemplo `SHEET_ESTUDIOS_CSV_URL`, …) y decirme: "Ya están en .env.local con los nombres X, Y, Z". Yo no veré el contenido de tu `.env.local`; solo usaremos esos nombres en el código.

En ambos casos, **no subas nunca el archivo `.env.local` a Git** (ya debe estar en `.gitignore`).

### 2.4 Si no quieres "Publicar en la web" y prefieres solo compartir

- Comparte cada Sheet con **"Cualquier persona con el enlace puede ver"** (solo lectura).
- Obtén el **Spreadsheet ID** y el **gid** de la pestaña a mostrar (ver 1.1).
- Pásame los 4 pares (Spreadsheet ID + gid). Construiré la URL así:  
  `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={GID}`  
- Nota: en algunos entornos, la URL `export?format=csv` puede seguir pidiendo login si el documento no está "Publicado en la web". Si ves 403 al probar desde la app, tendrás que usar "Publicar en la web" de todas formas.

---

## 3. Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Tengo que cambiar el acceso al enlace? | Sí: hay que **publicar la hoja en la web** (o compartir "Cualquier persona con el enlace puede ver") para que la URL devuelva CSV sin login. |
| ¿Qué acceso pongo exactamente? | **Archivo → Compartir → Publicar en la web** → elegir pestaña → formato **CSV** → Publicar. No hace falta dar "editar" a nadie. |
| ¿Cómo te paso los enlaces? | Pegando las 4 URLs en el chat con la etiqueta de cada hoja, o poniéndolas tú en `.env.local` y diciéndome los nombres de las variables. |
| ¿Las URLs se suben a Git? | No. Solo se usan en el servidor y se leen desde variables de entorno (`.env.local`), que no se commitea. |

Con esto, cuando tengas las 4 URLs (o los 4 pares ID + gid), se puede seguir con la implementación y con los tests descritos en las fases de esta carpeta.
