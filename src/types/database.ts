/**
 * Definiciones de tipos para la base de datos de IDMJI Gestor de Púlpito.
 * 
 * Este archivo centraliza los tipos de las tablas de Supabase y sus relaciones
 * para asegurar la consistencia en toda la aplicación.
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

export type UserRole = 'ADMIN' | 'EDITOR' | 'USER' | 'SONIDO'

export interface Profile {
    id: string
    nombre: string | null
    apellidos: string | null
    email: string | null
    email_contacto: string | null
    telefono: string | null
    rol: UserRole
    avatar_url: string | null
    pulpito: boolean
    language?: 'es-ES' | 'ca-ES'
    availability?: {
        template?: Record<string, {
            intro?: boolean
            finalization?: boolean
            teaching?: boolean
            testimonies?: boolean
        }>
        exceptions?: Record<string, {
            intro?: boolean
            finalization?: boolean
            teaching?: boolean
            testimonies?: boolean
        }>
    }
    created_at: string
}

export interface CultoType {
    id: string
    nombre: string
    descripcion: string | null
    color: string
    tiene_ensenanza: boolean
    tiene_testimonios: boolean
    tiene_lectura_introduccion: boolean
    tiene_lectura_finalizacion: boolean
    tiene_himnos_y_coros: boolean
    orden: number
}

export interface Culto {
    id: string
    fecha: string
    hora_inicio: string
    hora_fin: string | null
    tipo_culto_id: string
    estado: 'planeado' | 'realizado' | 'cancelado'
    es_festivo: boolean
    es_laborable_festivo: boolean
    id_usuario_intro: string | null
    id_usuario_finalizacion: string | null
    id_usuario_ensenanza: string | null
    id_usuario_testimonios: string | null
    created_at: string

    // Relaciones (Join)
    tipo_culto?: Partial<CultoType>
    usuario_intro?: Partial<Profile> | null
    usuario_finalizacion?: Partial<Profile> | null
    usuario_ensenanza?: Partial<Profile> | null
    usuario_testimonios?: Partial<Profile> | null

    // Metadatos flexibles
    meta_data?: {
        protocolo?: {
            oracion_inicio: boolean
            congregacion_pie: boolean
        }
        inicio_anticipado?: {
            activo: boolean
            minutos: number
            observaciones?: string
        }
    }

    // Plan de himnos/coros (join desde plan_himnos_coros)
    plan_himnos_coros?: Array<{ tipo: string; himno?: { duracion_segundos?: number }; coro?: { duracion_segundos?: number }; [key: string]: unknown }>
}

export interface LecturaBiblica {
    id: string
    culto_id: string
    tipo_lectura: 'introduccion' | 'finalizacion'
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number
    versiculo_fin: number
    id_usuario_lector: string
    es_repetida: boolean
    lectura_original_id: string | null
    created_at: string

    // Relaciones
    lector?: Partial<Profile> | null
}

export interface Himno {
    id: number
    numero: number
    titulo: string
    duracion_segundos: number
}

export interface Coro {
    id: number
    numero: number
    titulo: string
    duracion_segundos: number
}

export interface PlanHimnoCoro {
    id: string
    culto_id: string
    tipo: 'himno' | 'coro'
    item_id: number
    orden: number

    // Relaciones
    himno?: Partial<Himno> | null
    coro?: Partial<Coro> | null
}

export interface Festivo {
    id: number
    fecha: string
    tipo: 'nacional' | 'autonomico' | 'local' | 'laborable_festivo'
    descripcion: string | null
    created_at?: string
    // Campo opcional añadido por getFestivos() con el culto asociado
    culto?: {
        id: string
        hora: string
        tipo: string
    } | null
}

export interface CalendarEvent extends Partial<Culto> {
    id: string
    fecha: string
    hora_inicio: string
}

/** Rol de asignación en un culto (igual que en la UI). */
export type RolInstruccionCulto = 'introduccion' | 'ensenanza' | 'testimonios' | 'finalizacion'

/** Instrucciones por tipo de culto y rol (tabla instrucciones_culto). */
export interface InstruccionCulto {
    id: number
    culto_type_id: number
    rol: RolInstruccionCulto
    titulo_es: string
    titulo_ca: string
    contenido_es: string
    contenido_ca: string
    created_at?: string
    updated_at?: string
}

/** Respuesta para el modal: título y contenido según idioma. */
export interface InstruccionCultoParaUI {
    titulo: string
    contenido: string
}

export interface ActionResponse<T = void> {
    success?: boolean
    error?: string
    data?: T
}
