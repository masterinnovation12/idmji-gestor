'use client'

import { motion } from 'framer-motion'
import type { ElementType, ReactNode } from 'react'

/**
 * PageHero — Encabezado "liquid" premium (marino + dorado)
 *
 * Fuente única de verdad para el hero de las páginas del dashboard.
 * Reúne el tratamiento que antes estaba copy-pasteado en cada página
 * (gradiente marino, borde dorado, glow ámbar y línea dorada superior)
 * para garantizar consistencia visual en móvil y desktop.
 *
 * El componente NO usa i18n: recibe los textos ya traducidos por props
 * (`title`, `subtitle`…) para poder reutilizarse sin acoplarse al idioma
 * y respetar el límite de i18n en SSR.
 *
 * @example
 * <PageHero title={t('festivos.title')} subtitle={t('festivos.subtitle')} />
 *
 * @example  // con acciones a la derecha (buscador, botones, selector)
 * <PageHero title={t('hermanos.title')} subtitle={t('hermanos.desc')} subtitleVariant="line"
 *   actions={<SearchBox />} />
 */

export type PageHeroSubtitleVariant = 'dot' | 'line' | 'none'

export interface PageHeroProps {
    /** Título principal (ya traducido). */
    title: string
    /** Segunda línea del título, resaltada con degradado dorado (estilo Hermanos). */
    titleAccent?: string
    /** Subtítulo / descripción (ya traducido). */
    subtitle?: ReactNode
    /** Estilo del prefijo del subtítulo: punto dorado pulsante, línea dorada, o nada. */
    subtitleVariant?: PageHeroSubtitleVariant
    /** Icono opcional que se muestra en un chip a la izquierda del título. */
    icon?: ElementType
    /** Contenido alineado a la derecha (buscador, botones, selector de año…). */
    actions?: ReactNode
    /** Contenido en línea justo debajo del subtítulo (p. ej. selector inline). */
    children?: ReactNode
    /** Anima la entrada (por defecto true). */
    animate?: boolean
    /** Clases extra para el contenedor. */
    className?: string
    /** data-testid para pruebas. */
    'data-testid'?: string
}

const WRAPPER_CLASS =
    'relative overflow-hidden rounded-[2rem] md:rounded-[3rem] border-2 border-[#b8964a] ' +
    'bg-gradient-to-br from-[#1f2e85] via-[#283593] to-[#151f5c] p-6 md:p-10 shadow-2xl'

function SubtitleRow({
    variant,
    children,
}: Readonly<{ variant: PageHeroSubtitleVariant; children: ReactNode }>) {
    if (variant === 'line') {
        return (
            <p
                className="text-lg md:text-xl text-white/70 font-medium flex items-center gap-3"
                suppressHydrationWarning
            >
                <span className="w-10 h-[2px] bg-[#b8964a]/70 hidden sm:block" />
                {children}
            </p>
        )
    }
    if (variant === 'none') {
        return (
            <p className="text-white/70 font-medium" suppressHydrationWarning>
                {children}
            </p>
        )
    }
    // 'dot'
    return (
        <p
            className="text-white/70 font-bold tracking-wide flex items-center gap-2.5 uppercase text-xs"
            suppressHydrationWarning
        >
            <span className="w-2 h-2 rounded-full bg-[#e3cc92] animate-pulse shrink-0" />
            {children}
        </p>
    )
}

export default function PageHero({
    title,
    titleAccent,
    subtitle,
    subtitleVariant = 'dot',
    icon: Icon,
    actions,
    children,
    animate = true,
    className = '',
    'data-testid': dataTestId = 'page-hero',
}: Readonly<PageHeroProps>) {
    const content = (
        <>
            {/* Glow ámbar */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#b8964a]/25 rounded-full blur-[110px] -translate-y-1/2 translate-x-1/4" />
            {/* Línea dorada superior */}
            <div
                className="absolute inset-x-[8%] top-0 h-0.5 rounded-full"
                style={{
                    background: 'linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)',
                    boxShadow: '0 0 12px rgba(227,204,146,0.6)',
                }}
            />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 space-y-3">
                    <div className="flex items-center gap-4">
                        {Icon && (
                            <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-[rgba(227,204,146,0.35)] flex items-center justify-center">
                                <Icon className="w-6 h-6 md:w-7 md:h-7 text-[#e3cc92]" />
                            </div>
                        )}
                        <h1
                            className={`font-black text-white ${
                                titleAccent
                                    ? 'text-4xl md:text-6xl tracking-tight leading-none'
                                    : 'text-4xl md:text-6xl tracking-tighter'
                            }`}
                            suppressHydrationWarning
                        >
                            {title}
                            {titleAccent && (
                                <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#e3cc92] via-[#d4b86a] to-[#e3cc92]">
                                    {titleAccent}
                                </span>
                            )}
                        </h1>
                    </div>

                    {subtitle && <SubtitleRow variant={subtitleVariant}>{subtitle}</SubtitleRow>}

                    {children}
                </div>

                {actions && <div className="w-full lg:w-auto shrink-0">{actions}</div>}
            </div>
        </>
    )

    if (!animate) {
        return (
            <div className={`${WRAPPER_CLASS} ${className}`} data-testid={dataTestId}>
                {content}
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${WRAPPER_CLASS} ${className}`}
            data-testid={dataTestId}
        >
            {content}
        </motion.div>
    )
}
