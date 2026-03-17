/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssignmentPill } from './AssignmentPill'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

describe('AssignmentPill', () => {
  it('shows temaIntroduccionAlabanza when prop is passed', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        temaIntroduccionAlabanza="alabanza.tema.prepararnos"
      />
    )
    expect(screen.getByText('alabanza.tema.prepararnos')).toBeInTheDocument()
  })

  it('does not render tema block when temaIntroduccionAlabanza is null', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        temaIntroduccionAlabanza={null}
      />
    )
    expect(screen.queryByText('alabanza.tema.prepararnos')).not.toBeInTheDocument()
  })

  it('does not render tema block when temaIntroduccionAlabanza is undefined', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
      />
    )
    expect(screen.queryByText('alabanza.tema.prepararnos')).not.toBeInTheDocument()
  })

  it('ordena himnos primero y luego coros en cultos de Enseñanza', () => {
    const himnario = [
      { tipo: 'coro', orden: 4, coro: { numero: 10, titulo: 'Coro A', duracion_segundos: 90 } },
      { tipo: 'himno', orden: 2, himno: { numero: 2, titulo: 'Himno 2', duracion_segundos: 120 } },
      { tipo: 'himno', orden: 1, himno: { numero: 1, titulo: 'Himno 1', duracion_segundos: 90 } },
      { tipo: 'coro', orden: 5, coro: { numero: 11, titulo: 'Coro B', duracion_segundos: 80 } },
    ]
    render(
      <AssignmentPill
        label="Intro"
        himnario={himnario}
        tipoCulto="Enseñanza"
      />
    )
    expect(screen.getByText('Himno 1')).toBeInTheDocument()
    expect(screen.getByText('Himno 2')).toBeInTheDocument()
    expect(screen.getByText('Coro A')).toBeInTheDocument()
    expect(screen.getByText('Coro B')).toBeInTheDocument()
    const items = document.querySelectorAll('.space-y-2 > div')
    expect(items[0].textContent).toContain('Himno 1')
    expect(items[1].textContent).toContain('Himno 2')
    expect(items[2].textContent).toContain('Coro A')
    expect(items[3].textContent).toContain('Coro B')
  })
})
