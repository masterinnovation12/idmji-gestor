# Archivos (hojas) – Publicar en la web

Carpeta de la funcionalidad **Archivos**: mostrar en la aplicación los datos de 4 Google Sheets (Estudios Bíblicos, Enseñanzas, Pastorado, Instituto Bíblico) usando solo las URLs de "Publicar en la web" (CSV), con actualización automática por polling (opción B).

---

## Índice de documentos

| Documento | Contenido |
|-----------|-----------|
| **00_ANALISIS_ENLACES_Y_COMO_PASARLOS.md** | Análisis de las URLs de exportación CSV, requisitos de acceso y **guía paso a paso** para obtener y pasar los enlaces. |
| **LOGICA_PARSER_CSV_ADAPTATIVO.md** | Reglas del parser: cabecera = primera fila no vacía; no mostrar filas ni columnas totalmente vacías; adaptación automática a nuevas columnas/filas en el Sheet. |
| **Fase_01_Preparacion_Enlaces.md** | Fase 1: preparación y enlaces. Criterios de aceptación y tests senior (fuente de datos / CSV). |
| **Fase_02_Configuracion.md** | Fase 2: configuración del proyecto. Variables de entorno. Tests senior de configuración. |
| **Fase_03_Backend.md** | Fase 3: backend (fetch CSV, parse, Server Actions). Tests senior backend y fuente de datos. |
| **Fase_04_Frontend.md** | Fase 4: frontend (página, pestañas, tabla/cards, polling). Tests senior frontend y adaptación móvil. |
| **Fase_05_Comprobaciones_Responsive.md** | Fase 5: comprobaciones finales. Tests senior responsive (desktop completo y móvil total), E2E y accesibilidad. |

---

## Orden de trabajo

1. Leer **00_ANALISIS_ENLACES_Y_COMO_PASARLOS.md** y obtener las 4 URLs (o 4 pares ID + gid).
2. Seguir las fases 1 → 5 en orden; cada fase incluye checklist y tests de nivel senior (backend, base de datos/fuente CSV, frontend, responsive).
3. Implementación en **local** primero; después subir a remoto cuando todo pase las comprobaciones.

Plan general: **docs/PLAN_ARCHIVOS_PUBLICAR_WEB.md**.
