'use client'

/**
 * AddToCalendarSheet — escritorio: Google, Apple (.ics), Outlook, descarga.
 * En móvil/PWA el panel usa share nativo directo (sin este sheet).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarPlus,
  Download,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { CalendarExportEvent } from '@/lib/utils/calendarExport'
import {
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
  downloadIcsFile,
  generateIcsCalendar,
  openExternalUrl,
} from '@/lib/utils/calendarExport'
import { cn } from '@/lib/utils'

export type AddToCalendarSheetProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  events: CalendarExportEvent[]
  icsFilename: string
  sheetTitle?: string
  sheetSubtitle?: string
}>

type CalendarActionId = 'google' | 'apple' | 'outlook' | 'download'

/** Icono SVG de Google Calendar */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" />
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#DADCE0" />
      <rect x="3" y="8" width="18" height="2" fill="#4285F4" />
      <rect x="7" y="3" width="2" height="4" rx="1" fill="#4285F4" />
      <rect x="15" y="3" width="2" height="4" rx="1" fill="#4285F4" />
      <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#4285F4">G</text>
    </svg>
  )
}

/** Icono SVG de Apple Calendar */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4zm-3.1-17.6c.03 2.29-2.1 4.26-4.25 4.07-.31-2.22 1.97-4.44 4.25-4.07z" />
    </svg>
  )
}

/** Icono SVG de Outlook */
function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="14" height="14" rx="2" fill="#0078D4" />
      <rect x="10" y="3" width="12" height="12" rx="2" fill="#50B0F8" />
      <path d="M10 7h8M10 10h8M10 13h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="12" r="3" fill="white" opacity="0.9" />
    </svg>
  )
}

const ACTION_META: Record<CalendarActionId, {
  bgLight: string
  bgDark: string
  iconColor: string
}> = {
  google: {
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  apple: {
    bgLight: 'bg-slate-50',
    bgDark: 'dark:bg-slate-800/60',
    iconColor: 'text-slate-700 dark:text-slate-300',
  },
  outlook: {
    bgLight: 'bg-sky-50',
    bgDark: 'dark:bg-sky-950/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  download: {
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
}

export function AddToCalendarSheet({
  open,
  onOpenChange,
  events,
  icsFilename,
  sheetTitle,
  sheetSubtitle,
}: AddToCalendarSheetProps) {
  const { t } = useI18n()
  const [busy, setBusy] = useState<CalendarActionId | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const icsContent = useMemo(() => generateIcsCalendar(events), [events])
  const singleEvent = events.length === 1 ? events[0] : null

  const title = sheetTitle ?? t('dashboard.calendarExport.title')
  const subtitle =
    sheetSubtitle ??
    (events.length === 1
      ? events[0].title
      : t('dashboard.calendarExport.subtitleMultiple').replace('{count}', String(events.length)))

  const close = useCallback(() => { if (!busy) onOpenChange(false) }, [busy, onOpenChange])

  const runAction = useCallback(async (id: CalendarActionId) => {
    if (events.length === 0 || busy) return
    setBusy(id)
    try {
      switch (id) {
        case 'google': {
          if (singleEvent) {
            openExternalUrl(buildGoogleCalendarUrl(singleEvent))
          } else {
            for (const ev of events) openExternalUrl(buildGoogleCalendarUrl(ev))
            toast.info(t('dashboard.calendarExport.googleMultiple'))
          }
          close()
          break
        }
        case 'outlook': {
          if (singleEvent) {
            openExternalUrl(buildOutlookWebUrl(singleEvent))
          } else {
            downloadIcsFile(icsContent, icsFilename)
            toast.info(t('dashboard.calendarExport.outlookMultipleHint'))
          }
          close()
          break
        }
        case 'apple':
        case 'download': {
          downloadIcsFile(icsContent, icsFilename)
          toast.success(t('dashboard.calendarExport.downloaded'))
          close()
          break
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setBusy(null)
        return
      }
      toast.error(t('dashboard.calendarExport.error'))
    } finally {
      setBusy(null)
    }
  }, [events, busy, singleEvent, icsContent, icsFilename, title, close, t])

  type ActionDef = {
    id: CalendarActionId
    label: string
    hint: string
    icon: React.ReactNode
    show: boolean
  }

  const actions: ActionDef[] = [
    {
      id: 'google',
      label: t('dashboard.calendarExport.google'),
      hint: t('dashboard.calendarExport.googleHint'),
      icon: <GoogleIcon className="w-5 h-5" />,
      show: true,
    },
    {
      id: 'apple',
      label: t('dashboard.calendarExport.apple'),
      hint: t('dashboard.calendarExport.appleHint'),
      icon: <AppleIcon className="w-5 h-5" />,
      show: true,
    },
    {
      id: 'outlook',
      label: t('dashboard.calendarExport.outlook'),
      hint: t('dashboard.calendarExport.outlookHint'),
      icon: <OutlookIcon className="w-5 h-5" />,
      show: true,
    },
    {
      id: 'download',
      label: t('dashboard.calendarExport.downloadIcs'),
      hint: t('dashboard.calendarExport.downloadIcsHint'),
      icon: <Download className="w-5 h-5" />,
      show: true,
    },
  ]

  const visibleActions = actions.filter((a) => a.show)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-md"
            onClick={close}
            aria-hidden
          />

          {/* Panel: bottom-sheet en móvil, modal centrado en desktop */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal
            aria-label={title}
            /* Móvil: desliza desde abajo */
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className={cn(
              'fixed z-[999] w-full',
              /* Mobile: fijado abajo */
              'bottom-0 left-0 right-0',
              /* Desktop: centrado */
              'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-auto sm:max-w-sm',
            )}
          >
            {/* Contenedor glass */}
            <div className={cn(
              /* Base glass */
              'relative overflow-hidden',
              /* Forma: bordes arriba en móvil, bordes completos en desktop */
              'rounded-t-[2rem] sm:rounded-3xl',
              /* Fondo glass */
              'bg-white/90 dark:bg-slate-900/90',
              'backdrop-blur-2xl',
              /* Borde sutil */
              'border border-white/60 dark:border-white/10',
              /* Sombra dramática */
              'shadow-[0_-8px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.6)]',
              'sm:shadow-[0_20px_60px_rgba(0,0,0,0.22)] dark:sm:shadow-[0_20px_60px_rgba(0,0,0,0.65)]',
            )}>

              {/* Franja de gradiente superior */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

              {/* Handle drag (solo móvil) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icono degradado */}
                  <div className="shrink-0 p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 border border-primary/20 dark:border-primary/30 shadow-sm">
                    <CalendarPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground leading-tight">
                      {title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  disabled={busy !== null}
                  className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors touch-manipulation disabled:opacity-40"
                  aria-label={t('common.close')}
                >
                  <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              {/* Divisor */}
              <div className="mx-5 sm:mx-6 h-px bg-slate-200/80 dark:bg-slate-700/60 mb-2" />

              {/* Lista de acciones */}
              <div className="px-3 pb-5 sm:px-4 sm:pb-5 space-y-1.5 max-h-[60vh] sm:max-h-[420px] overflow-y-auto overscroll-contain">
                {visibleActions.map((action) => {
                  const meta = ACTION_META[action.id]
                  const isBusy = busy === action.id
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => runAction(action.id)}
                      className={cn(
                        'group relative w-full flex items-center gap-3.5 p-3.5 rounded-2xl',
                        'transition-all duration-150 touch-manipulation text-left',
                        'min-h-[60px] disabled:opacity-50 disabled:cursor-wait',
                        /* Fondo normal */
                        'bg-slate-50/80 hover:bg-slate-100/90',
                        'dark:bg-slate-800/50 dark:hover:bg-slate-700/60',
                        /* Active press */
                        'active:scale-[0.98]',
                      )}
                    >
                      {/* Icono de acción */}
                      <div className={cn(
                        'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                        'shadow-sm border border-white/80 dark:border-slate-700/50',
                        meta.bgLight,
                        meta.bgDark,
                      )}>
                        <span className={cn(meta.iconColor, isBusy && 'opacity-0')}>
                          {action.icon}
                        </span>
                        {isBusy && (
                          <Loader2 className="absolute w-5 h-5 animate-spin text-primary" />
                        )}
                      </div>

                      {/* Textos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground leading-tight">
                            {action.label}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                          {action.hint}
                        </p>
                      </div>

                      {/* Flecha */}
                      <ExternalLink className={cn(
                        'w-3.5 h-3.5 shrink-0 transition-opacity',
                        'text-muted-foreground/40 group-hover:text-muted-foreground/70',
                        (action.id === 'apple' || action.id === 'download') && 'hidden',
                      )} />
                    </button>
                  )
                })}
              </div>

              {/* Safe area móvil (iOS home bar) */}
              <div className="h-safe-bottom sm:hidden pb-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
