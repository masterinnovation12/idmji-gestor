/**
 * Bandera de España (sin escudo) — SVG optimizado para tamaños pequeños.
 * Colores oficiales aproximados RY R.
 */
export function FlagSpain({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 3 2" aria-hidden="true" focusable="false">
            <rect width="3" height="0.5" y="0" fill="#AA151B" />
            <rect width="3" height="1" y="0.5" fill="#F1BF00" />
            <rect width="3" height="0.5" y="1.5" fill="#AA151B" />
        </svg>
    )
}
