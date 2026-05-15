/**
 * Exportación de eventos al calendario (ICS, Google Calendar, Outlook web).
 * Compatible con Google, Apple Calendar, Outlook y Web Share API (móvil).
 *
 * @see https://www.ietf.org/rfc/rfc5545.html
 */

import type { Culto } from '@/types/database'

export const CALENDAR_TIMEZONE = 'Europe/Madrid'
export const DEFAULT_EVENT_LOCATION = 'IDMJI Sabadell'
/** Duración por defecto si no hay hora_fin (minutos). */
export const DEFAULT_CULTO_DURATION_MIN = 90

export type CalendarExportEvent = {
  uid: string
  title: string
  description: string
  location: string
  start: Date
  end: Date
  url?: string
}

export type AssignmentRoleLabels = {
  intro: string
  teaching: string
  final: string
  testimonies: string
}

/** Roles del usuario en un culto (claves internas + etiquetas traducidas). */
export function collectUserAssignmentRoles(
  culto: Culto,
  userId: string,
  labels: AssignmentRoleLabels,
): string[] {
  const roles: string[] = []
  if (culto.id_usuario_intro === userId) roles.push(labels.intro)
  if (culto.id_usuario_ensenanza === userId) roles.push(labels.teaching)
  if (culto.id_usuario_finalizacion === userId) roles.push(labels.final)
  if (culto.id_usuario_testimonios === userId) roles.push(labels.testimonies)
  return roles
}

/** Parsea fecha YYYY-MM-DD + hora HH:mm[:ss] en hora local del navegador. */
export function parseCultoLocalDateTime(fecha: string, hora: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  const parts = (hora || '19:00').split(':').map(Number)
  const hh = parts[0] ?? 19
  const mm = parts[1] ?? 0
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

export function resolveCultoEndDate(culto: Culto): Date {
  const start = parseCultoLocalDateTime(culto.fecha, culto.hora_inicio)
  if (culto.hora_fin) {
    const end = parseCultoLocalDateTime(culto.fecha, culto.hora_fin)
    if (end > start) return end
  }
  return new Date(start.getTime() + DEFAULT_CULTO_DURATION_MIN * 60_000)
}

export function buildCalendarEventFromAssignment(params: {
  culto: Culto
  cultoDisplayName: string
  roles: string[]
  appOrigin?: string
  location?: string
}): CalendarExportEvent {
  const { culto, cultoDisplayName, roles, appOrigin, location = DEFAULT_EVENT_LOCATION } = params
  const start = parseCultoLocalDateTime(culto.fecha, culto.hora_inicio)
  const end = resolveCultoEndDate(culto)
  const rolesLine = roles.length > 0 ? roles.join(', ') : '—'
  const detailUrl = appOrigin ? `${appOrigin}/dashboard/cultos/${culto.id}` : undefined
  const descriptionParts = [
    `Asignación: ${rolesLine}`,
    detailUrl ? `Detalles: ${detailUrl}` : null,
  ].filter(Boolean)

  return {
    uid: `idmji-culto-${culto.id}@idmji-gestor`,
    title: `${cultoDisplayName} — ${rolesLine}`,
    description: descriptionParts.join('\n'),
    location,
    start,
    end,
    url: detailUrl,
  }
}

/** Formato ICS local (sin Z): interpretado como hora local en la app de calendario. */
export function formatIcsLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** Formato Google Calendar / Outlook web (local + ctz). */
export function formatWebCalendarDateTime(date: Date): string {
  return formatIcsLocalDateTime(date)
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/** Pliega líneas ICS > 75 caracteres (RFC 5545). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) {
    parts.push(` ${line.slice(i, i + 74)}`)
    i += 74
  }
  return parts.join('\r\n')
}

function buildVevent(event: CalendarExportEvent, now: Date): string[] {
  const lines = [
    'BEGIN:VEVENT',
    foldIcsLine(`UID:${event.uid}`),
    foldIcsLine(`DTSTAMP:${formatIcsLocalDateTime(now)}`),
    foldIcsLine(`DTSTART:${formatIcsLocalDateTime(event.start)}`),
    foldIcsLine(`DTEND:${formatIcsLocalDateTime(event.end)}`),
    foldIcsLine(`SUMMARY:${escapeIcsText(event.title)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(event.description)}`),
    foldIcsLine(`LOCATION:${escapeIcsText(event.location)}`),
  ]
  if (event.url) {
    lines.push(foldIcsLine(`URL:${event.url}`))
  }
  lines.push('END:VEVENT')
  return lines
}

/** Genera un archivo .ics con uno o varios eventos (CRLF). */
export function generateIcsCalendar(events: CalendarExportEvent[], prodId = '-//IDMJI Gestor//Assignments//ES'): string {
  const now = new Date()
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldIcsLine(`PRODID:${prodId}`),
    ...events.flatMap((e) => buildVevent(e, now)),
    'END:VCALENDAR',
  ]
  return `${body.join('\r\n')}\r\n`
}

export function buildGoogleCalendarUrl(event: CalendarExportEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatWebCalendarDateTime(event.start)}/${formatWebCalendarDateTime(event.end)}`,
    details: event.description,
    location: event.location,
    ctz: CALENDAR_TIMEZONE,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Outlook.com (web) — abre formulario de evento. */
export function buildOutlookWebUrl(event: CalendarExportEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description,
    location: event.location,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function downloadIcsFile(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export type CalendarShareResult = 'shared' | 'cancelled' | 'unavailable'

const ICS_MIME_TYPES = ['text/calendar;charset=utf-8', 'text/calendar', 'application/ics'] as const

function formatShareDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Texto para Web Share (mismo patrón que Historial → Lecturas → Compartir).
 * Abre el menú nativo del SO con WhatsApp, Calendar, Gmail, etc.
 */
export function buildCalendarShareText(events: CalendarExportEvent[], header: string): string {
  let text = `📅 ${header}\n`
  if (events.length > 1) {
    text += `(${events.length} asignaciones)\n`
  }
  text += '-------------------\n'

  for (const e of events) {
    text += `\n• ${e.title}`
    text += `\n  🕐 ${formatShareDateTime(e.start)} – ${formatShareDateTime(e.end)}`
    text += `\n  📍 ${e.location}`
    if (e.url) text += `\n  🔗 ${e.url}`
  }

  if (events.length === 1) {
    text += `\n\n🔗 Añadir en Google Calendar:\n${buildGoogleCalendarUrl(events[0])}`
  }

  return text.trim()
}

function isShareAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

/** Móvil / PWA: compartir directo al menú nativo (sin sheet intermedio). */
export function shouldUseNativeCalendarShare(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  if (!navigator.share) return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 768px)').matches
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  return coarse || narrow || standalone
}

async function tryShareIcsFile(icsContent: string, filename: string): Promise<CalendarShareResult | null> {
  if (!navigator.share) return null

  for (const mime of ICS_MIME_TYPES) {
    try {
      const file = new File([icsContent], filename, { type: mime, lastModified: Date.now() })
      const payload: ShareData = { files: [file] }
      if (navigator.canShare && !navigator.canShare(payload)) continue
      // Android: no mezclar title + files (falla con DOMException)
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (isShareAbort(err)) return 'cancelled'
    }
  }
  return null
}

async function tryShareTextLikeLecturas(shareTitle: string, shareText: string): Promise<CalendarShareResult | null> {
  if (!navigator.share) return null

  const withTitle: ShareData = { title: shareTitle, text: shareText }
  const textOnly: ShareData = { text: shareText }

  for (const payload of [withTitle, textOnly]) {
    try {
      if (navigator.canShare && !navigator.canShare(payload)) continue
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (isShareAbort(err)) return 'cancelled'
    }
  }

  try {
    await navigator.share(withTitle)
    return 'shared'
  } catch (err) {
    if (isShareAbort(err)) return 'cancelled'
  }

  return null
}

/**
 * Abre el share sheet nativo (como Compartir en Lecturas).
 * 1) Archivo .ics (apps de calendario)
 * 2) Texto formateado (menú nativo completo en Android)
 */
export async function shareCalendarToDevice(params: {
  icsContent: string
  filename: string
  shareTitle: string
  shareText: string
}): Promise<CalendarShareResult> {
  const fromFile = await tryShareIcsFile(params.icsContent, params.filename)
  if (fromFile) return fromFile

  const fromText = await tryShareTextLikeLecturas(params.shareTitle, params.shareText)
  if (fromText) return fromText

  return 'unavailable'
}

/** @deprecated Usar shareCalendarToDevice */
export function canShareIcsFiles(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

/** @deprecated Usar shareCalendarToDevice */
export async function shareIcsViaNativeSheet(icsContent: string, filename: string, title: string): Promise<boolean> {
  const result = await shareCalendarToDevice({
    icsContent,
    filename,
    shareTitle: title,
    shareText: title,
  })
  return result === 'shared'
}

export function openExternalUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** Convierte asignaciones de culto del usuario en eventos exportables. */
export function buildEventsFromAssignments(params: {
  assignments: Culto[]
  userId: string
  roleLabels: AssignmentRoleLabels
  getCultoDisplayName: (nombre: string | undefined) => string
  appOrigin?: string
}): CalendarExportEvent[] {
  const { assignments, userId, roleLabels, getCultoDisplayName, appOrigin } = params
  return assignments
    .map((culto) => {
      const roles = collectUserAssignmentRoles(culto, userId, roleLabels)
      if (roles.length === 0) return null
      return buildCalendarEventFromAssignment({
        culto,
        cultoDisplayName: getCultoDisplayName(culto.tipo_culto?.nombre),
        roles,
        appOrigin,
      })
    })
    .filter((e): e is CalendarExportEvent => e !== null)
}
