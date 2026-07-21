'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ChartAutoWidthProps {
    /** Altura fija del área del gráfico (px). */
    height: number
    className?: string
    /** Render-prop: recibe el ancho medido (>0) y la altura. */
    children: (size: { width: number; height: number }) => ReactNode
}

/**
 * Sustituto de `ResponsiveContainer` de Recharts que mide el ancho con un
 * `ResizeObserver` propio y renderiza el gráfico con `width` numérico explícito.
 *
 * Motivo: en Recharts 3 + React 19, `ResponsiveContainer` mide 0 de ancho al
 * montar en viewport estrecho (móvil) y no se autocorrige hasta un resize real,
 * dejando los gráficos invisibles. Este wrapper vuelve a medir en cada callback
 * del observer (que se dispara al observar y ante cualquier cambio), por lo que
 * siempre acaba con el ancho correcto. Uso:
 *
 *   <ChartAutoWidth height={280}>
 *     {({ width, height }) => (
 *       <BarChart width={width} height={height} data={...}>…</BarChart>
 *     )}
 *   </ChartAutoWidth>
 */
export function ChartAutoWidth({ height, className, children }: Readonly<ChartAutoWidthProps>) {
    const ref = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => {
            const w = Math.round(el.clientWidth)
            setWidth(prev => (prev !== w ? w : prev))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={ref} className={className} style={{ width: '100%', height }}>
            {width > 0 ? children({ width, height }) : null}
        </div>
    )
}
