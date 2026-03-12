# Fase 2 – Configuración del proyecto

Configuración de variables de entorno y documentación para la funcionalidad Archivos (URLs CSV, sin credenciales Google).

---

## Objetivo

Tener en el proyecto las 4 URLs de exportación CSV (o los 4 pares Spreadsheet ID + gid) configuradas de forma segura y documentada, sin exponerlas al cliente.

---

## Checklist de implementación

- [x] **2.1** Añadir en `.env.local` las variables (no commitear el archivo): `SHEET_ENSENANZAS_CSV_URL`, `SHEET_ESTUDIOS_CSV_URL`, `SHEET_INSTITUTO_CSV_URL`, `SHEET_PASTORADO_CSV_URL`.
- [x] **2.2** Crear o actualizar `.env.example` con los **nombres** de las variables y un comentario (sin valores reales).
- [x] **2.3** Verificar que `.env.local` y `.env*.local` están en `.gitignore`.
- [x] **2.4** (Si se usan IDs en lugar de URLs) documentar el formato: `SHEET_*_SPREADSHEET_ID` y `SHEET_*_GID` para construir la URL en código. *(No aplica: se usan URLs directas.)*

---

## Tests senior – Configuración

### CFG-1. Variables solo en servidor

- **Acción:** Comprobar que las variables de las URLs **no** llevan el prefijo `NEXT_PUBLIC_`.
- **Esperado:** Las URLs nunca se envían al cliente; solo el servidor (Server Actions / API routes) las usa para hacer `fetch`. Si alguna llevara `NEXT_PUBLIC_`, quedaría expuesta en el bundle del cliente.

### CFG-2. .env.local ignorado por Git

- **Acción:** Ejecutar `git status` con `.env.local` existente y con valores.
- **Esperado:** `.env.local` no aparece como archivo a añadir. Si aparece, debe estar listado en `.gitignore`.

### CFG-3. .env.example sin secretos

- **Acción:** Revisar `.env.example`.
- **Esperado:** Contiene solo nombres de variables y comentarios (ej. `# URL CSV pública del Sheet de Estudios Bíblicos`). Ninguna URL real ni dato sensible.

### CFG-4. Validación en runtime (opcional)

- **Acción:** En el módulo que lee las URLs, comprobar que existen en `process.env` antes de hacer `fetch`.
- **Esperado:** Si falta alguna variable, el servidor devuelve un error claro (no un fallo genérico de “undefined”) y no hace petición a una URL vacía.

### CFG-5. Documentación para otros entornos

- **Acción:** Cualquier desarrollador que clone el repo pueda saber qué variables necesita para Archivos.
- **Esperado:** `.env.example` o un README en `docs/archivos-publicar-web/` indica los 4 nombres de variables y que deben ser URLs CSV públicas (o ID + gid).

---

## Criterios de aceptación de la fase

- Las 4 variables están definidas en `.env.local` con URLs (o IDs) válidas.
- `.env.example` documenta los nombres sin valores.
- Ninguna URL se expone al cliente (CFG-1, CFG-2).
- El backend puede leer las variables en runtime (y opcionalmente validar su presencia).
