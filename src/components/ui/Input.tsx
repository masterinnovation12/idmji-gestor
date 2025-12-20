import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: ReactNode
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {icon}
                    </div>
                )}
                <input
                    className={cn(
                        'w-full bg-background/50 border border-border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 transition-all',
                        icon && 'pl-10',
                        error && 'border-red-500 focus:ring-red-500/50',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-sm text-red-500 ml-1">{error}</p>
            )}
        </div>
    )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export function TextArea({ label, error, className, ...props }: TextAreaProps) {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium ml-1">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    'w-full bg-background/50 border border-border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none',
                    error && 'border-red-500 focus:ring-red-500/50',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-500 ml-1">{error}</p>
            )}
        </div>
    )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: Array<{ value: string | number; label: string }>
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium ml-1">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    'w-full bg-background/50 border border-border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 transition-all',
                    error && 'border-red-500 focus:ring-red-500/50',
                    className
                )}
                {...props}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="text-sm text-red-500 ml-1">{error}</p>
            )}
        </div>
    )
}
