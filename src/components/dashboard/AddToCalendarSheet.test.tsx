/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddToCalendarSheet } from './AddToCalendarSheet'
import type { CalendarExportEvent } from '@/lib/utils/calendarExport'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'dashboard.calendarExport.title': 'Añadir al calendario',
        'dashboard.calendarExport.subtitleMultiple': '{count} asignaciones',
        'dashboard.calendarExport.google': 'Google Calendar',
        'dashboard.calendarExport.googleHint': 'Abre Google Calendar',
        'dashboard.calendarExport.apple': 'Apple Calendar',
        'dashboard.calendarExport.appleHint': 'Descarga .ics',
        'dashboard.calendarExport.outlook': 'Outlook',
        'dashboard.calendarExport.outlookHint': 'Abre Outlook',
        'dashboard.calendarExport.downloadIcs': 'Descargar .ics',
        'dashboard.calendarExport.downloadIcsHint': 'Compatible',
        'dashboard.calendarExport.shareNative': 'Compartir (móvil)',
        'dashboard.calendarExport.shareNativeHint': 'Menú del sistema',
        'dashboard.calendarExport.recommended': 'Recomendado',
        'dashboard.calendarExport.downloaded': 'Descargado',
        'dashboard.calendarExport.shared': 'Compartido',
        'dashboard.calendarExport.shareFallback': 'Descargado como alternativa',
        'dashboard.calendarExport.error': 'Error al añadir',
        'common.close': 'Cerrar',
      }
      return map[key] ?? key
    },
    language: 'es-ES',
  }),
}))

const mockEvent: CalendarExportEvent = {
  uid: 'test@idmji',
  title: 'Alabanza — Introducción',
  description: 'Asignación: Introducción',
  location: 'IDMJI Sabadell',
  start: new Date(2026, 4, 15, 19, 0),
  end: new Date(2026, 4, 15, 20, 30),
}

const openExternalUrl = vi.fn()
const downloadIcsFile = vi.fn()

vi.mock('@/lib/utils/calendarExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/calendarExport')>()
  return {
    ...actual,
    openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
    downloadIcsFile: (...args: unknown[]) => downloadIcsFile(...args),
    canShareIcsFiles: () => false,
    shareIcsViaNativeSheet: vi.fn().mockResolvedValue(false),
  }
})

describe('AddToCalendarSheet', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('no renderiza nada cuando open=false', () => {
    render(
      <AddToCalendarSheet
        open={false}
        onOpenChange={vi.fn()}
        events={[mockEvent]}
        icsFilename="test.ics"
      />,
    )
    expect(screen.queryByText('Añadir al calendario')).not.toBeInTheDocument()
  })

  it('muestra título y opciones cuando open=true', () => {
    render(
      <AddToCalendarSheet
        open
        onOpenChange={vi.fn()}
        events={[mockEvent]}
        icsFilename="test.ics"
      />,
    )
    expect(screen.getByText('Añadir al calendario')).toBeInTheDocument()
    expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    expect(screen.getByText('Apple Calendar')).toBeInTheDocument()
    expect(screen.getByText('Outlook')).toBeInTheDocument()
    // No debe mostrarse "Compartir (móvil)" porque canShareIcsFiles() = false
    expect(screen.queryByText('Compartir (móvil)')).not.toBeInTheDocument()
  })

  it('muestra subtítulo personalizado', () => {
    render(
      <AddToCalendarSheet
        open
        onOpenChange={vi.fn()}
        events={[mockEvent]}
        icsFilename="test.ics"
        sheetSubtitle="Alabanza del martes"
      />,
    )
    expect(screen.getByText('Alabanza del martes')).toBeInTheDocument()
  })

  it('abre Google Calendar al elegir la opción', async () => {
    render(
      <AddToCalendarSheet
        open
        onOpenChange={vi.fn()}
        events={[mockEvent]}
        icsFilename="test.ics"
      />,
    )
    fireEvent.click(screen.getByText('Google Calendar'))
    await waitFor(() => {
      expect(openExternalUrl).toHaveBeenCalledTimes(1)
      expect(String(openExternalUrl.mock.calls[0][0])).toContain('calendar.google.com')
    })
  })

  it('descarga .ics al elegir Apple Calendar', async () => {
    render(
      <AddToCalendarSheet
        open
        onOpenChange={vi.fn()}
        events={[mockEvent]}
        icsFilename="test.ics"
      />,
    )
    fireEvent.click(screen.getByText('Apple Calendar'))
    await waitFor(() => {
      expect(downloadIcsFile).toHaveBeenCalledWith(expect.any(String), 'test.ics')
    })
  })

  it('llama onOpenChange(false) al cerrar', () => {
    const onOpenChange = vi.fn()
    render(
      <AddToCalendarSheet
        open
        onOpenChange={onOpenChange}
        events={[mockEvent]}
        icsFilename="test.ics"
      />,
    )
    fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('muestra subtitle múltiple cuando hay varios eventos', () => {
    const event2 = { ...mockEvent, uid: 'test2@idmji', title: 'Estudio — Enseñanza' }
    render(
      <AddToCalendarSheet
        open
        onOpenChange={vi.fn()}
        events={[mockEvent, event2]}
        icsFilename="test.ics"
      />,
    )
    expect(screen.getByText('2 asignaciones')).toBeInTheDocument()
  })
})
