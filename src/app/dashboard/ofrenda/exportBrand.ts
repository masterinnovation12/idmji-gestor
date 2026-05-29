/**
 * Identidad visual para exportaciones Labor Ofrenda.
 * Alineado con https://idmji.org/ (BeTheme: navy #1f2e85, dorado #b8964a, Montserrat).
 * Complementado con la paleta del gestor (azul vibrante) en acentos secundarios.
 */
export const IDMJI_BRAND = {
    fontFamily: '"Montserrat", "Segoe UI", system-ui, Helvetica, Arial, sans-serif',
    fontUrl:
        'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap',
    /** Cabecera institucional (idmji.org) */
    navy: '#1f2e85',
    navyDark: '#151f5c',
    /** Acento dorado oficial */
    gold: '#b8964a',
    goldLight: '#d4b86a',
    goldPale: '#f8f3e8',
    goldGradient: 'linear-gradient(90deg, #b68f2f 0%, #e3cc92 50%, #b68f2f 100%)',
    headerGradient: 'linear-gradient(135deg, #1f2e85 0%, #283593 55%, #151f5c 100%)',
    /** Enlaces / acento digital */
    blueBright: '#0a79db',
    /** Fondos */
    pageBg: '#eef1f6',
    surface: '#ffffff',
    /** Texto */
    text: '#1a1a1a',
    textSecondary: '#555555',
    textMuted: '#7a7a7a',
    textOnNavy: '#ffffff',
    textGold: '#c9a227',
    /** Bordes y neutros */
    border: '#d5d5d5',
    borderLight: '#e8ecf1',
    tableMeta: '#1f2937',
} as const

export type ServiceExportKey = 'jueves' | 'domingo' | 'domingo_tarde'

export const SERVICE_EXPORT_COLORS: Record<
    ServiceExportKey,
    {
        headerBg: string
        seqBg: string
        seqText: string
        badgeTxt: string | null
        badgeBg: string | null
        labelBgEven: string
        labelBgOdd: string
        labelText: string
    }
> = {
    jueves: {
        headerBg: '#1a6b52',
        seqBg: '#e8f5f0',
        seqText: '#0d5c44',
        badgeTxt: null,
        badgeBg: null,
        labelBgEven: '#edf8f3',
        labelBgOdd: '#d4ede3',
        labelText: '#0d5c44',
    },
    domingo: {
        headerBg: IDMJI_BRAND.navy,
        seqBg: '#e8eef8',
        seqText: '#1f2e85',
        badgeTxt: 'Mañana',
        badgeBg: '#dbeafe',
        labelBgEven: '#eef2fa',
        labelBgOdd: '#dce4f5',
        labelText: '#1f2e85',
    },
    domingo_tarde: {
        headerBg: '#4a3278',
        seqBg: '#f3effa',
        seqText: '#4a3278',
        badgeTxt: 'Tarde',
        badgeBg: '#ede9fe',
        labelBgEven: '#f5f0fc',
        labelBgOdd: '#ebe3f8',
        labelText: '#4a3278',
    },
}

export const EXPORT_CELL = {
    bodyEven: '#fafbfc',
    bodyOdd: '#f3f5f8',
    /** Línea divisoria entre grupo roles/colaboradores */
    divider: IDMJI_BRAND.navyDark,
    /** Separador de semana: navy sutil — visual sin ruido */
    weekBorder: 'rgba(31,46,133,0.22)',
    /** Borde interno de celda: casi invisible */
    cellBorder: '#eaecf2',
} as const
