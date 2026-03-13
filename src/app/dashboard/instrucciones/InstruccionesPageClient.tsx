'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, BookOpen, GraduationCap,
  ChevronDown, ChevronRight, BookMarked,
  Mic2, ArrowRightCircle, CheckCircle2
} from 'lucide-react'
import type { CultoInstrucciones, RolInfo } from './actions'
import type { RolInstruccionCulto } from '@/types/database'

/* ─── Config visual por tipo de culto ───────────────────────── */
const CULTO_STYLES: Record<string, {
  icon: React.ElementType
  gradient: string
  accentBg: string
  accentText: string
  border: string
  tabActive: string
  pill: string
}> = {
  Alabanza: {
    icon: Music,
    gradient: 'from-blue-600 to-indigo-600',
    accentBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentText: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    tabActive: 'bg-blue-600 dark:bg-blue-500',
    pill: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  },
  'Estudio Bíblico': {
    icon: BookOpen,
    gradient: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    tabActive: 'bg-emerald-600 dark:bg-emerald-500',
    pill: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  },
  'Enseñanza': {
    icon: GraduationCap,
    gradient: 'from-violet-600 to-purple-600',
    accentBg: 'bg-violet-50 dark:bg-violet-950/40',
    accentText: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    tabActive: 'bg-violet-600 dark:bg-violet-500',
    pill: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
  },
}

const FALLBACK_STYLE = CULTO_STYLES.Alabanza

function getCultoStyle(nombre: string) {
  return CULTO_STYLES[nombre] ?? FALLBACK_STYLE
}

/* ─── Config visual por rol ─────────────────────────────────── */
const ROL_META: Record<RolInstruccionCulto, { label: string; icon: React.ElementType; color: string }> = {
  introduccion: { label: 'Introducción',  icon: ArrowRightCircle, color: 'text-sky-500' },
  finalizacion: { label: 'Finalización',  icon: CheckCircle2,     color: 'text-emerald-500' },
  ensenanza:    { label: 'Enseñanza',     icon: BookMarked,       color: 'text-violet-500' },
  testimonios:  { label: 'Testimonios',   icon: Mic2,             color: 'text-amber-500' },
}

/* ─── Util: renderizar contenido como secciones ─────────────── */
function parseContent(text: string) {
  const lines = text.split('\n')
  const sections: { heading: string | null; items: string[] }[] = []
  let current: { heading: string | null; items: string[] } = { heading: null, items: [] }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const isNumberedHeading = /^\d+\./.test(line) && line === line.toUpperCase()
    const isHeading = isNumberedHeading || /^\d+\.\s+[A-ZÁÉÍÓÚÑÜ]/.test(line)
    if (isHeading) {
      if (current.items.length > 0 || current.heading) sections.push(current)
      current = { heading: line, items: [] }
    } else {
      current.items.push(line)
    }
  }
  if (current.items.length > 0 || current.heading) sections.push(current)
  return sections
}

/* ─── InstruccionCard ───────────────────────────────────────── */
type InstruccionCardProps = Readonly<{
  rolInfo: RolInfo
  style: ReturnType<typeof getCultoStyle>
  defaultOpen?: boolean
}>

function InstruccionCard({ rolInfo, style, defaultOpen = false }: InstruccionCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const meta = ROL_META[rolInfo.rol] ?? ROL_META.introduccion
  const { icon: RolIcon } = meta
  const sections = parseContent(rolInfo.contenido)

  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden transition-shadow ${open ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}>
      {/* Header clickable */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors touch-manipulation
          ${open ? `${style.accentBg}` : 'bg-background hover:bg-muted/30'}`}
      >
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${style.accentBg} ${style.border} border`}>
          <RolIcon className={`w-4.5 h-4.5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${style.accentText}`}>{meta.label}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{rolInfo.titulo}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Contenido expandible */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
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
                      return (
                        <li key={ii} className={`flex gap-2 text-sm text-foreground/80 leading-relaxed ${isBullet ? '' : 'text-foreground'}`}>
                          {isBullet && (
                            <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${style.accentText.replace('text-', 'bg-')}`} />
                          )}
                          <span className={isBullet ? '' : 'font-medium'}>{text}</span>
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
  const [activeTab, setActiveTab] = useState<number>(cultos[0]?.cultoTypeId ?? 0)
  const activeCulto = cultos.find((c) => c.cultoTypeId === activeTab) ?? cultos[0]

  if (!cultos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookMarked className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">No hay instrucciones disponibles.</p>
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
              Instrucciones
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              Guía de roles para cada tipo de culto
            </p>
          </div>
        </div>

        {/* Contador de instrucciones */}
        <div className="flex items-center gap-1.5">
          {cultos.map((c) => {
            const style = getCultoStyle(c.nombre)
            return (
              <div key={c.cultoTypeId} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${style.pill}`}>
                {c.nombre.split(' ')[0]}
                <span className="ml-1 opacity-60">·{c.roles.length}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2">
        {cultos.map((c) => {
          const style = getCultoStyle(c.nombre)
          const { icon: Icon } = style
          const isActive = activeTab === c.cultoTypeId
          return (
            <button
              key={c.cultoTypeId}
              type="button"
              onClick={() => setActiveTab(c.cultoTypeId)}
              className={`
                min-h-[52px] px-3 py-2.5 sm:px-5 sm:py-3 rounded-xl
                font-semibold text-[11px] sm:text-sm leading-tight
                transition-all duration-200 touch-manipulation
                flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-2
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
                {c.roles.length}
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
          return (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
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
                      {activeCulto.roles.length} {activeCulto.roles.length === 1 ? 'rol con instrucciones' : 'roles con instrucciones'}
                    </p>
                  </div>
                </div>

                {/* Pills de roles */}
                <div className="relative flex flex-wrap gap-2 mt-4">
                  {activeCulto.roles.map((r) => {
                    const meta = ROL_META[r.rol]
                    const { icon: RolIcon } = meta
                    return (
                      <div key={r.rol} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs font-semibold text-white">
                        <RolIcon className="w-3 h-3" />
                        {meta.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cards de instrucciones */}
              <div className="space-y-3">
                {activeCulto.roles.map((rolInfo, idx) => (
                  <InstruccionCard
                    key={rolInfo.rol}
                    rolInfo={rolInfo}
                    style={style}
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>

              {/* Footer orientativo */}
              <div className={`rounded-xl ${style.accentBg} ${style.border} border px-4 py-3 flex items-start gap-2.5`}>
                <ChevronRight className={`w-4 h-4 ${style.accentText} shrink-0 mt-0.5`} />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estas instrucciones también están disponibles en el detalle de cada culto, en el botón{' '}
                  <span className="font-semibold text-foreground">«Ver instrucciones»</span> de tu rol asignado.
                </p>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
