'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface Toast {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

interface ToastProps {
    toast: Toast
    onDismiss: (id: string) => void
}

const toastIcons = {
    success: Check,
    error: X,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2,
}

const toastColors = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-600',
    error: 'bg-gradient-to-r from-red-500 to-rose-600',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600',
    info: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    loading: 'bg-gradient-to-r from-blue-500 to-indigo-600',
}

const iconBgColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    loading: 'bg-blue-500',
}

function AnimatedToastItem({ toast, onDismiss }: ToastProps) {
    const Icon = toastIcons[toast.type]
    const duration = toast.duration || 4000

    useEffect(() => {
        if (toast.type !== 'loading') {
            const timer = setTimeout(() => onDismiss(toast.id), duration)
            return () => clearTimeout(timer)
        }
    }, [toast.id, toast.type, duration, onDismiss])

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[320px] max-w-[400px]"
        >
            {/* Gradient top bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${toastColors[toast.type]}`} />

            {/* Progress bar */}
            {toast.type !== 'loading' && (
                <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: duration / 1000, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-0.5 ${toastColors[toast.type]} opacity-50`}
                />
            )}

            <div className="flex items-start gap-3 p-4">
                {/* Icon container with animation */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBgColors[toast.type]} flex items-center justify-center shadow-lg`}
                >
                    {toast.type === 'loading' ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <Icon className="w-5 h-5 text-white" />
                        </motion.div>
                    ) : toast.type === 'success' ? (
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                            <motion.path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                            />
                        </svg>
                    ) : (
                        <Icon className="w-5 h-5 text-white" />
                    )}
                </motion.div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                    <motion.h4
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {toast.title}
                    </motion.h4>
                    {toast.message && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm text-gray-600 dark:text-gray-400 mt-0.5"
                        >
                            {toast.message}
                        </motion.p>
                    )}
                </div>

                {/* Close button */}
                {toast.type !== 'loading' && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDismiss(toast.id)}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </motion.button>
                )}
            </div>
        </motion.div>
    )
}

// Toast context and provider
import { createContext, useContext, useCallback } from 'react'

interface ToastContextType {
    toasts: Toast[]
    addToast: (toast: Omit<Toast, 'id'>) => string
    removeToast: (id: string) => void
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
    loading: (title: string, message?: string) => string
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts(prev => [...prev, { ...toast, id }])
        return id
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message })
    }, [addToast])

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message })
    }, [addToast])

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message })
    }, [addToast])

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message })
    }, [addToast])

    const loading = useCallback((title: string, message?: string) => {
        return addToast({ type: 'loading', title, message })
    }, [addToast])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, loading, dismiss: removeToast }}>
            {children}

            {/* Toast container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map(toast => (
                        <div key={toast.id} className="pointer-events-auto">
                            <AnimatedToastItem toast={toast} onDismiss={removeToast} />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

// Success confirmation overlay
export function SuccessOverlay({ show, message }: { show: boolean; message: string }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center"
                        >
                            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none">
                                <motion.path
                                    d="M5 13l4 4L19 7"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                />
                            </svg>
                        </motion.div>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                        >
                            {message}
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
