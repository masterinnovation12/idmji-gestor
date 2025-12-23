import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface SelectContextType {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    triggerRect: DOMRect | null
    setTriggerRect: (rect: DOMRect | null) => void
}

const SelectContext = React.createContext<SelectContextType | null>(null)

export function Select({ value, onValueChange, children }: { value: string, onValueChange: (val: string) => void, children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen, triggerRect, setTriggerRect }}>
            <div className="relative w-full">{children}</div>
        </SelectContext.Provider>
    )
}

export function SelectTrigger({ className, children }: { className?: string, children: React.ReactNode }) {
    const context = React.useContext(SelectContext)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    if (!context) throw new Error("SelectTrigger must be used within Select")

    const handleOpen = () => {
        if (triggerRef.current) {
            context.setTriggerRect(triggerRef.current.getBoundingClientRect())
        }
        context.setOpen(!context.open)
    }

    return (
        <button
            ref={triggerRef}
            type="button"
            onClick={handleOpen}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        >
            <div className="flex items-center gap-2 overflow-hidden truncate">
                {children}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
    )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectValue must be used within Select")
    return <span className="truncate">{context.value || placeholder}</span>
}

export function SelectContent({ className, children }: { className?: string, children: React.ReactNode }) {
    const context = React.useContext(SelectContext)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!context || !mounted) return null

    const style: React.CSSProperties = context.triggerRect ? {
        position: 'fixed',
        top: context.triggerRect.bottom + 4,
        left: context.triggerRect.left,
        width: context.triggerRect.width,
        zIndex: 9999,
    } : {
        position: 'absolute',
        top: '100%',
        left: 0,
        width: '100%',
        zIndex: 50,
    }

    return createPortal(
        <AnimatePresence>
            {context.open && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => context.setOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={style}
                        className={cn(
                            "rounded-xl border bg-white text-zinc-900 shadow-2xl overflow-hidden",
                            className
                        )}
                    >
                        <div className="p-1 max-h-64 overflow-y-auto no-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
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
                "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-9 pr-2 text-sm outline-none hover:bg-zinc-100 transition-colors",
                isSelected ? "bg-zinc-50 font-bold text-blue-600" : "text-zinc-700",
                className
            )}
        >
            {isSelected && (
                <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                </span>
            )}
            {children}
        </div>
    )
}
