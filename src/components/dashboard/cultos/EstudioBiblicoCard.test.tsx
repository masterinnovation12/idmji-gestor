/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EstudioBiblicoCard } from './EstudioBiblicoCard'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/components/AddLecturaModal', () => ({
  default: () => null,
}))

const mockCulto = (metaData: Record<string, unknown> = {}) =>
  ({
    id: 'culto-1',
    fecha: '2026-03-17',
    hora_inicio: '19:00',
    tipo_culto: { nombre: 'Estudio Bíblico', tiene_lectura_introduccion: true, tiene_ensenanza: false, tiene_testimonios: false, tiene_lectura_finalizacion: true },
    meta_data: metaData,
    usuario_intro: null,
    usuario_finalizacion: null,
    usuario_ensenanza: null,
    usuario_testimonios: null,
    lecturas: [],
    plan_himnos_coros: [],
  }) as any

describe('EstudioBiblicoCard', () => {
  it('shows "Por definir" for protocol when protocoloDefinido is false', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    expect(screen.getByText('dashboard.protocolToDefine')).toBeInTheDocument()
    expect(screen.getByText('dashboard.toDefine')).toBeInTheDocument()
  })

  it('shows oración and congregación values when protocoloDefinido is true', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({
          protocolo_definido: true,
          protocolo: { oracion_inicio: true, congregacion_pie: true },
        })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('dashboard.yes')).toBeInTheDocument()
    expect(screen.getByText('dashboard.standing')).toBeInTheDocument()
  })

  it('shows "Inicio por definir" when inicioAnticipadoDefinido is false', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    expect(screen.getByText(/dashboard\.inicioToDefine/)).toBeInTheDocument()
  })

  it('shows hora real and min antes when inicioAnticipadoDefinido and activo', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({
          inicio_anticipado_definido: true,
          inicio_anticipado: { activo: true, minutos: 5 },
        })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('19:00')).toBeInTheDocument()
    expect(screen.getByText(/dashboard\.minBefore/)).toBeInTheDocument()
  })
})
