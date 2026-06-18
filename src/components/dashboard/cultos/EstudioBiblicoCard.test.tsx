/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EstudioBiblicoCard } from './EstudioBiblicoCard'

const modalPropsRef: { cultoTypeId?: string; rol?: string; isOpen?: boolean } = {}

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/components/AddLecturaModal', () => ({
  default: () => null,
}))

vi.mock('@/components/InstruccionesCultoModal', () => ({
  InstruccionesCultoModal: (props: {
    isOpen: boolean
    cultoTypeId: string | number
    rol: string
    onClose: () => void
  }) => {
    modalPropsRef.isOpen = props.isOpen
    modalPropsRef.cultoTypeId = String(props.cultoTypeId)
    modalPropsRef.rol = props.rol
    return props.isOpen ? (
      <div
        data-testid="instrucciones-culto-modal-mock"
        data-culto-type-id={props.cultoTypeId}
        data-rol={props.rol}
      />
    ) : null
  },
}))

const mockCulto = (
  metaData: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {}
) =>
  ({
    id: 'culto-1',
    fecha: '2026-03-17',
    hora_inicio: '19:00',
    tipo_culto_id: '4',
    tipo_culto: {
      id: '4',
      nombre: 'Estudio Bíblico',
      tiene_lectura_introduccion: true,
      tiene_ensenanza: false,
      tiene_testimonios: false,
      tiene_lectura_finalizacion: true,
    },
    meta_data: metaData,
    usuario_intro: { id: 'u-intro', nombre: 'Ana', apellidos: 'López' },
    usuario_finalizacion: { id: 'u-final', nombre: 'Pedro', apellidos: 'Ruiz' },
    usuario_ensenanza: null,
    usuario_testimonios: null,
    lecturas: [],
    plan_himnos_coros: [],
    ...overrides,
  }) as never

describe('EstudioBiblicoCard', () => {
  beforeEach(() => {
    modalPropsRef.isOpen = false
    modalPropsRef.cultoTypeId = undefined
    modalPropsRef.rol = undefined
  })

  it('muestra iconos de instrucciones en intro y finalización cuando hay tipo_culto_id', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    expect(screen.getByTestId('ver-instrucciones-icon-introduccion')).toBeInTheDocument()
    expect(screen.getByTestId('ver-instrucciones-icon-finalizacion')).toBeInTheDocument()
  })

  it('no muestra iconos de instrucciones sin id de tipo de culto', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({}, { tipo_culto_id: undefined, tipo_culto: { nombre: 'Estudio Bíblico', tiene_lectura_introduccion: true, tiene_lectura_finalizacion: true } })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.queryByTestId('ver-instrucciones-icon-introduccion')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ver-instrucciones-icon-finalizacion')).not.toBeInTheDocument()
  })

  it('abre InstruccionesCultoModal con culto_type_id y rol introduccion', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    fireEvent.click(screen.getByTestId('ver-instrucciones-icon-introduccion'))
    expect(screen.getByTestId('instrucciones-culto-modal-mock')).toBeInTheDocument()
    expect(modalPropsRef.cultoTypeId).toBe('4')
    expect(modalPropsRef.rol).toBe('introduccion')
  })

  it('abre modal con rol finalizacion al pulsar el icono de finalización', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    fireEvent.click(screen.getByTestId('ver-instrucciones-icon-finalizacion'))
    expect(modalPropsRef.rol).toBe('finalizacion')
    expect(modalPropsRef.cultoTypeId).toBe('4')
  })

  it('usa tipo_culto_id del culto cuando tipo_culto.id no está en el join', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({}, { tipo_culto: { nombre: 'Estudio Bíblico', tiene_lectura_introduccion: true, tiene_lectura_finalizacion: true } })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    fireEvent.click(screen.getByTestId('ver-instrucciones-icon-introduccion'))
    expect(modalPropsRef.cultoTypeId).toBe('4')
  })

  it('muestra configuración por definir cuando protocolo_definido es false', () => {
    render(
      <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
    )
    expect(screen.getByText('dashboard.configToDefine')).toBeInTheDocument()
    expect(screen.queryByText('dashboard.defineInDetail')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.protocolToDefine')).not.toBeInTheDocument()
  })

  it('muestra oración y congregación cuando configuracionDefinida (protocolo guardado)', () => {
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
    expect(screen.queryByText('dashboard.configToDefine')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.no')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.seated')).not.toBeInTheDocument()
  })

  it('refleja en dashboard No orar y congregación sentada tras guardar esas opciones', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({
          protocolo_definido: true,
          protocolo: { oracion_inicio: false, congregacion_pie: false },
          inicio_anticipado_definido: true,
          inicio_anticipado: { activo: false, minutos: 5 },
        })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('dashboard.no')).toBeInTheDocument()
    expect(screen.getByText('dashboard.seated')).toBeInTheDocument()
    expect(screen.queryByText('dashboard.yes')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.standing')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.configToDefine')).not.toBeInTheDocument()
  })

  it('muestra hora normal 19:00 sin enlace definir cuando protocolo_definido sin inicio anticipado activo', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({
          protocolo_definido: true,
          protocolo: { oracion_inicio: false, congregacion_pie: true },
          inicio_anticipado: { activo: false, minutos: 5 },
        })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getAllByText('19:00').length).toBeGreaterThan(0)
    expect(screen.queryByText(/dashboard\.inicioToDefine/)).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard.defineInDetail')).not.toBeInTheDocument()
  })

  it('muestra hora real y min antes cuando inicio anticipado activo y configuración definida', () => {
    render(
      <EstudioBiblicoCard
        culto={mockCulto({
          protocolo_definido: true,
          protocolo: { oracion_inicio: false, congregacion_pie: false },
          inicio_anticipado_definido: true,
          inicio_anticipado: { activo: true, minutos: 5 },
        })}
        esHoy={false}
        currentUserId="user-1"
      />
    )
    expect(screen.getAllByText('19:00').length).toBeGreaterThan(0)
    expect(screen.getByText(/dashboard\.minBefore/)).toBeInTheDocument()
  })

  // Regresión responsive (portátiles de 14"): el reparto decide columnas por ancho de tarjeta
  // (@container), no por viewport, para que el himnario no se comprima cuando la sidebar estrecha
  // la tarjeta. Debe ser consistente con StandardCultoCard.
  describe('layout responsive del reparto (himnario en 14")', () => {
    const hasClass = (container: HTMLElement, fragment: string) =>
      [...container.querySelectorAll('div')].find((el) => el.className.includes(fragment))

    it('usa @container y apila por defecto (@xl:flex-row), con introducción full-width al apilar', () => {
      const { container } = render(
        <EstudioBiblicoCard culto={mockCulto({})} esHoy={false} currentUserId="user-1" />
      )
      expect(hasClass(container, '@container')).toBeTruthy()

      const distribucion = hasClass(container, '@xl:flex-row')
      expect(distribucion).toBeTruthy()
      expect(distribucion!.className).toContain('flex-col')
      expect(distribucion!.className).not.toContain('md:flex-row')

      const introCol = hasClass(container, '@xl:w-[58%]')
      expect(introCol).toBeTruthy()
      expect(introCol!.className).toContain('w-full')
      expect(introCol!.className).not.toContain('lg:w-[58%]')
    })
  })
})
