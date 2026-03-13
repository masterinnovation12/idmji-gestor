import { Culto } from '@/types/database'
import { EstudioBiblicoCard } from './EstudioBiblicoCard'
import { StandardCultoCard } from './StandardCultoCard'

export function CultoCardRenderer({ culto, esHoy, currentUserId }: { culto: Culto; esHoy: boolean; currentUserId: string }) {
    if (!culto) return null
    if (!culto.tipo_culto) return <StandardCultoCard culto={culto} esHoy={esHoy} currentUserId={currentUserId} />

    const name = culto.tipo_culto.nombre?.toLowerCase() || ''
    const isEstudio = name.includes('estudio') || name.includes('biblico')

    if (isEstudio) {
        return <EstudioBiblicoCard culto={culto} esHoy={esHoy} currentUserId={currentUserId} />
    }

    return <StandardCultoCard culto={culto} esHoy={esHoy} currentUserId={currentUserId} />
}
