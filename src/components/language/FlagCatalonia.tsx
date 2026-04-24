/**
 * Senyera — 5 franges horitzontals (or i vermell) en format apaïsat 3:2,
 * idèntiques proporcions que FlagSpain per a una aparença uniforme als menús.
 */
export function FlagCatalonia({ className }: { className?: string }) {
    const stripes = [
        '#FCDD09',
        '#DA121A',
        '#FCDD09',
        '#DA121A',
        '#FCDD09',
    ] as const
    const stripeH = 2 / stripes.length
    return (
        <svg
            className={className}
            viewBox="0 0 3 2"
            aria-hidden="true"
            focusable="false"
        >
            {stripes.map((fill, i) => (
                <rect
                    key={i}
                    x={0}
                    y={i * stripeH}
                    width={3}
                    height={stripeH + 0.01}
                    fill={fill}
                />
            ))}
        </svg>
    )
}
