import { Culto, LecturaBiblica } from '@/types/database'

export interface CultoDetails {
    lecturaData: { showAddButton: boolean; lecturaIntro: LecturaBiblica | null; lecturaFinal: LecturaBiblica | null } | null
    temaIntroduccionAlabanza: string | null
    estudioBiblicoData: {
        esEstudio: boolean
        /** Protocolo + inicio confirmados (switch padre en detalle del culto) */
        configuracionDefinida: boolean
        protocoloDefinido: boolean
        oracionInicio: boolean
        congregacionPie: boolean
        inicioAnticipadoDefinido: boolean
        inicioAnticipado: { activo: boolean; minutos: number; horaReal: string; observaciones?: string } | null
    } | null
    observacionesData: string
    /** Nota específica para quien hace la introducción (texto plano con **negrita** y saltos de línea). */
    observacionesIntroduccion: string
    /** Nota específica para quien hace la finalización (texto plano con **negrita** y saltos de línea). */
    observacionesFinalizacion: string
    /** Nota específica para quien hace la enseñanza (texto plano con **negrita** y saltos de línea). */
    observacionesEnsenanza: string
    /** Nota específica para quien hace los testimonios (texto plano con **negrita** y saltos de línea). */
    observacionesTestimonios: string
}

export function computeCultoDetails(culto: Culto | null): CultoDetails {
    // Default empty state
    if (!culto) {
        return {
            lecturaData: null,
            temaIntroduccionAlabanza: null,
            estudioBiblicoData: null,
            observacionesData: '',
            observacionesIntroduccion: '',
            observacionesFinalizacion: '',
            observacionesEnsenanza: '',
            observacionesTestimonios: ''
        }
    }

    const tipoCulto = culto.tipo_culto
    // Handle both 'lecturas' (direct relation) and potentially missing lectures
    const lecturas = ((culto as unknown) as { lecturas?: LecturaBiblica[] }).lecturas || []

    // 1. Lectura Data
    const debeTenerLectura = tipoCulto?.tiene_lectura_introduccion && !tipoCulto?.nombre?.toLowerCase().includes('estudio')
    const lecturaIntro = debeTenerLectura ? lecturas.find((l) => l.tipo_lectura === 'introduccion') : null
    const lecturaFinal = tipoCulto?.tiene_lectura_finalizacion ? lecturas.find((l) => l.tipo_lectura === 'finalizacion') : null

    const lecturaData = {
        showAddButton: !!debeTenerLectura && !lecturaIntro,
        lecturaIntro: lecturaIntro || null,
        lecturaFinal: lecturaFinal || null
    }

    // 2. Estudio Bíblico Data
    let estudioBiblicoData = null
    const esEstudio = tipoCulto?.nombre?.toLowerCase().includes('estudio') || tipoCulto?.nombre?.toLowerCase().includes('biblico') || false

    if (esEstudio) {
        const metaData = culto.meta_data || {}
        const inicioAnticipado = metaData.inicio_anticipado
        let horaReal = culto.hora_inicio?.slice(0, 5) || '19:00'

        if (inicioAnticipado?.activo && culto.hora_inicio) {
            try {
                const [hours, minutes] = culto.hora_inicio.split(':').map(Number)
                const minsBefore = inicioAnticipado.minutos || 5
                let newMins = minutes - minsBefore
                let newHours = hours
                if (newMins < 0) {
                    newMins += 60
                    newHours -= 1
                }
                if (newHours < 0) {
                    newHours += 24
                }
                horaReal = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
            } catch (e) {
                console.error('Error calculating initiation time:', e)
                horaReal = culto.hora_inicio?.slice(0, 5) || '19:00'
            }
        }

        const protocoloDefinido = metaData?.protocolo_definido === true
        const inicioExplicito = metaData?.inicio_anticipado_definido === true
        estudioBiblicoData = {
            esEstudio: true,
            configuracionDefinida: protocoloDefinido,
            protocoloDefinido,
            oracionInicio: metaData?.protocolo?.oracion_inicio ?? true,
            congregacionPie: metaData?.protocolo?.congregacion_pie ?? false,
            inicioAnticipadoDefinido: inicioExplicito || protocoloDefinido,
            inicioAnticipado: inicioAnticipado?.activo ? {
                activo: true,
                minutos: inicioAnticipado.minutos || 5,
                horaReal,
                observaciones: inicioAnticipado.observaciones || ''
            } : null
        }
    }

    // 3. Observaciones Data (general + notas por rol)
    const metaObs = (culto.meta_data as unknown) as {
        observaciones?: string
        observaciones_introduccion?: string
        observaciones_finalizacion?: string
        observaciones_ensenanza?: string
        observaciones_testimonios?: string
    } | null
    const observacionesData = metaObs?.observaciones || ''
    const observacionesIntroduccion = metaObs?.observaciones_introduccion || ''
    const observacionesFinalizacion = metaObs?.observaciones_finalizacion || ''
    const observacionesEnsenanza = metaObs?.observaciones_ensenanza || ''
    const observacionesTestimonios = metaObs?.observaciones_testimonios || ''

    // 4. Tema introducción Alabanza (solo para cultos de Alabanza)
    const esAlabanza = tipoCulto?.nombre?.toLowerCase().includes('alabanza') ?? false
    const temaIntroduccionAlabanza = esAlabanza ? (culto.meta_data?.tema_introduccion_alabanza ?? null) : null

    return {
        lecturaData,
        temaIntroduccionAlabanza,
        estudioBiblicoData,
        observacionesData,
        observacionesIntroduccion,
        observacionesFinalizacion,
        observacionesEnsenanza,
        observacionesTestimonios
    }
}
