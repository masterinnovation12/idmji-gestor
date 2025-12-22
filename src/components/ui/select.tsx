'use client'

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface SelectContextType {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | null>(null)

export function Select({ value, onValueChange, children }: { value: string, onValueChange: (val: string) => void, children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

export function SelectTrigger({ className, children }: { className?: string, children: React.ReactNode }) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectTrigger must be used within Select")

    return (
        <button
            type="button"
            onClick={() => context.setOpen(!context.open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
        </button>
    )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectValue must be used within Select")

    // Aquí idealmente mapearíamos el value a un label si tuviéramos acceso a los items,
    // pero para este MVP simple mostraremos el value tal cual o el placeholder.
    // Una mejora sería registrar los labels en el contexto.
    return <span>{context.value || placeholder}</span>
}

export function SelectContent({ className, children }: { className?: string, children: React.ReactNode }) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectContent must be used within Select")

    return (
        <AnimatePresence>
            {context.open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => context.setOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className={cn(
                            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md w-full mt-1",
                            className
                        )}
                    >
                        <div className="p-1">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export function SelectItem({ value, children, className }: { value: string, children: React.ReactNode, className?: string }) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectItem must be used within Select")

    const isSelected = context.value === value

    return (
        <div
            onClick={() => {
                context.onValueChange(value)
                context.setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                className
            )}
        >
            {isSelected && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                </span>
            )}
            {children}
        </div>
    )
}
