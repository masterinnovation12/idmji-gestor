# Fase 4 – Frontend

Página Archivos en el dashboard: pestañas por hoja, tabla/cards con datos, polling para actualización automática y diseño responsive.

---

## Objetivo

- Una entrada “Archivos” (o “Hojas”) en el menú del dashboard que lleve a `/dashboard/archivos`.
- Una página con 4 pestañas: Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico.
- Cada pestaña muestra los datos del Sheet correspondiente en tabla (desktop) y en cards o tabla con scroll horizontal (móvil).
- Mientras el usuario está en la página, los datos se actualizan solos cada 30–60 s (polling) sin recargar la página.
- Estados: carga, error y vacío manejados con la misma línea visual del resto del dashboard.

---

## Checklist de implementación

- [x] **4.1** Añadir ítem de navegación en el layout del dashboard (sidebar) con ruta `/dashboard/archivos` (icono FileSpreadsheet, i18n `nav.archivos`).
- [x] **4.2** Crear la ruta `dashboard/archivos/page.tsx` (server: auth + redirect) y `ArchivosClient.tsx` (client: tabs + polling).
- [x] **4.3** Implementar las 4 pestañas; al cambiar de pestaña, cargar los datos de la hoja correspondiente (llamada a `getSheetData`).
- [x] **4.4** Mostrar datos en tabla (desktop) y en cards con botón (móvil); modal de detalle al tocar/clicar una fila (pro y fluido).
- [x] **4.5** Estados: carga (Loader2 + texto), error (AlertCircle + mensaje), vacío (icono + texto).
- [x] **4.6** Polling cada 45 s mientras la página Archivos está visible; actualiza la pestaña activa.
- [x] **4.7** Limpieza del intervalo al desmontar y al cambiar de pestaña (useEffect cleanup).

---

## Tests senior – Frontend

### FE-1. Navegación y permisos

- **Acción:** Usuario autenticado hace clic en “Archivos” en el sidebar.
- **Esperado:** Llega a `/dashboard/archivos` y ve las 4 pestañas. Usuario no autenticado es redirigido a login (o no ve el ítem).

### FE-2. Carga inicial por pestaña

- **Acción:** Abrir la página y hacer clic en cada pestaña.
- **Esperado:** Cada pestaña muestra los datos correctos del Sheet correspondiente (cabeceras y filas). No se mezclan datos de una hoja con otra.

### FE-3. Estados de UI

- **Acción:** Simular carga lenta, error de red y Sheet vacío.
- **Esperado:** Se muestra skeleton/spinner durante la carga; mensaje claro en error; mensaje o tabla vacía cuando no hay filas. Sin pantallas en blanco ni errores no capturados.

### FE-4. Polling

- **Acción:** Dejar la página abierta en una pestaña; en otra pestaña del navegador (o en otro dispositivo), editar el Sheet y añadir una fila. Esperar hasta el siguiente ciclo de polling (30–60 s).
- **Esperado:** La tabla en la app se actualiza sin que el usuario pulse “Actualizar” ni recargue la página.

### FE-5. Cancelación del polling

- **Acción:** Abrir Archivos, esperar a que empiece el polling, luego navegar a otra sección del dashboard (o cerrar la pestaña).
- **Esperado:** No se siguen haciendo peticiones en segundo plano (comprobar en pestaña Network o en logs del servidor). No hay warning de React por actualizar estado en componente desmontado.

### FE-6. Accesibilidad

- **Acción:** Navegar por las pestañas con teclado y con lector de pantalla.
- **Esperado:** Las pestañas son focuseables y tienen nombres accesibles; la tabla o cards tienen encabezados y estructura semántica correcta (thead/tbody, roles ARIA si aplica).

---

## Tests senior – Responsive (desktop y móvil)

### R-1. Desktop (pantalla completa)

- **Acción:** Ver la página en viewport ≥ 1024px (o según breakpoints del proyecto).
- **Esperado:** Tabla legible con todas las columnas visibles o con scroll horizontal controlado; pestañas en una sola fila; espaciado y tipografía coherentes con el resto del dashboard.

### R-2. Móvil (viewport estrecho)

- **Acción:** Ver la página en viewport 375px (y 320px si se soporta).
- **Esperado:** Las pestañas se adaptan (scroll horizontal o wrap); la tabla se convierte en cards por fila o en tabla con scroll horizontal suave. Sin overflow horizontal no deseado en el body. Texto legible sin zoom.

### R-3. Áreas táctiles en móvil

- **Acción:** Usar la página en dispositivo táctil real o emulación.
- **Esperado:** Botones y pestañas tienen área mínima ~44x44px; no hay elementos demasiado juntos que provoquen toques equivocados.

### R-4. Orientación y redimensionado

- **Acción:** Cambiar de portrait a landscape en móvil, o redimensionar la ventana en desktop.
- **Esperado:** El layout se recompone sin roturas; los datos siguen siendo accesibles y legibles.

---

## Criterios de aceptación de la fase

- La sección Archivos es accesible desde el menú y solo para usuarios autenticados.
- Las 4 pestañas muestran los datos correctos y los estados carga/error/vacío están cubiertos.
- El polling actualiza los datos cada 30–60 s y se cancela al salir de la página.
- Diseño responsive: desktop completo y móvil total, con buenas prácticas de adaptación (R-1 a R-4) y accesibilidad (FE-6).
