# Mejora de Lecturas Biblicas (Dashboard + Detalle)

## Objetivo

- Simplificar el registro en movil.
- Mantener coherencia entre `dashboard` y `detalle de culto`.
- Permitir registrar multiples lecturas por tipo (introduccion/finalizacion), incluyendo casos como:
  - `Jueces 1:1`
  - `Jueces 1:5-7`
  - `Jueces 2:1-2`
- Garantizar que historial de lecturas siga reflejando correctamente lo registrado.

## Fase 1 - UX/Visual movil (Selector)

- [x] Quitar barra diagnostica visible al usuario (`Estado/Total/Filtrados/Modo`).
- [x] Mejorar visibilidad de encabezados de testamento con fondo solido sticky.
- [x] Mantener flujo simple: buscar libro -> seleccionar -> completar capitulo/versiculos -> registrar.
- [x] Ajuste de inputs numericos para movil (`inputMode="numeric"`).

## Fase 2 - Logica de guardado sin limite por tipo

- [x] `saveLectura` ya no reemplaza automaticamente por `tipo_lectura`.
- [x] `confirmRepeatedLectura` permite insertar nuevas lecturas y editar por `lecturaId`.
- [x] Soporte de edicion explicita por `lecturaId` para no colisionar con multiples filas del mismo tipo.

## Fase 3 - Consistencia Dashboard / Detalle

- [x] Ambos flujos comparten `AddLecturaModal` + `BibleSelector`.
- [x] En `BibleReadingManager` permitir anadir nuevas lecturas por tipo sin bloquear por "faltante".
- [x] Ajustar modo draft para editar por id y anadir sin sobrescribir por tipo.

## Fase 4 - QA y pruebas senior

- [x] Pruebas de regresion de acciones de lecturas.
- [x] Pruebas de componentes relacionados con cambios previos de culto detail.
- [x] Build exitoso.
- [x] QA navegador en localhost para:
  - [x] ocultar barra diagnostica
  - [x] verificar sticky de "Antiguo Testamento"
  - [x] validar flujo de modal en dashboard
  - [ ] completar evidencia automatizada de varios guardados consecutivos en el mismo culto (quedo pendiente por limitacion del runner en captura de input numerico; validar manual recomendado)

## Checklist de validacion manual recomendada

1. Abrir modal de lectura desde dashboard.
2. Verificar que no aparezca texto de estado diagnostico.
3. Buscar un libro y hacer scroll en lista: encabezado de testamento visible.
4. Registrar 3 lecturas de introduccion del mismo culto (ejemplo de Jueces).
5. Abrir historial y confirmar que salen las 3 entradas.
6. Repetir desde detalle de culto y guardar borrador.

## Notas tecnicas

- No se requirio migracion de base de datos para habilitar multiples lecturas por tipo.
- El historial consume filas de `lecturas_biblicas`, por lo que refleja naturalmente registros multiples.
- Riesgo residual: si existe una restriccion unica en DB (no detectada en este repo) sobre `(culto_id, tipo_lectura)`, habria que removerla via migracion.
