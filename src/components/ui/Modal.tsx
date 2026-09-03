import { type ReactNode, useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { getModalInitialFocus, trapModalTab } from '@/components/ui/modalFocus'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: ReactNode
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
    keyPrefix?: string
}

function subscribe() { return () => { } }
function getSnapshot() { return true }
function getServerSnapshot() { return false }

export function Modal({ isOpen, onClose, title, children, size = 'md', keyPrefix = 'modal' }: ModalProps) {
    const { t } = useI18n()
    const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const previousOverflow = useRef<string>('')
    const previousFocus = useRef<HTMLElement | null>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const onCloseRef = useRef(onClose)
    const titleId = useId()
    onCloseRef.current = onClose

    useEffect(() => {
        if (isOpen) {
            previousOverflow.current = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            if (document.activeElement instanceof HTMLElement) {
                previousFocus.current = document.activeElement
            }
        } else {
            document.body.style.overflow = previousOverflow.current || 'unset'
        }
        return () => { document.body.style.overflow = previousOverflow.current || 'unset' }
    }, [isOpen])

    // Foco y teclado solo dependen de isOpen: un onClose inline (cada render del dashboard)
    // no debe devolver el teclado al botón "Añadir lectura".
    useEffect(() => {
        if (!isOpen) return
        let cancelled = false
        const focusNow = () => {
            if (cancelled) return
            const root = panelRef.current
            if (!root) return
            getModalInitialFocus(root)?.focus()
        }
        const frame = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(focusNow)
        })
        const timer = window.setTimeout(focusNow, 40)
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation()
                onCloseRef.current()
                return
            }
            if (panelRef.current) trapModalTab(event, panelRef.current)
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
            cancelled = true
            window.cancelAnimationFrame(frame)
            window.clearTimeout(timer)
            document.removeEventListener('keydown', onKeyDown, true)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) return
        const el = previousFocus.current
        previousFocus.current = null
        el?.focus?.()
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
                <div key={`${keyPrefix}-container`} data-testid="app-modal">
                    <motion.div
                        key={`${keyPrefix}-overlay`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={onClose}
                        className="fixed inset-0 z-110 bg-black/60 backdrop-blur-md"
                        aria-hidden="true"
                        data-testid="app-modal-overlay"
                    />

                    <div className="fixed inset-0 z-120 flex items-center justify-center p-3 sm:p-4 pointer-events-none overflow-y-auto">
                        <motion.div
                            key={`${keyPrefix}-content`}
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={title ? titleId : undefined}
                            initial={{ opacity: 0, scale: 0.98, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 8 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            className={cn('ofrenda-liquid-card w-full rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative pointer-events-auto shadow-2xl my-auto', sizes[size])}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                data-modal-close
                                data-testid="app-modal-close"
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:bg-muted rounded-xl transition-colors touch-manipulation"
                                aria-label={t('common.close')}
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {title && (
                                <div id={titleId} className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pr-12 sm:pr-10 break-words">{title}</div>
                            )}

                            <div className="max-h-[65vh] sm:max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain">
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
