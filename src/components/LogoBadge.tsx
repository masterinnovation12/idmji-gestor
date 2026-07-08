'use client'

import NextImage from 'next/image'

/** Degradado dorado oficial (mismo que splash PWA, export y login). */
export const LOGO_BADGE_GOLD_GRADIENT =
    'linear-gradient(135deg, #b68f2f 0%, #e3cc92 42%, #d4b86a 58%, #b68f2f 100%)'

interface LogoBadgeProps {
    /** Lado exterior del badge en px. */
    size: number
    className?: string
    priority?: boolean
    alt?: string
}

/**
 * Logo IDMJI dentro del marco dorado de marca: degradado dorado exterior,
 * interior blanco redondeado y logo centrado. Mismo lenguaje visual que el
 * splash PWA, el badge del login y las cabeceras de exportación.
 */
export function LogoBadge({ size, className = '', priority = false, alt = 'IDMJI' }: LogoBadgeProps) {
    const pad = Math.max(2, Math.round(size * 0.055))
    const radius = Math.round(size * 0.2)
    return (
        <div
            className={`relative shrink-0 ${className}`}
            style={{
                width: size,
                height: size,
                padding: pad,
                borderRadius: radius,
                background: LOGO_BADGE_GOLD_GRADIENT,
                boxShadow: '0 6px 18px rgba(184,150,74,0.35), 0 1px 4px rgba(15,23,42,0.14)',
            }}
        >
            <div
                className="flex h-full w-full items-center justify-center overflow-hidden bg-white"
                style={{ borderRadius: Math.max(2, radius - pad) }}
            >
                <NextImage
                    src="/logo.jpg"
                    alt={alt}
                    width={size}
                    height={size}
                    className="h-[92%] w-[92%] object-contain"
                    priority={priority}
                />
            </div>
        </div>
    )
}
