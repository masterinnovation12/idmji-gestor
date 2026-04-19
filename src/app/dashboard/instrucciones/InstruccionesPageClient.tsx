'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, BookOpen, GraduationCap,
  ChevronDown, BookMarked,
  Mic2, ArrowRightCircle, CheckCircle2, Clock
} from 'lucide-react'
import type { CultoInstrucciones, RolInfo } from './actions'
import type { RolInstruccionCulto } from '@/types/database'
import { useI18n } from '@/lib/i18n/I18nProvider'

/* ─── Config visual por tipo de culto ───────────────────────── */
const CULTO_STYLES: Record<string, {
  icon: React.ElementType
  gradient: string
  accentBg: string
  accentText: string
  border: string
  tabActive: string
  pill: string
  comingSoonBg: string
}> = {
  Alabanza: {
    icon: Music,
    gradient: 'from-blue-600 to-indigo-600',
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentText: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    tabActive: 'bg-blue-600 dark:bg-blue-500',
    pill: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    comingSoonBg: 'bg-blue-50/60 dark:bg-blue-950/20',
  },
  'Estudio Bíblico': {
    icon: BookOpen,
    gradient: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    tabActive: 'bg-emerald-600 dark:bg-emerald-500',
    pill: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    comingSoonBg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
  },
  'Enseñanza': {
    icon: GraduationCap,
    gradient: 'from-violet-600 to-purple-600',
    accentBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentText: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    tabActive: 'bg-violet-600 dark:bg-violet-500',
    pill: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
    comingSoonBg: 'bg-violet-50/60 dark:bg-violet-950/20',
  },
}

const FALLBACK_STYLE = CULTO_STYLES.Alabanza

function getCultoStyle(nombre: string) {
  return CULTO_STYLES[nombre] ?? FALLBACK_STYLE
}

/* ─── Config visual por rol ─────────────────────────────────── */
const ROL_META: Record<RolInstruccionCulto, { labelKey: string; icon: React.ElementType; color: string }> = {
  introduccion: { labelKey: 'cultos.intro',       icon: ArrowRightCircle, color: 'text-sky-500' },
  finalizacion: { labelKey: 'cultos.finalizacion', icon: CheckCircle2,     color: 'text-emerald-500' },
  ensenanza:    { labelKey: 'cultos.ensenanza',    icon: BookMarked,       color: 'text-violet-500' },
  testimonios:  { labelKey: 'cultos.testimonios',  icon: Mic2,             color: 'text-amber-500' },
}

/* ─── Util: renderizar contenido como secciones ─────────────── */
function parseContent(text: string) {
  const lines = text.split('\n')
  const sections: { heading: string | null; items: string[] }[] = []
  let current: { heading: string | null; items: string[] } = { heading: null, items: [] }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // QA FIX: La RegEx original era frágil (solo permitía TODAS MAYÚSCULAS). 
    // Ahora permite minúsculas y formato Markdown básico (# Título).
    const isHeading = /^\d+\.\s+/.test(line) || /^#+\s+/.test(line)
    if (isHeading) {
      if (current.items.length > 0 || current.heading) sections.push(current)
      current = { heading: line.replace(/^#+\s+/, '').trim(), items: [] }
    } else {
      current.items.push(line)
    }
  }
  if (current.items.length > 0 || current.heading) sections.push(current)
  return sections
}

/**
 * QA Feature: Permite renderizar **negritas** en el texto de instrucciones, 
 * lo que ayuda enormemente a resaltar la información clave para los líderes.
 */
function renderFormattedText(text: string) {
  // Dividir por sintaxis de negrita (ej: "Hola **mundo**")
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
           
          return <strong key={i} className="font-bold text-foreground/90">{part.slice(2, -2)}</strong>
        }
         
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/* ─── ComingSoonCard ─────────────────────────────────────────── */
type ComingSoonCardProps = Readonly<{
  rolInfo: RolInfo
  style: ReturnType<typeof getCultoStyle>
}>

function ComingSoonCard({ rolInfo, style }: ComingSoonCardProps) {
  const { t } = useI18n()
  const meta = ROL_META[rolInfo.rol] ?? ROL_META.introduccion
  const { icon: RolIcon } = meta
  return (
    <div className={`rounded-2xl border ${style.border} border-dashed overflow-hidden`}>
      <div className={`w-full flex items-center gap-3 px-5 py-4 ${style.comingSoonBg}`}>
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${style.accentBg} ${style.border} border opacity-50`}>
          <RolIcon className={`w-4 h-4 ${meta.color} opacity-60`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${style.accentText} opacity-60`}>{t(meta.labelKey as Parameters<typeof t>[0])}</p>
          <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{rolInfo.titulo}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
            {t('instrucciones.comingSoon')}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── InstruccionCard ───────────────────────────────────────── */
type InstruccionCardProps = Readonly<{
  rolInfo: RolInfo
  style: ReturnType<typeof getCultoStyle>
  defaultOpen?: boolean
}>

function InstruccionCard({ rolInfo, style, defaultOpen = false }: InstruccionCardProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const meta = ROL_META[rolInfo.rol] ?? ROL_META.introduccion
  const { icon: RolIcon } = meta
  // QA FIX: Memoizar para evitar bloqueos en el hilo principal durante re-renders
  const sections = useMemo(() => parseContent(rolInfo.contenido), [rolInfo.contenido])

  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden transition-shadow duration-300 ${open ? 'shadow-md ring-1 ring-black/5 dark:ring-white/5' : 'shadow-sm hover:shadow-md'}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`instruccion-content-${rolInfo.rol}`}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors touch-manipulation
          ${open ? style.accentBg : 'bg-background hover:bg-muted/30'}`}
      >
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${style.accentBg} ${style.border} border`}>
          <RolIcon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${style.accentText}`}>{t(meta.labelKey as Parameters<typeof t>[0])}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{rolInfo.titulo}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`instruccion-content-${rolInfo.rol}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }} // Curva fluida tipo "spring" CSS
            className="overflow-hidden"
          >
            <div className="px-5 py-5 space-y-5 border-t border-border/40">
              {sections.map((sec, si) => (
                 
                <div key={si}>
                  {sec.heading && (
                    <div className={`inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-lg ${style.pill} text-xs font-bold uppercase tracking-wide`}>
                      <span>{sec.heading}</span>
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {sec.items.map((item, ii) => {
                      const isBullet = item.startsWith('•') || item.startsWith('-')
                      const text = isBullet ? item.slice(1).trim() : item
                      const accentClass = style.accentText.replace('text-', 'bg-')
                      return (
                         
                        <li key={ii} className={`flex gap-2 text-sm text-foreground/80 leading-relaxed`}>
                          {isBullet && (
                            <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${accentClass}`} />
                          )}
                          <span className={isBullet ? '' : 'font-medium'}>{renderFormattedText(text)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
type Props = Readonly<{ cultos: CultoInstrucciones[] }>

export default function InstruccionesPageClient({ cultos }: Props) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<number>(cultos[0]?.cultoTypeId ?? 0)
  const activeCulto = cultos.find((c) => c.cultoTypeId === activeTab) ?? cultos[0]

  if (!cultos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookMarked className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">{t('instrucciones.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {activeCulto && (() => {
            const style = getCultoStyle(activeCulto.nombre)
            const { icon: Icon } = style
            return (
              <div className={`p-2.5 rounded-xl ${style.accentBg}`}>
                <Icon className={`w-6 h-6 ${style.accentText}`} />
              </div>
            )
          })()}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" suppressHydrationWarning>
              {t('nav.instrucciones')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              {t('instrucciones.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {cultos.map((c) => {
            const style = getCultoStyle(c.nombre)
            const published = c.roles.filter((r) => r.publicado).length
            return (
              <div key={c.cultoTypeId} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${style.pill}`}>
                {c.nombre.split(' ')[0]}
                <span className="ml-1 opacity-60">·{published}/{c.roles.length}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tabs ── Accesibilidad: Añadidos roles de pestañas ──────── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipos de Culto">
        {cultos.map((c) => {
          const style = getCultoStyle(c.nombre)
          const { icon: Icon } = style
          const isActive = activeTab === c.cultoTypeId
          return (
            <button
              key={c.cultoTypeId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(c.cultoTypeId)}
              className={`
                flex-1 sm:flex-none
                min-h-[52px] px-3 py-2 sm:px-5 sm:py-3 rounded-xl
                font-semibold text-[10px] sm:text-sm leading-tight
                transition-all duration-200 touch-manipulation
                flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2
                ${isActive
                  ? `${style.tabActive} text-white shadow-lg`
                  : `${style.accentBg} ${style.accentText} hover:brightness-95`
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-center sm:text-left leading-tight">{c.nombre}</span>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none
                ${isActive ? 'bg-white/20 text-white' : 'bg-foreground/10'}`}>
                {c.roles.filter((r) => r.publicado).length}/{c.roles.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Contenido del culto activo ───────────────────────── */}
      <AnimatePresence mode="wait">
        {activeCulto && (() => {
          const style = getCultoStyle(activeCulto.nombre)
          const { icon: Icon } = style
          const publishedCount = activeCulto.roles.filter((r) => r.publicado).length
          return (
            <motion.div
              key={activeTab}
              role="tabpanel"
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }} // Soft deceleration
              className="space-y-4"
            >
              {/* Banner del culto */}
              <div className={`rounded-2xl bg-linear-to-r ${style.gradient} p-5 sm:p-6 text-white overflow-hidden relative`}>
                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">{activeCulto.nombre}</h2>
                    <p className="text-white/70 text-sm mt-0.5">
                      {publishedCount} {t('instrucciones.of')} {activeCulto.roles.length} {t('instrucciones.rolesReady')}
                    </p>
                  </div>
                </div>

                <div className="relative flex flex-wrap gap-2 mt-4">
                  {activeCulto.roles.map((r) => {
                    const meta = ROL_META[r.rol]
                    const { icon: RolIcon } = meta
                    return (
                      <div key={r.rol} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white ${r.publicado ? 'bg-white/20' : 'bg-white/8 opacity-60'}`}>
                        <RolIcon className="w-3 h-3" />
                        {t(meta.labelKey as Parameters<typeof t>[0])}
                        {!r.publicado && <Clock className="w-3 h-3 opacity-70" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cards de instrucciones */}
              <div className="space-y-3">
                {activeCulto.roles.map((rolInfo, idx) =>
                  rolInfo.publicado ? (
                    <InstruccionCard
                      key={rolInfo.rol}
                      rolInfo={rolInfo}
                      style={style}
                      defaultOpen={idx === 0}
                    />
                  ) : (
                    <ComingSoonCard
                      key={rolInfo.rol}
                      rolInfo={rolInfo}
                      style={style}
                    />
                  )
                )}
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
