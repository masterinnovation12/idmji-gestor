"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
    className?: string
    min?: number
    max?: number
    step?: number
    value?: number[]
    onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, min = 0, max = 100, step = 1, value = [0], onValueChange, ...props }, ref) => {

        // Simplificación: Asumimos un solo valor para este uso
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = parseFloat(e.target.value)
            onValueChange?.([val])
        }

        return (
            <input
                type="range"
                className={cn(
                    "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                    className
                )}
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={handleChange}
                ref={ref}
                {...props}
            />
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
