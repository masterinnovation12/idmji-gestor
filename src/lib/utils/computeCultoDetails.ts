import { Culto } from '@/types/database'

export interface CultoDetails {
    lecturaData: { showAddButton: boolean; lecturaIntro: any; lecturaFinal: any } | null
    estudioBiblicoData: {
        esEstudio: boolean
        oracionInicio: boolean
        congregacionPie: boolean
        inicioAnticipado: { activo: boolean; minutos: number; horaReal: string; observaciones?: string } | null
    } | null
    observacionesData: string
}

export function computeCultoDetails(culto: Culto | null): CultoDetails {
    // Default empty state
    if (!culto) {
        return {
            lecturaData: null,
            estudioBiblicoData: null,
            observacionesData: ''
        }
    }

    const tipoCulto = culto.tipo_culto
    // Handle both 'lecturas' (direct relation) and potentially missing lectures
    const lecturas = (culto as any).lecturas || []

    // 1. Lectura Data
    const debeTenerLectura = tipoCulto?.tiene_lectura_introduccion && !tipoCulto?.nombre?.toLowerCase().includes('estudio')
    const lecturaIntro = debeTenerLectura ? lecturas.find((l: any) => l.tipo_lectura === 'introduccion') : null
    const lecturaFinal = tipoCulto?.tiene_lectura_finalizacion ? lecturas.find((l: any) => l.tipo_lectura === 'finalizacion') : null

    const lecturaData = {
        showAddButton: !!debeTenerLectura && !lecturaIntro,
        lecturaIntro: lecturaIntro || null,
        lecturaFinal: lecturaFinal || null
    }

    // 2. Estudio Bíblico Data
    let estudioBiblicoData = null
    const esEstudio = tipoCulto?.nombre?.toLowerCase().includes('estudio') || tipoCulto?.nombre?.toLowerCase().includes('biblico') || false

    if (esEstudio) {
        const metaData = culto.meta_data as any
        const inicioAnticipado = metaData?.inicio_anticipado
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

        estudioBiblicoData = {
            esEstudio: true,
            oracionInicio: metaData?.protocolo?.oracion_inicio ?? true,
            congregacionPie: metaData?.protocolo?.congregacion_pie ?? false,
            inicioAnticipado: inicioAnticipado?.activo ? {
                activo: true,
                minutos: inicioAnticipado.minutos || 5,
                horaReal,
                observaciones: inicioAnticipado.observaciones || ''
            } : null
        }
    }

    // 3. Observaciones Data
    const observacionesData = (culto.meta_data as any)?.observaciones || ''

    return {
        lecturaData,
        estudioBiblicoData,
        observacionesData
    }
}
