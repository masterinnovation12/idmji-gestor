/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssignmentPill } from './AssignmentPill'

import { translations } from '@/lib/i18n/translations'
import type { TranslationKey } from '@/lib/i18n/types'

const tEs = (k: string) => translations['es-ES'][k as TranslationKey] ?? k

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: tEs }),
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
    expect(
      screen.getByText('1. Prepararnos para la alabanza y congregarnos')
    ).toBeInTheDocument()
  })

  it('muestra tema 6 solo con título numerado (Ser reverentes)', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Ana', apellidos: 'López' }}
        temaIntroduccionAlabanza="alabanza.tema.serReverentes"
      />
    )
    expect(screen.getByText('6. Ser reverentes')).toBeInTheDocument()
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
        usuario={undefined}
        himnario={himnario as never}
        tipoCulto="Enseñanza"
      />
    )
    expect(screen.getByText('Himno 1')).toBeInTheDocument()
    expect(screen.getByText('Himno 2')).toBeInTheDocument()
    expect(screen.getByText('Coro A')).toBeInTheDocument()
    expect(screen.getByText('Coro B')).toBeInTheDocument()
    const items = document.querySelectorAll('.space-y-1\\.5 > div, .space-y-2 > div')
    expect(items[0].textContent).toContain('Himno 1')
    expect(items[1].textContent).toContain('Himno 2')
    expect(items[2].textContent).toContain('Coro A')
    expect(items[3].textContent).toContain('Coro B')
  })

  it('usa layout compacto en items de himnario', () => {
    const himnario = [
      { tipo: 'himno', orden: 1, himno: { numero: 1, titulo: 'Himno Compacto', duracion_segundos: 120 } },
    ]
    const { container } = render(
      <AssignmentPill
        label="Intro"
        usuario={undefined}
        himnario={himnario as never}
        tipoCulto="Alabanza"
      />
    )

    const itemRow = container.querySelector('.group\\/item')
    expect(itemRow?.className).toContain('flex items-center')
    expect(itemRow?.className).not.toContain('flex-col')
  })

  it('renderiza la nota del rol con negrita y saltos de línea', () => {
    const { container } = render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        nota={'Dar la **bienvenida**\nsegunda línea'}
      />
    )
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('bienvenida')
    const noteP = container.querySelector('p.whitespace-pre-line')
    expect(noteP?.textContent).toContain('segunda línea')
  })

  it('no renderiza bloque de nota cuando nota está vacía o solo espacios', () => {
    const { container } = render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        nota={'   '}
      />
    )
    expect(container.querySelector('p.whitespace-pre-line')).toBeNull()
  })
})
