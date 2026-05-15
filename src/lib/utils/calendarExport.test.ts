/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseCultoLocalDateTime,
  resolveCultoEndDate,
  buildCalendarEventFromAssignment,
  generateIcsCalendar,
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
  escapeIcsText,
  foldIcsLine,
  collectUserAssignmentRoles,
  buildEventsFromAssignments,
  buildCalendarShareText,
  shouldUseNativeCalendarShare,
  shareCalendarText,
  formatIcsLocalDateTime,
  CALENDAR_TIMEZONE,
  DEFAULT_CULTO_DURATION_MIN,
} from './calendarExport'
import type { Culto } from '@/types/database'

const baseCulto: Culto = {
  id: 'culto-abc',
  fecha: '2026-05-15',
  hora_inicio: '19:00:00',
  hora_fin: '20:30:00',
  tipo_culto_id: 'tipo-1',
  estado: 'planeado',
  es_festivo: false,
  es_laborable_festivo: false,
  id_usuario_intro: 'user-1',
  id_usuario_finalizacion: null,
  id_usuario_ensenanza: null,
  id_usuario_testimonios: null,
  created_at: '2026-01-01',
  tipo_culto: { id: 'tipo-1', nombre: 'Alabanza', color: '#3b82f6' },
}

const labels = {
  intro: 'Introducción',
  teaching: 'Enseñanza',
  final: 'Finalización',
  testimonies: 'Testimonios',
}

describe('calendarExport', () => {
  describe('parseCultoLocalDateTime', () => {
    it('parsea fecha y hora en hora local', () => {
      const d = parseCultoLocalDateTime('2026-05-15', '19:30')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(4)
      expect(d.getDate()).toBe(15)
      expect(d.getHours()).toBe(19)
      expect(d.getMinutes()).toBe(30)
    })
  })

  describe('resolveCultoEndDate', () => {
    it('usa hora_fin cuando existe', () => {
      const end = resolveCultoEndDate(baseCulto)
      expect(end.getHours()).toBe(20)
      expect(end.getMinutes()).toBe(30)
    })

    it('añade duración por defecto si no hay hora_fin', () => {
      const culto = { ...baseCulto, hora_fin: null }
      const start = parseCultoLocalDateTime(culto.fecha, culto.hora_inicio)
      const end = resolveCultoEndDate(culto)
      expect(end.getTime() - start.getTime()).toBe(DEFAULT_CULTO_DURATION_MIN * 60_000)
    })
  })

  describe('collectUserAssignmentRoles', () => {
    it('devuelve solo los roles del usuario', () => {
      const roles = collectUserAssignmentRoles(baseCulto, 'user-1', labels)
      expect(roles).toEqual(['Introducción'])
    })

    it('devuelve varios roles si el usuario tiene más de uno', () => {
      const culto = {
        ...baseCulto,
        id_usuario_intro: 'user-1',
        id_usuario_ensenanza: 'user-1',
      }
      const roles = collectUserAssignmentRoles(culto, 'user-1', labels)
      expect(roles).toContain('Introducción')
      expect(roles).toContain('Enseñanza')
    })
  })

  describe('buildCalendarEventFromAssignment', () => {
    it('construye título con culto y roles', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
        appOrigin: 'https://app.example.com',
      })
      expect(event.title).toContain('Alabanza')
      expect(event.title).toContain('Introducción')
      expect(event.uid).toBe('idmji-culto-culto-abc@idmji-gestor')
      expect(event.url).toBe('https://app.example.com/dashboard/cultos/culto-abc')
      expect(event.description).toContain('Introducción')
    })
  })

  describe('ICS generation', () => {
    it('genera VCALENDAR válido con CRLF y campos obligatorios', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
      })
      const ics = generateIcsCalendar([event])
      expect(ics).toContain('BEGIN:VCALENDAR\r\n')
      expect(ics).toContain('VERSION:2.0\r\n')
      expect(ics).toContain('BEGIN:VEVENT\r\n')
      expect(ics).toContain('UID:idmji-culto-culto-abc@idmji-gestor')
      expect(ics).toContain('SUMMARY:')
      expect(ics).toContain('END:VEVENT\r\n')
      expect(ics).toContain('END:VCALENDAR\r\n')
    })

    it('incluye varios VEVENT en un solo archivo', () => {
      const e1 = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
      })
      const e2 = buildCalendarEventFromAssignment({
        culto: { ...baseCulto, id: 'culto-xyz', fecha: '2026-05-16' },
        cultoDisplayName: 'Estudio',
        roles: ['Enseñanza'],
      })
      const ics = generateIcsCalendar([e1, e2])
      const count = (ics.match(/BEGIN:VEVENT/g) ?? []).length
      expect(count).toBe(2)
    })

    it('escapa caracteres especiales en SUMMARY', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Culto, especial',
        roles: ['Intro;ducción'],
      })
      const ics = generateIcsCalendar([event])
      expect(ics).toContain(escapeIcsText('Culto, especial — Intro;ducción'))
    })
  })

  describe('foldIcsLine', () => {
    it('no modifica líneas cortas', () => {
      expect(foldIcsLine('SHORT')).toBe('SHORT')
    })

    it('pliega líneas largas', () => {
      const long = 'A'.repeat(80)
      const folded = foldIcsLine(long)
      expect(folded.split('\r\n').length).toBeGreaterThan(1)
      expect(folded.startsWith('A'.repeat(75))).toBe(true)
    })
  })

  describe('buildGoogleCalendarUrl', () => {
    it('incluye action TEMPLATE, dates y ctz', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
      })
      const url = buildGoogleCalendarUrl(event)
      expect(url).toContain('calendar.google.com')
      expect(url).toContain('action=TEMPLATE')
      expect(url).toContain(`ctz=${encodeURIComponent(CALENDAR_TIMEZONE)}`)
      expect(url).toContain(formatIcsLocalDateTime(event.start))
    })
  })

  describe('buildEventsFromAssignments', () => {
    it('genera un evento por culto con rol del usuario', () => {
      const events = buildEventsFromAssignments({
        assignments: [baseCulto],
        userId: 'user-1',
        roleLabels: labels,
        getCultoDisplayName: (n) => n ?? 'Culto',
      })
      expect(events).toHaveLength(1)
      expect(events[0].title).toContain('Alabanza')
    })

    it('omite cultos sin rol del usuario', () => {
      const events = buildEventsFromAssignments({
        assignments: [baseCulto],
        userId: 'otro-user',
        roleLabels: labels,
        getCultoDisplayName: (n) => n ?? 'Culto',
      })
      expect(events).toHaveLength(0)
    })
  })

  describe('buildOutlookWebUrl', () => {
    it('genera deeplink de Outlook con subject y fechas ISO', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
      })
      const url = buildOutlookWebUrl(event)
      expect(url).toContain('outlook.live.com')
      expect(url).toContain('subject=')
    })
  })

  describe('buildCalendarShareText', () => {
    it('incluye título, fechas y enlace de Google para un evento', () => {
      const event = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
        appOrigin: 'https://app.example.com',
      })
      const text = buildCalendarShareText([event], 'Mi asignación')
      expect(text).toContain('Mi asignación')
      expect(text).toContain('Alabanza')
      expect(text).toContain('calendar.google.com')
    })

    it('indica cantidad cuando hay varios eventos', () => {
      const e1 = buildCalendarEventFromAssignment({
        culto: baseCulto,
        cultoDisplayName: 'Alabanza',
        roles: ['Introducción'],
      })
      const e2 = buildCalendarEventFromAssignment({
        culto: { ...baseCulto, id: 'culto-2' },
        cultoDisplayName: 'Estudio',
        roles: ['Enseñanza'],
      })
      const text = buildCalendarShareText([e1, e2], 'Semana')
      expect(text).toContain('(2 asignaciones)')
    })
  })

  describe('shouldUseNativeCalendarShare', () => {
    it('devuelve true en viewport estrecho con share API', () => {
      vi.stubGlobal('navigator', { share: vi.fn() })
      vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
        matches: query.includes('max-width'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })))
      expect(shouldUseNativeCalendarShare()).toBe(true)
    })

    it('devuelve false sin navigator.share', () => {
      vi.stubGlobal('navigator', {})
      expect(shouldUseNativeCalendarShare()).toBe(false)
    })
  })

  describe('shareCalendarText', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('comparte texto con title+text (patrón Lecturas)', async () => {
      const share = vi.fn().mockResolvedValue(undefined)
      const canShare = vi.fn().mockReturnValue(true)
      vi.stubGlobal('navigator', { share, canShare })

      const result = await shareCalendarText({
        shareTitle: 'Mi asignación',
        shareText: 'Texto del evento',
      })

      expect(result).toBe('shared')
      expect(share).toHaveBeenCalledWith({
        title: 'Mi asignación',
        text: 'Texto del evento',
      })
    })

    it('devuelve unavailable si navigator.share no existe', async () => {
      vi.stubGlobal('navigator', {})
      const result = await shareCalendarText({ shareTitle: 'T', shareText: 'X' })
      expect(result).toBe('unavailable')
    })

    it('devuelve unavailable si canShare devuelve false', async () => {
      const share = vi.fn()
      const canShare = vi.fn().mockReturnValue(false)
      vi.stubGlobal('navigator', { share, canShare })

      const result = await shareCalendarText({ shareTitle: 'T', shareText: 'X' })
      expect(result).toBe('unavailable')
      expect(share).not.toHaveBeenCalled()
    })

    it('devuelve cancelled si el usuario cancela', async () => {
      const abort = new DOMException('user cancelled', 'AbortError')
      const share = vi.fn().mockRejectedValue(abort)
      vi.stubGlobal('navigator', { share, canShare: () => true })

      const result = await shareCalendarText({ shareTitle: 'T', shareText: 'X' })
      expect(result).toBe('cancelled')
    })

    it('devuelve unavailable si share falla con error inesperado', async () => {
      const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
      vi.stubGlobal('navigator', { share, canShare: () => true })

      const result = await shareCalendarText({ shareTitle: 'T', shareText: 'X' })
      expect(result).toBe('unavailable')
    })
  })
})

describe('downloadIcsFile', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crea enlace de descarga y hace click', async () => {
    const { downloadIcsFile } = await import('./calendarExport')
    const click = vi.fn()
    const anchor = { click, href: '', download: '', rel: '' } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchor)

    downloadIcsFile('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', 'test.ics')
    expect(click).toHaveBeenCalled()
    expect(anchor.download).toBe('test.ics')
  })
})
