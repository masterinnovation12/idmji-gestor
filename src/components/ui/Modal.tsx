import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: ReactNode
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    keyPrefix?: string
}

// Helper to detect if we're on the client
function subscribe() { return () => { } }
function getSnapshot() { return true }
function getServerSnapshot() { return false }

export function Modal({ isOpen, onClose, title, children, size = 'md', keyPrefix = 'modal' }: ModalProps) {
    const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const previousOverflow = useRef<string>('')

    useEffect(() => {
        // Prevent body scroll when modal is open
        if (isOpen) {
            previousOverflow.current = document.body.style.overflow
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = previousOverflow.current || 'unset'
        }
        return () => { document.body.style.overflow = previousOverflow.current || 'unset' }
    }, [isOpen])

    if (!isClient) return null

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div key={`${keyPrefix}-container`}>
                    {/* Overlay */}
                    <motion.div
                        key={`${keyPrefix}-overlay`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            key={`${keyPrefix}-content`}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={cn('glass w-full rounded-3xl p-6 relative pointer-events-auto shadow-2xl', sizes[size])}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 hover:bg-muted rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Title */}
                            {title && (
                                <div className="text-2xl font-bold mb-6 pr-10">{title}</div>
                            )}

                            {/* Content */}
                            <div className="max-h-[70vh] overflow-y-auto">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
