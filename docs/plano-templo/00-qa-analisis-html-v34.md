# QA — Análisis del HTML recibido (`plano_png_interactivo_roles_v34 (1).html`)

> Análisis estrictamente de **lo que se ve** en el archivo (5.774.176 bytes, recibido 11/06/2026).

## 1. Qué es

Aplicación standalone de un solo archivo HTML/CSS/JS (sin frameworks ni dependencias externas)
que muestra un plano isométrico del Templo de Sabadell (PNG 1448×1086 embebido en base64) con
**16 tarjetas arrastrables** sobre él, una por persona.

### Contenido visual de la imagen base

- 8 bloques de asientos coloreados y numerados: fila trasera **8·7·6·5** y fila delantera
  **4·3·2·1** (numeración de derecha a izquierda, el 1 queda delante-derecha junto al púlpito).
- **16 muñequitos** (figuras de persona) **integrados en el PNG**, uno a cada lado de cada
  bloque, con el color del bloque.
- Púlpito, flores, almacén "alfolid", puertas y altavoces decorativos.
- Los números de bloque también están **pintados dentro del PNG** (no son editables).

### Modelo de datos embebido (`defaultPeople`)

16 personas `P01…P16`, cada una con: `id`, `block` (1–8), `side` (Izq/Der), `role`
(Ofrendario/Apoyo), `roleLabel` (texto visible, ej. "8- Apoyo"), `name`, `color` (hex del
bloque), `anchorX/Y` y `x/y` (coordenadas en px sobre el lienzo natural 1448×1086).

## 2. Funcionalidad observada

| Función | Detalle |
|---|---|
| Pan/zoom | 1 dedo pan, 2 dedos pinch, rueda con zoom al cursor, botones +/− y "Ajustar". Clamp de límites y persistencia de la vista. |
| Tarjetas | Drag con Pointer Events (franja de color como asa), textarea de nombre máx. 2 líneas con ancho auto-calculado (112–170 px), wrap con elipsis medido con canvas. |
| Editor lateral | Panel con filas ordenadas 1→8 (Apoyo antes que Ofrendario), inputs de "texto superior" y nombre sincronizados bidireccional con las tarjetas. |
| Doble clic en franja | `prompt()` nativo para editar el texto superior. |
| Persistencia | `localStorage` (clave `sabadell_png_interactivo_v34_editor_orden_1_a_8` + vista en clave `v27`). |
| Export | PNG 2× (redibuja tarjetas en canvas sobre la imagen), JSON (config completa), CSV (id, bloque, lado, textos, x, y). Import JSON con merge por `id`. |
| Acciones | Guardar, limpiar nombres, reset textos, reset posiciones, ocultar tarjetas. |
| Móvil | <900 px: editor como bottom-sheet con asa, drag-to-dismiss con velocidad, backdrop blur, `safe-area-inset`, botones táctiles ≥44 px. |
| A11y | `aria-label`s, Escape cierra el sheet, `prefers-reduced-motion` respetado. |

## 3. Lo que está bien (a conservar en la integración)

- **Coordenadas relativas al lienzo natural** (1448×1086) convertidas a `%` — las tarjetas se
  mantienen ancladas al plano con cualquier zoom/resize. Patrón correcto, se portará tal cual.
- Motor de gestos pan/pinch propio sólido (clamp, zoom centrado en el puntero/pellizco).
- Auto-ancho de tarjeta + wrap a 2 líneas con medición real de texto (canvas `measureText`).
- Escapado XSS correcto (`esc()`) en todo HTML inyectado.
- Bottom-sheet móvil con física de arrastre (umbral 90 px o velocidad >0,65) — UX cuidada.
- Export PNG con redibujado fiel en canvas a 2× (no screenshot del DOM).
- `prefers-reduced-motion`, `safe-area`, `touch-action:none` bien aplicados.

## 4. Hallazgos / riesgos (QA)

| # | Severidad | Hallazgo |
|---|---|---|
| H1 | Alta | **La imagen base está embebida DOS veces** (en `<img src>` y en la constante `BG_SRC` para el export): ~2,87 MB × 2 ≈ 5,7 MB del archivo. En la integración la imagen debe servirse una vez como asset estático/SVG. |
| H2 | Alta | **Muñequitos y números de bloque pintados en el PNG**: no se pueden mover, editar ni ocultar, y hace imposible el modo jueves (4 bloques) sin otra foto. Es exactamente lo que se pide cambiar. |
| H3 | Alta | **No existe modo 4 sacos**: las 16 personas y los 8 bloques están hardcodeados. Jueves/domingo tarde requieren disposición de 4 bloques. |
| H4 | Alta | **Persistencia solo en `localStorage`**: por navegador, sin multiusuario, sin permisos, se pierde al limpiar el navegador. Incompatible con el modelo del gestor (Supabase + RLS). |
| H5 | Media | **Inconsistencias `role` vs `roleLabel`** en los datos por defecto: `P07` es `role:"Apoyo"` pero `roleLabel:"5- Ofrendario"`; `P08`, `P15` y `P16` igual de cruzados. Además el lado del Ofrendario no es uniforme (bloques 2 y 6 lo tienen a la izquierda; el resto a la derecha). Hay que definir la fuente de verdad al migrar. |
| H6 | Media | **Diálogos nativos** `prompt()/alert()/confirm()` — rompen el estilo premium; en el gestor se sustituyen por `OfrendaLiquidShell` + `ofrendaFeedback`. |
| H7 | Baja | Claves de `localStorage` con versiones mezcladas (estado `v34`, vista `v27`) — síntoma de iteraciones rápidas; irrelevante tras migrar a Supabase. |
| H8 | Baja | Export PNG usa fuente Arial mientras la UI usa Inter — ligera divergencia visual entre pantalla y export. |
| H9 | Baja | Sin control de acceso: cualquiera con el archivo edita todo. En el gestor: solo `ADMIN`/`EDITOR`. |
| H10 | Info | El título mezcla "V27"/"V34" y el archivo ha tenido ≥20 versiones en Downloads — confirma que el HTML es un prototipo iterativo, no un producto final. |

## 5. Conclusión

El HTML es un **prototipo funcional muy bueno como especificación de UX** (gestos, tarjetas,
bottom-sheet, export) pero no apto para incorporarse tal cual: imagen duplicada, datos
hardcodeados a 8 bloques, muñequitos/números no editables, sin persistencia real ni permisos.

**Estrategia**: portar los patrones buenos (coordenadas %, gestos, tarjetas auto-ancho,
bottom-sheet) a un componente React del módulo Ofrenda, sustituir el PNG por capa editable
(muñequitos SVG + números como elementos propios), y conectar a Supabase. Ver
[01-arquitectura-integracion.md](./01-arquitectura-integracion.md).
