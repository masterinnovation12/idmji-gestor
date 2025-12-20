# Guía de Despliegue en Vercel

¡Tu proyecto está listo para producción! Sigue estos pasos sencillos:

## 1. Conectar con GitHub
Como ya hemos subido todo el código a GitHub (`masterinnovation12/idmji-gestor`), el despliegue es automático.

1.  Ve a [Vercel.com](https://vercel.com) e inicia sesión.
2.  Haz clic en **"Add New..."** -> **"Project"**.
3.  Selecciona **"calib-b"** (o tu cuenta de GitHub).
4.  Busca el repositorio `idmji-gestor` y dale a **"Import"**.

## 2. Configurar Variables de Entorno
En la pantalla de configuración de Vercel (antes de darle a Deploy), despliega la sección **"Environment Variables"**.
Debes añadir las mismas que tienes en tu archivo `.env.local`:

| Variable | Valor (Copiar de tu .env local) |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dcjqjsmyydqpsmxbkhya.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Tu clave anon pública)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Tu clave service_role secreta)* |

> **Importante:** Sin estas variables, la app no funcionará en la nube.

## 3. Desplegar
Dale al botón **"Deploy"**. Vercel construirá el proyecto (igual que hicimos el test local) y en unos minutos tendrás tu URL pública (ej: `idmji-gestor.vercel.app`).

---

**Estado del Código:**
- ✅ **Build Local:** Pasado exitosamente.
- ✅ **Git:** Sincronizado con la rama `main`.
- ✅ **Base de Datos:** Estructura de Biblia, Himnos y Coros optimizada.
