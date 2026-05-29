/**
 * @vitest-environment happy-dom
 * QA senior: liquid glass premium — contraste, clases glass, accesibilidad básica.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonaPicker } from './PersonaPicker'
import type { OfrMiembro, OfrServicio } from './actions'
import { OFRENDA_MOBILE_TABLET_MQ, resetOfrendaMqCacheForTests } from './ofrendaViewport'

const miembros: OfrMiembro[] = [
    {
        id: 'a1',
        nombre: 'Hugo Bolaños',
        grupo: 1,
        activo: true,
        orden: 1,
        profile_id: null,
        created_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'a2',
        nombre: 'Yesid Payares',
        grupo: 2,
        activo: true,
        orden: 2,
        profile_id: null,
        created_at: '2026-01-01T00:00:00Z',
    },
]

const servicio = {
    id: 's1',
    fecha: '2026-05-07',
    dia_tipo: 'jueves',
    semana_iso: 19,
    mes: 5,
    anio: 2026,
} as OfrServicio

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.picker.title': 'Asignar persona',
                'ofrenda.picker.current': 'Asignación actual',
                'ofrenda.picker.search': 'Buscar por nombre...',
                'ofrenda.picker.unassign': 'Sin asignar',
                'common.close': 'Cerrar',
            }
            return map[key] ?? key
        },
        language: 'es-ES',
    }),
}))

vi.mock('./ofrendaLocale', () => ({
    formatServicioFechaLabel: () => 'Jue 7 may',
}))

const mqMatches = { current: false }

function mockViewport(mobileOrTablet: boolean) {
    resetOfrendaMqCacheForTests()
    mqMatches.current = mobileOrTablet
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation(() => ({
            get matches() {
                return mqMatches.current
            },
            media: OFRENDA_MOBILE_TABLET_MQ,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
}

const pickerProps = {
    open: true as const,
    onClose: vi.fn(),
    miembros,
    selectedId: 'a2' as const,
    onSelect: vi.fn(),
    context: {
        servicio,
        rolLabel: 'Colaborador 3',
        headerColorClass: 'text-emerald-400',
    },
}

describe('PersonaPicker — liquid glass móvil / tablet', () => {
    beforeEach(() => {
        mockViewport(true)
        document.documentElement.classList.add('dark')
    })

    afterEach(() => {
        document.documentElement.classList.remove('dark')
        document.body.style.overflow = ''
        resetOfrendaMqCacheForTests()
    })

    it('no renderiza cuando está cerrado', () => {
        render(
            <PersonaPicker
                open={false}
                onClose={vi.fn()}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('monta sheet premium con backdrop y dialog accesible', () => {
        render(
            <PersonaPicker
                open
                onClose={vi.fn()}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )

        const dialog = screen.getByRole('dialog', { name: 'Asignar persona' })
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveAttribute('aria-modal', 'true')

        const root = screen.getByTestId('ofrenda-picker-root')
        expect(root).toHaveClass('ofrenda-liquid-root')

        const sheet = screen.getByTestId('ofrenda-picker-sheet')
        expect(sheet).toHaveClass('ofrenda-liquid-sheet')

        const backdrop = screen.getByTestId('ofrenda-picker-backdrop')
        expect(backdrop).toHaveClass('ofrenda-liquid-backdrop')

        expect(screen.getByText('Colaborador 3')).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-picker-current-name')).toHaveTextContent('Yesid Payares')
        expect(screen.getByTestId('ofrenda-picker-member-a2')).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-picker-search')).toHaveClass('ofrenda-liquid-search')
    })

    it('marca seleccionado con clase premium y contraste navy', () => {
        render(
            <PersonaPicker
                open
                onClose={vi.fn()}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )

        const selected = screen.getByTestId('ofrenda-picker-member-a2')
        expect(selected).toHaveClass('ofrenda-liquid-member--selected')

        const unselected = screen.getByTestId('ofrenda-picker-member-a1')
        expect(unselected).not.toHaveClass('ofrenda-liquid-member--selected')
    })

    it('cierra con Escape y bloquea scroll del body', () => {
        const onClose = vi.fn()
        render(
            <PersonaPicker
                open
                onClose={onClose}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )

        expect(document.body.style.position).toBe('fixed')
        expect(document.body.style.overflow).toBe('hidden')
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('filtra miembros por búsqueda', () => {
        render(
            <PersonaPicker
                open
                onClose={vi.fn()}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )

        fireEvent.change(screen.getByTestId('ofrenda-picker-search'), {
            target: { value: 'Hugo' },
        })

        const list = screen.getByTestId('ofrenda-picker-member-list')
        expect(list).toHaveTextContent('Hugo Bolaños')
        expect(list).not.toHaveTextContent('Yesid Payares')
    })

    it('mantiene superficie clara en tema oscuro (color-scheme light)', () => {
        render(
            <PersonaPicker
                open
                onClose={vi.fn()}
                miembros={miembros}
                selectedId="a2"
                onSelect={vi.fn()}
                context={{
                    servicio,
                    rolLabel: 'Colaborador 3',
                    headerColorClass: 'text-emerald-400',
                }}
            />,
        )

        const sheet = screen.getByTestId('ofrenda-picker-sheet')
        expect(sheet).toHaveClass('ofrenda-liquid-sheet')
        expect(sheet.className).not.toMatch(/bg-muted\/|bg-background\/\d/)
    })
})

describe('PersonaPicker — liquid glass desktop', () => {
    beforeEach(() => {
        mockViewport(false)
        document.documentElement.classList.add('dark')
    })

    afterEach(() => {
        document.documentElement.classList.remove('dark')
        document.body.style.overflow = ''
        resetOfrendaMqCacheForTests()
    })

    it('monta panel centrado premium (no popover del tema)', () => {
        render(<PersonaPicker {...pickerProps} />)

        expect(screen.getByTestId('ofrenda-picker-root')).toHaveClass('ofrenda-liquid-root')

        const panel = screen.getByTestId('ofrenda-picker-panel')
        expect(panel).toHaveClass('ofrenda-liquid-panel')
        expect(panel).toHaveClass('ofrenda-liquid-surface')
        expect(screen.queryByTestId('ofrenda-picker-sheet')).not.toBeInTheDocument()

        expect(screen.getByTestId('ofrenda-picker-backdrop')).toHaveClass('ofrenda-liquid-backdrop')
        expect(screen.getByTestId('ofrenda-picker-search')).toHaveClass('ofrenda-liquid-search')
    })

    it('lista con tarjetas liquid en desktop', () => {
        render(<PersonaPicker {...pickerProps} />)

        const selected = screen.getByTestId('ofrenda-picker-member-a2')
        expect(selected).toHaveClass('ofrenda-liquid-member--selected')
        expect(selected.className).not.toMatch(/bg-primary/)
    })

    it('el seleccionado mantiene ambas clases member (hover CSS seguro)', () => {
        render(<PersonaPicker {...pickerProps} />)

        const selected = screen.getByTestId('ofrenda-picker-member-a2')
        expect(selected).toHaveClass('ofrenda-liquid-member')
        expect(selected).toHaveClass('ofrenda-liquid-member--selected')

        const unselected = screen.getByTestId('ofrenda-picker-member-a1')
        expect(unselected).toHaveClass('ofrenda-liquid-member')
        expect(unselected).not.toHaveClass('ofrenda-liquid-member--selected')
    })

    it('dialog accesible en pantalla completa', () => {
        render(<PersonaPicker {...pickerProps} />)

        const dialog = screen.getByRole('dialog', { name: 'Asignar persona' })
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(screen.getByTestId('ofrenda-picker-current-name')).toHaveTextContent('Yesid Payares')
    })
})
