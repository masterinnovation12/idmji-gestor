import type { PlanoServiceAccent } from './PlanoServiceStrip'

/** Acentos por turno para los chips de servicio (compartidos por Plano, Generar y Exportar). */
export const PLANO_SERVICE_ACCENT: PlanoServiceAccent = {
    jueves: {
        on: 'bg-linear-to-br from-emerald-500 to-emerald-700 text-white border-transparent shadow-md shadow-emerald-600/35',
        off: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-500/10',
        dot: 'bg-emerald-500',
    },
    domingo: {
        on: 'bg-linear-to-br from-sky-500 to-sky-700 text-white border-transparent shadow-md shadow-sky-600/35',
        off: 'border-sky-500/30 text-sky-700 dark:text-sky-300 hover:border-sky-500/60 hover:bg-sky-500/10',
        dot: 'bg-sky-500',
    },
    domingo_tarde: {
        on: 'bg-linear-to-br from-violet-500 to-violet-700 text-white border-transparent shadow-md shadow-violet-600/35',
        off: 'border-violet-500/30 text-violet-700 dark:text-violet-300 hover:border-violet-500/60 hover:bg-violet-500/10',
        dot: 'bg-violet-500',
    },
}
