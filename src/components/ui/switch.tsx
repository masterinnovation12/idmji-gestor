'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, onCheckedChange, checked, ...props }, ref) => {
        // Si className contiene 'pulpito-blue', usar colores azul/gris claro
        const isPulpitoSwitch = className?.includes('pulpito-blue')
        const bgColor = isPulpitoSwitch 
            ? (checked ? 'bg-blue-600' : 'bg-zinc-300')
            : (checked ? 'bg-primary' : 'bg-zinc-300')
        
        const labelClasses = isPulpitoSwitch 
            ? className?.replace('pulpito-blue', '').trim() || ''
            : className
        
        return (
            <label className={cn("relative inline-flex items-center cursor-pointer", labelClasses)}>
                <input
                    type="checkbox"
                    className="sr-only peer"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    {...props}
                />
                <div className={cn(
                    "w-11 h-6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                    bgColor
                )}></div>
            </label>
        )
    }
)
Switch.displayName = "Switch"

export { Switch }
