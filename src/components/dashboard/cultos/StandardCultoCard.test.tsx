/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandardCultoCard } from './StandardCultoCard'

import { translations } from '@/lib/i18n/translations'
import type { TranslationKey } from '@/lib/i18n/types'

const tEs = (k: string) => translations['es-ES'][k as TranslationKey] ?? k

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: tEs }),
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
  }) as never

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
  }) as never

describe('StandardCultoCard', () => {
  it('shows tema when culto is Alabanza and has tema asignado', () => {
    render(
      <StandardCultoCard
        culto={mockCultoAlabanza({ tema_introduccion_alabanza: 'alabanza.tema.prepararnos' })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('1. Prepararnos para la alabanza y congregarnos')).toBeInTheDocument()
  })

  it('does not show tema when culto is Enseñanza even with meta_data tema', () => {
    render(
      <StandardCultoCard
        culto={mockCultoEnsenanza()}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.queryByText(/1\. Prepararnos/)).not.toBeInTheDocument()
  })

  it('muestra observaciones vacías en chip compacto', () => {
    render(
      <StandardCultoCard
        culto={mockCultoAlabanza({ observaciones: '' })}
        esHoy={false}
        currentUserId="user-1"
      />
    )

    const noObsChip = screen.getByText(translations['es-ES']['dashboard.noObservaciones'])
    expect(noObsChip).toBeInTheDocument()
    expect(noObsChip.className).toContain('italic')
  })

  // Regresión responsive (portátiles de 14"): el reparto de responsables decide las columnas
  // por el ancho REAL de la tarjeta (@container), no por el viewport. Así, cuando la sidebar
  // estrecha la tarjeta, se apila y el himnario ocupa todo el ancho en vez de comprimirse.
  describe('layout responsive del reparto (himnario en 14")', () => {
    const hasClass = (container: HTMLElement, fragment: string) =>
      [...container.querySelectorAll('div')].find((el) => el.className.includes(fragment))

    it('envuelve el reparto en un @container y apila por defecto (@xl:flex-row para dos columnas)', () => {
      const { container } = render(
        <StandardCultoCard culto={mockCultoAlabanza({})} esHoy={false} currentUserId="user-1" />
      )
      expect(hasClass(container, '@container')).toBeTruthy()

      const distribucion = hasClass(container, '@xl:flex-row')
      expect(distribucion).toBeTruthy()
      // Mobile-first: apila salvo que la tarjeta sea ancha (@xl)
      expect(distribucion!.className).toContain('flex-col')
      expect(distribucion!.className).not.toContain('md:flex-row')
    })

    it('la columna de introducción es full-width al apilar y 58% en dos columnas', () => {
      const { container } = render(
        <StandardCultoCard culto={mockCultoAlabanza({})} esHoy={false} currentUserId="user-1" />
      )
      const introCol = hasClass(container, '@xl:w-[58%]')
      expect(introCol).toBeTruthy()
      expect(introCol!.className).toContain('w-full')
      // No debe volver al reparto por viewport (causa raíz del bug en 14")
      expect(introCol!.className).not.toContain('lg:w-[58%]')
    })
  })
})
