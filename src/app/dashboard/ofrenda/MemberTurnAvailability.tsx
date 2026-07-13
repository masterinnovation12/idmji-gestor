'use client'

import { Calendar, Sun, Sunset } from 'lucide-react'
import type { MiembroDisponibilidadTurnos } from './ofrendaMemberAvailability'

export interface MemberTurnAvailabilityProps {
    value: MiembroDisponibilidadTurnos
    onChange: (next: MiembroDisponibilidadTurnos) => void
    disabled?: boolean
    color: 'emerald' | 'blue' | 'violet'
    labels: {
        jueves: string
        domManana: string
        domTarde: string
    }
    testIdPrefix?: string
}

export function TurnAvailabilityDots({
    value,
    color,
    testIdPrefix = 'ofrenda-turn-dots',
    compact = false,
}: Readonly<{
    value: MiembroDisponibilidadTurnos
    color: 'emerald' | 'blue' | 'violet'
    testIdPrefix?: string
    compact?: boolean
}>) {
    const onClass =
        color === 'emerald'
            ? 'bg-emerald-500 ring-emerald-500/30'
            : color === 'violet'
                ? 'bg-violet-600 ring-violet-600/30'
                : 'bg-[#1f2e85] ring-[#1f2e85]/30'
    const offClass = 'bg-slate-300 ring-transparent'

    const dots = [
        { key: 'jueves', on: value.puede_jueves },
        { key: 'dom-manana', on: value.puede_domingo_manana },
        { key: 'dom-tarde', on: value.puede_domingo_tarde },
    ] as const

    const dotSize = compact ? 'h-1.5 w-1.5 ring-1 ring-offset-0' : 'h-2 w-2 ring-2 ring-offset-1 ring-offset-background'

    return (
        <span
            className={`inline-flex items-center shrink-0 ${compact ? 'gap-0.5' : 'gap-1'}`}
            data-testid={`${testIdPrefix}-summary`}
            aria-hidden
        >
            {dots.map(d => (
                <span
                    key={d.key}
                    data-testid={`${testIdPrefix}-${d.key}`}
                    className={`rounded-full ${dotSize} ${d.on ? onClass : offClass}`}
                />
            ))}
        </span>
    )
}

/** Una sola fila: Jueves · Dom. mañana · Dom. tarde (sin presets). */
export function MemberTurnAvailability({
    value,
    onChange,
    disabled = false,
    color,
    labels,
    testIdPrefix = 'ofrenda-member-turns',
}: Readonly<MemberTurnAvailabilityProps>) {
    const accent =
        color === 'emerald'
            ? {
                  chipOn: 'bg-emerald-600 text-white border-emerald-600',
                  chipOff: 'bg-white border-black/15 text-slate-500 hover:bg-[#f8f3e8]',
              }
            : color === 'violet'
                ? {
                      chipOn: 'bg-violet-600 text-white border-violet-600',
                      chipOff: 'bg-white border-black/15 text-slate-500 hover:bg-[#f8f3e8]',
                  }
                : {
                      chipOn: 'bg-[#1f2e85] text-white border-[#1f2e85]',
                      chipOff: 'bg-white border-black/15 text-slate-500 hover:bg-[#f8f3e8]',
                  }

    const toggle = (key: keyof MiembroDisponibilidadTurnos) => {
        onChange({ ...value, [key]: !value[key] })
    }

    const turnos: Array<{
        key: keyof MiembroDisponibilidadTurnos
        label: string
        icon: typeof Calendar
    }> = [
        { key: 'puede_jueves', label: labels.jueves, icon: Calendar },
        { key: 'puede_domingo_manana', label: labels.domManana, icon: Sun },
        { key: 'puede_domingo_tarde', label: labels.domTarde, icon: Sunset },
    ]

    return (
        <div
            className="grid grid-cols-3 gap-1.5"
            role="group"
            aria-label={`${labels.jueves}, ${labels.domManana}, ${labels.domTarde}`}
            data-testid={`${testIdPrefix}-chips`}
        >
            {turnos.map(({ key, label, icon: Icon }) => {
                const on = value[key]
                return (
                    <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        data-testid={`${testIdPrefix}-${key}`}
                        aria-pressed={on}
                        onClick={() => toggle(key)}
                        className={`flex items-center justify-center gap-1 min-h-[36px] rounded-lg border px-1 py-1 text-[10px] font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                            on ? accent.chipOn : accent.chipOff
                        }`}
                    >
                        <Icon className="w-3 h-3 shrink-0 opacity-90" aria-hidden />
                        <span className="truncate">{label}</span>
                    </button>
                )
            })}
        </div>
    )
}
