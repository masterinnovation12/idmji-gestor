/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import InstruccionesPageClient from './InstruccionesPageClient'
import type { CultoInstrucciones } from './actions'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

const alabanzaCulto: CultoInstrucciones = {
  cultoTypeId: 5,
  nombre: 'Alabanza',
  color: '#3b82f6',
  roles: [
    {
      rol: 'finalizacion',
      titulo: 'Finalización — Culto de Alabanza',
      contenido: '',
      publicado: false,
    },
    {
      rol: 'introduccion',
      titulo: 'Introducción — Culto de Alabanza',
      contenido: '',
      publicado: false,
    },
    {
      rol: 'temas_alabanza',
      titulo: 'Temas para preparar la alabanza',
      contenido: '1. PREPARARNOS\n• Punto uno',
      publicado: true,
    },
  ],
}

describe('InstruccionesPageClient', () => {
  it('muestra Temas alabanza antes que Introducción y Finalización', () => {
    render(<InstruccionesPageClient cultos={[alabanzaCulto]} />)

    const labels = screen.getAllByText(/instrucciones\.rol\.temasAlabanza|cultos\.intro|cultos\.finalizacion/)
    const order = labels.map((el) => el.textContent)
    expect(order.indexOf('instrucciones.rol.temasAlabanza')).toBeLessThan(order.indexOf('cultos.intro'))
    expect(order.indexOf('cultos.intro')).toBeLessThan(order.indexOf('cultos.finalizacion'))
  })

  it('muestra Próximamente en introducción no publicada; temas cerrado hasta pulsar', () => {
    render(<InstruccionesPageClient cultos={[alabanzaCulto]} />)

    expect(screen.getAllByText('instrucciones.comingSoon').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('1. PREPARARNOS')).not.toBeInTheDocument()

    const temasToggle = screen.getByRole('button', { name: /instrucciones\.rol\.temasAlabanza/i })
    expect(temasToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(temasToggle)
    expect(screen.getByText('1. PREPARARNOS')).toBeInTheDocument()
    expect(temasToggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('temas alabanza inicia cerrado (sin panel de contenido en DOM)', () => {
    render(<InstruccionesPageClient cultos={[alabanzaCulto]} />)
    expect(document.getElementById('instruccion-content-temas_alabanza')).toBeNull()
  })

  it('muestra contador publicados 1/3 en pestaña Alabanza', () => {
    render(<InstruccionesPageClient cultos={[alabanzaCulto]} />)
    expect(screen.getAllByText(/1\/3/).length).toBeGreaterThanOrEqual(1)
  })

  it('estado vacío sin cultos', () => {
    render(<InstruccionesPageClient cultos={[]} />)
    expect(screen.getByText('instrucciones.empty')).toBeInTheDocument()
  })
})

describe('InstruccionesPageClient — orden desde actions (integración de datos)', () => {
  it('respeta orden si los roles ya vienen ordenados como getAllInstrucciones', async () => {
    const { sortInstruccionRoles } = await import('@/lib/instrucciones/sortInstruccionRoles')
    const sorted = sortInstruccionRoles('Alabanza', alabanzaCulto.roles)
    const cultoOrdenado = { ...alabanzaCulto, roles: sorted }

    render(<InstruccionesPageClient cultos={[cultoOrdenado]} />)

    const tabpanel = screen.getByRole('tabpanel')
    const temasToggle = within(tabpanel).getByRole('button', { name: /instrucciones\.rol\.temasAlabanza/i })
    expect(temasToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(temasToggle)
    expect(temasToggle).toHaveAttribute('aria-expanded', 'true')
  })
})
