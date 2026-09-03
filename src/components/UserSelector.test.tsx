/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import UserSelector from './UserSelector'
import { resetPulpitoCatalog } from '@/lib/hermanos/pulpitoCatalog'
import type { Profile } from '@/types/database'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt || ''} />,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
    button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  },
}))

const searchProfilesMock = vi.fn()
vi.mock('@/app/dashboard/cultos/[id]/actions', () => ({
  searchProfiles: (...args: unknown[]) => searchProfilesMock(...args),
}))

function profile(partial: Pick<Profile, 'id' | 'nombre' | 'apellidos'>): Profile {
  return {
    email: `${partial.id}@example.com`,
    email_contacto: null,
    telefono: null,
    rol: 'MIEMBRO',
    avatar_url: null,
    pulpito: true,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

const andres = profile({ id: 'u1', nombre: 'Andrés', apellidos: 'Zapata' })
const jeffrey = profile({ id: 'u2', nombre: 'Jeffrey', apellidos: 'Bolaños' })
const jose = profile({ id: 'u3', nombre: 'José', apellidos: 'García' })
const mockProfiles: Profile[] = [andres, jeffrey, jose]

describe('UserSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPulpitoCatalog()
    searchProfilesMock.mockResolvedValue({ data: mockProfiles })
  })

  it('abre el dropdown hacia arriba cuando no hay espacio abajo', async () => {
    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 10,
        y: 520,
        width: 340,
        height: 52,
        top: 520,
        right: 350,
        bottom: 572,
        left: 10,
        toJSON: () => ({}),
      } as DOMRect)

    Object.defineProperty(globalThis, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 640,
    })

    render(<UserSelector selectedUserId={null} onSelect={vi.fn()} />)

    await act(async () => {
      fireEvent.focus(screen.getByTestId('user-selector-input'))
    })

    const dropdown = await screen.findByTestId('user-selector-dropdown')

    await waitFor(() => {
      expect(dropdown.style.bottom).toBeTruthy()
      expect(dropdown.style.top).toBe('')
      expect(Number.parseInt(dropdown.style.maxHeight, 10)).toBeGreaterThanOrEqual(160)
    })

    getBoundingClientRectSpy.mockRestore()
  })

  it('permite borrar el texto del buscador con el dropdown abierto', async () => {
    render(<UserSelector selectedUserId={null} onSelect={vi.fn()} />)

    const input = screen.getByTestId('user-selector-input') as HTMLInputElement
    await act(async () => {
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'andres' } })
    })

    await screen.findByTestId('user-selector-dropdown')

    await act(async () => {
      fireEvent.click(screen.getByTestId('user-selector-clear'))
    })

    expect(input.value).toBe('')
  })

  it('filtra al instante en cliente sin volver a consultar al escribir', async () => {
    render(<UserSelector selectedUserId={null} onSelect={vi.fn()} />)

    await waitFor(() => expect(searchProfilesMock).toHaveBeenCalledTimes(1))

    const input = screen.getByTestId('user-selector-input')
    await act(async () => {
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'jef' } })
    })

    expect(await screen.findByText(/Jeffrey/i)).toBeInTheDocument()
    expect(screen.queryByText(/Andrés/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/José/i)).not.toBeInTheDocument()
    expect(searchProfilesMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.change(input, { target: { value: 'andres' } })
    })

    expect(await screen.findByText(/Andrés/i)).toBeInTheDocument()
    expect(screen.queryByText(/Jeffrey/i)).not.toBeInTheDocument()
    expect(searchProfilesMock).toHaveBeenCalledTimes(1)
  })

  it('cierra el listado al tocar fuera', async () => {
    render(
      <div>
        <UserSelector selectedUserId={null} onSelect={vi.fn()} />
        <button type="button" data-testid="outside">fuera</button>
      </div>,
    )

    await act(async () => {
      fireEvent.focus(screen.getByTestId('user-selector-input'))
    })
    expect(await screen.findByTestId('user-selector-dropdown')).toBeInTheDocument()

    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId('outside'))
    })

    await waitFor(() => {
      expect(screen.queryByTestId('user-selector-dropdown')).not.toBeInTheDocument()
    })
  })
})
