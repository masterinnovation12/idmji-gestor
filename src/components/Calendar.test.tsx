/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Calendar from './Calendar'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'es-ES' }),
}))

const mockEvent = (fecha: string) =>
  ({
    id: 'culto-1',
    fecha,
    hora_inicio: '19:00',
    tipo_culto: {
      nombre: 'Alabanza',
      color: '#3b82f6',
      tiene_lectura_introduccion: true,
      tiene_ensenanza: false,
      tiene_testimonios: false,
      tiene_lectura_finalizacion: true,
    },
    usuario_intro: null,
    usuario_finalizacion: null,
    usuario_ensenanza: null,
    usuario_testimonios: null,
    es_laborable_festivo: false,
  }) as any

describe('Calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra día de la semana en vista móvil/tablet', () => {
    // 2026-03-15 es domingo -> date-fns es locale: "dom"
    const events = [mockEvent('2026-03-15')]
    render(<Calendar events={events} view="month" selectedDate={new Date('2026-03-01')} />)

    // Día de la semana (dom) distinto del mes (mar)
    expect(screen.getByText('dom')).toBeInTheDocument()
  })

  it('muestra culto y día de la semana en tarjeta móvil', () => {
    const events = [mockEvent('2026-03-17')]
    render(<Calendar events={events} view="month" selectedDate={new Date('2026-03-01')} />)

    expect(screen.getAllByText('Alabanza').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('mar').length).toBeGreaterThanOrEqual(1)
  })

  it('renderiza mensaje cuando no hay eventos', () => {
    render(<Calendar events={[]} view="month" selectedDate={new Date('2026-03-01')} />)
    expect(screen.getByText('calendar.noCultos')).toBeInTheDocument()
  })
})
