/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandardCultoCard } from './StandardCultoCard'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/components/AddLecturaModal', () => ({
  default: () => null,
}))

const mockCultoAlabanza = (metaData: Record<string, unknown> = {}) =>
  ({
    id: 'culto-1',
    fecha: '2026-03-17',
    hora_inicio: '19:00',
    tipo_culto: {
      nombre: 'Alabanza',
      tiene_lectura_introduccion: true,
      tiene_ensenanza: false,
      tiene_testimonios: false,
      tiene_lectura_finalizacion: true,
      tiene_himnos_y_coros: true,
    },
    meta_data: metaData,
    usuario_intro: { id: 'u1', nombre: 'Juan', apellidos: 'García' },
    usuario_finalizacion: null,
    usuario_ensenanza: null,
    usuario_testimonios: null,
    lecturas: [],
    plan_himnos_coros: [],
  }) as any

const mockCultoEnsenanza = () =>
  ({
    id: 'culto-2',
    fecha: '2026-03-18',
    hora_inicio: '19:00',
    tipo_culto: {
      nombre: 'Enseñanza',
      tiene_lectura_introduccion: true,
      tiene_ensenanza: true,
      tiene_testimonios: false,
      tiene_lectura_finalizacion: true,
      tiene_himnos_y_coros: true,
    },
    meta_data: { tema_introduccion_alabanza: 'alabanza.tema.prepararnos' },
    usuario_intro: { id: 'u1', nombre: 'Juan', apellidos: 'García' },
    usuario_finalizacion: null,
    usuario_ensenanza: null,
    usuario_testimonios: null,
    lecturas: [],
    plan_himnos_coros: [],
  }) as any

describe('StandardCultoCard', () => {
  it('shows tema when culto is Alabanza and has tema asignado', () => {
    render(
      <StandardCultoCard
        culto={mockCultoAlabanza({ tema_introduccion_alabanza: 'alabanza.tema.prepararnos' })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('alabanza.tema.prepararnos')).toBeInTheDocument()
  })

  it('does not show tema when culto is Enseñanza even with meta_data tema', () => {
    render(
      <StandardCultoCard
        culto={mockCultoEnsenanza()}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.queryByText('alabanza.tema.prepararnos')).not.toBeInTheDocument()
  })

  it('muestra observaciones vacías en chip compacto', () => {
    render(
      <StandardCultoCard
        culto={mockCultoAlabanza({ observaciones: '' })}
        esHoy={false}
        currentUserId="user-1"
      />
    )

    const noObsChip = screen.getByText('dashboard.noObservaciones')
    expect(noObsChip).toBeInTheDocument()
    expect(noObsChip.className).toContain('italic')
  })
})
