# IDMJI Gestor de Púlpito

PWA moderna para la gestión de cultos y asignaciones de púlpito de la IDMJI Sabadell.

## 🚀 Tecnologías

- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS 4
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Animaciones:** Framer Motion
- **Iconos:** Lucide React
- **Fechas:** date-fns

## 📦 Instalación

```bash
# Clonar el repositorio
cd web

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev

# Build de producción
npm run build
npm start
```

## 🔧 Variables de Entorno

Crear archivo `.env.local` en la carpeta `web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## 📁 Estructura del Proyecto

```
web/
├── src/
│   ├── app/                    # Rutas de Next.js
│   │   ├── (auth)/            # Grupo de rutas de autenticación
│   │   ├── dashboard/         # Dashboard protegido
│   │   ├── api/               # API routes
│   │   └── auth/              # Callbacks de auth
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes UI reutilizables
│   │   ├── Calendar.tsx
│   │   ├── UserSelector.tsx
│   │   └── AssignmentsManager.tsx
│   ├── lib/                   # Utilidades y configuración
│   │   ├── supabase/          # Clientes de Supabase
│   │   ├── constants.ts       # Constantes de la app
│   │   ├── helpers.ts         # Funciones helper
│   │   ├── errors.ts          # Manejo de errores
│   │   ├── validations.ts     # Esquemas de validación
│   │   └── utils.ts           # Utilidades generales
│   ├── hooks/                 # Custom hooks
│   │   └── use-debounce.ts
│   ├── types/                 # Definiciones de TypeScript
│   │   └── database.ts
│   └── data/                  # Datos estáticos
│       ├── Coros.csv
│       └── Himnos.csv
└── public/                    # Archivos estáticos
    ├── manifest.json
    └── logo.jpeg
```

## 🎯 Funcionalidades

### ✅ Implementadas

- **Autenticación**
  - Login/Registro
  - Recuperación de contraseña
  - Protección de rutas con middleware
  - Gestión de sesiones con Supabase

- **Dashboard**
  - Vista general con estadísticas
  - Navegación lateral colapsable
  - Diseño responsive

- **Gestión de Cultos**
  - Calendario interactivo mensual
  - Generación automática de cultos (Mar/Jue/Dom)
  - Vista detallada de cada culto
  - Asignación de hermanos (Intro/Enseñanza/Finalización)
  - Búsqueda de hermanos en tiempo real

- **Perfil de Usuario**
  - Vista y edición de información personal
  - Avatar con gradiente
  - Preferencias de usuario

### 🚧 Pendientes

- Selector de Lecturas Bíblicas
- Selector de Himnos y Coros
- Detección de lecturas repetidas
- Dashboard de estadísticas
- Gestión de festivos
- Panel de administración
- Service Worker para offline
- Modo oscuro funcional

## 🗄️ Base de Datos

### Tablas Principales

- `profiles` - Perfiles de usuario
- `cultos` - Servicios programados
- `culto_types` - Tipos de culto
- `lecturas_biblicas` - Lecturas asignadas
- `himnos` - Catálogo de himnos
- `coros` - Catálogo de coros
- `plan_himnos_coros` - Selección por culto
- `festivos` - Días festivos
- `movimientos` - Auditoría

### Seed de Datos

Para cargar los himnos y coros iniciales:

```bash
# Con el servidor corriendo, navegar a:
http://localhost:3000/api/seed
```

Esto cargará:
- 250 himnos desde `Himnos.csv`
- 173 coros desde `Coros.csv`

## 🎨 Diseño

### Paleta de Colores

```css
--primary: hsl(262, 83%, 58%)    /* Púrpura */
--secondary: hsl(199, 89%, 48%)  /* Cyan */
--accent: hsl(330, 81%, 60%)     /* Magenta */
```

### Características Visuales

- Glassmorphism con `backdrop-filter`
- Gradientes mesh de fondo
- Animaciones suaves con Framer Motion
- Micro-interacciones en hover
- Scrollbar personalizado
- Fuente Inter de Google Fonts

## 📝 Convenciones de Código

### Componentes

- Usar TypeScript con tipos explícitos
- Componentes funcionales con hooks
- Props interface antes del componente
- Exportar como default para páginas
- Exportar como named para componentes reutilizables

### Archivos

- PascalCase para componentes: `UserSelector.tsx`
- camelCase para utilidades: `helpers.ts`
- kebab-case para CSS: `globals.css`

### Imports

```typescript
// 1. React y Next.js
import { useState } from 'react'
import Link from 'next/link'

// 2. Librerías externas
import { motion } from 'framer-motion'
import { User } from 'lucide-react'

// 3. Internos - absolutos con @/
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
```

### Server Actions

- Siempre usar `'use server'` al inicio
- Retornar `ActionResponse<T>` para consistencia
- Manejar errores con try-catch
- Revalidar paths después de mutaciones

```typescript
'use server'

export async function updateProfile(data: FormData): Promise<ActionResponse> {
  try {
    // Lógica
    revalidatePath('/dashboard/profile')
    return { success: true }
  } catch (error) {
    return { error: formatError(error) }
  }
}
```

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén configurados)
npm test

# Lint
npm run lint

# Type check
npm run type-check
```

## 📚 Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a la IDMJI Sabadell.

## 👥 Contacto

IDMJI Sabadell - Iglesia de Dios Ministerial de Jesucristo Internacional

---

**Versión:** 0.1.0  
**Última actualización:** Diciembre 2025
