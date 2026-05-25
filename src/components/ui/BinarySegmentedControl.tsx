'use client'

import { cn } from '@/lib/utils'

export type BinarySegmentOption<T extends string | boolean> = {
    value: T
    label: string
}

type BinarySegmentedControlProps<T extends string | boolean> = {
    label: string
    value: T
    options: [BinarySegmentOption<T>, BinarySegmentOption<T>]
    onChange: (value: T) => void
    className?: string
}

export function BinarySegmentedControl<T extends string | boolean>({
    label,
    value,
    options,
    onChange,
    className,
}: BinarySegmentedControlProps<T>) {
    return (
        <div className={cn('flex flex-col gap-1.5 min-w-0 w-full', className)}>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                {label}
            </span>
            <div
                role="radiogroup"
                aria-label={label}
                className="inline-flex w-full max-w-full p-0.5 sm:p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80"
            >
                {options.map((opt) => {
                    const selected = opt.value === value
                    return (
                        <button
                            key={String(opt.value)}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                'flex-1 min-w-0 px-2 sm:px-2.5 py-1.5 sm:py-1.5 rounded-[10px] font-black text-[10px] sm:text-xs uppercase tracking-widest leading-tight transition-all touch-manipulation text-center',
                                selected
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 active:scale-[0.98]'
                            )}
                        >
                            <span className="block truncate">{opt.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
