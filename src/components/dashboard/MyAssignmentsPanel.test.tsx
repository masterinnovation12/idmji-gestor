/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MyAssignmentsPanel } from './MyAssignmentsPanel'
import type { Culto } from '@/types/database'

vi.mock('@/app/dashboard/cultos/actions', () => ({
  getUserAssignments: vi.fn(),
}))

vi.mock('@/components/InstruccionesCultoModal', () => ({
  InstruccionesCultoModal: () => null,
}))

vi.mock('@/components/dashboard/AddToCalendarSheet', () => ({
  AddToCalendarSheet: ({ open, sheetSubtitle }: { open: boolean; sheetSubtitle?: string }) =>
    open ? <div data-testid="calendar-sheet">{sheetSubtitle}</div> : null,
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'es-ES',
  }),
}))

const { shareCalendarText, shouldUseNativeCalendarShare } = vi.hoisted(() => ({
  shareCalendarText: vi.fn().mockResolvedValue('shared'),
  shouldUseNativeCalendarShare: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/utils/calendarExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/calendarExport')>()
  return {
    ...actual,
    shareCalendarText,
    shouldUseNativeCalendarShare,
  }
})

const mockCulto: Culto = {
  id: 'culto-1',
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

const mockUser = {
  id: 'user-1',
  nombre: 'Jeffrey',
  apellidos: 'Bolaños',
  email: 'test@example.com',
  email_contacto: null,
  telefono: null,
  rol: 'ADMIN' as const,
  avatar_url: null,
  pulpito: true,
  created_at: '2026-01-01',
}

describe('MyAssignmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shouldUseNativeCalendarShare.mockReturnValue(false)
    shareCalendarText.mockResolvedValue('shared')
  })

  it('muestra botón de añadir semana y por asignación', () => {
    render(<MyAssignmentsPanel user={mockUser} initialAssignments={[mockCulto]} />)
    expect(screen.getByText('dashboard.addWeekToCalendar')).toBeInTheDocument()
    expect(screen.getByText('dashboard.addToCalendar')).toBeInTheDocument()
  })

  it('abre el sheet al pulsar añadir al calendario de una asignación', () => {
    render(<MyAssignmentsPanel user={mockUser} initialAssignments={[mockCulto]} />)
    fireEvent.click(screen.getByText('dashboard.addToCalendar'))
    expect(screen.getByTestId('calendar-sheet')).toBeInTheDocument()
  })

  it('abre el sheet al pulsar añadir semana', () => {
    render(<MyAssignmentsPanel user={mockUser} initialAssignments={[mockCulto]} />)
    fireEvent.click(screen.getByText('dashboard.addWeekToCalendar'))
    expect(screen.getByTestId('calendar-sheet')).toBeInTheDocument()
  })

  it('usa share nativo en móvil sin abrir el sheet', async () => {
    shouldUseNativeCalendarShare.mockReturnValue(true)
    render(<MyAssignmentsPanel user={mockUser} initialAssignments={[mockCulto]} />)
    fireEvent.click(screen.getByText('dashboard.addToCalendar'))
    await waitFor(() => {
      expect(shareCalendarText).toHaveBeenCalledWith(
        expect.objectContaining({ shareTitle: expect.any(String), shareText: expect.any(String) }),
      )
    })
    expect(screen.queryByTestId('calendar-sheet')).not.toBeInTheDocument()
  })

  it('copia al portapapeles cuando share devuelve unavailable', async () => {
    shouldUseNativeCalendarShare.mockReturnValue(true)
    shareCalendarText.mockResolvedValue('unavailable')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<MyAssignmentsPanel user={mockUser} initialAssignments={[mockCulto]} />)
    fireEvent.click(screen.getByText('dashboard.addToCalendar'))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('📅'))
    })
  })
})
