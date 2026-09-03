/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CultoNavigator from './CultoNavigator'
import type { Culto, LecturaBiblica } from '@/types/database'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        language: 'es-ES',
        t: (key: string) => key,
    }),
}))

vi.mock('framer-motion', () => ({
    motion: {
        button: ({ whileTap: _whileTap, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { whileTap?: unknown }) => (
            <button {...props} />
        ),
        div: ({ whileTap: _whileTap, ...props }: React.HTMLAttributes<HTMLDivElement> & { whileTap?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => (
            <div {...props} />
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const getCultosByDate = vi.fn()
const getCultosByDateRange = vi.fn()
const getCultoIndicatorsForRange = vi.fn()

vi.mock('@/app/dashboard/cultos/actions', () => ({
    getCultosByDate: (...args: unknown[]) => getCultosByDate(...args),
    getCultosByDateRange: (...args: unknown[]) => getCultosByDateRange(...args),
    getCultoIndicatorsForRange: (...args: unknown[]) => getCultoIndicatorsForRange(...args),
}))

type CultoNav = Culto & { lecturas?: LecturaBiblica[] }

function culto(partial: Partial<CultoNav> & { id: string; fecha: string }): CultoNav {
    return {
        hora_inicio: '19:00:00',
        estado: 'planeado',
        tipo_culto: { nombre: 'Estudio Bíblico', color: '#1f2e85' },
        ...partial,
    } as CultoNav
}

const NOW = new Date('2026-09-03T12:00:00')
const TODAY = culto({ id: 'hoy', fecha: '2026-09-03', tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' } })

function renderNav(props: Partial<React.ComponentProps<typeof CultoNavigator>> = {}) {
    return render(
        <CultoNavigator
            initialCulto={TODAY}
            initialDate="2026-09-03"
            esHoy
            now={NOW}
            {...props}
        >
            {(c, loading) => (
                <div>
                    {loading ? (
                        <span data-testid="nav-loading">loading</span>
                    ) : (
                        <>
                            <span data-testid="culto-nombre">{c?.tipo_culto?.nombre ?? 'none'}</span>
                            <span data-testid="culto-intro">{c?.id_usuario_intro ?? 'none'}</span>
                            <span data-testid="culto-hora">{c?.hora_inicio?.slice(0, 5) ?? ''}</span>
                            <span data-testid="culto-estado">{c?.estado ?? ''}</span>
                        </>
                    )}
                </div>
            )}
        </CultoNavigator>,
    )
}

describe('CultoNavigator', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getCultoIndicatorsForRange.mockResolvedValue({ success: true, data: [] })
        // No aplicar un rango vacío al montar: eso borraría el culto de SSR.
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockResolvedValue({ success: true, data: [] })
    })

    it('pinta el día inicial al instante con el culto de SSR', async () => {
        renderNav()
        expect(await screen.findByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-03')
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Enseñanza')
    })

    it('al pulsar siguiente el día cambia sin esperar a la red y el botón sigue activo', async () => {
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockReturnValue(new Promise(() => undefined))
        renderNav()
        await screen.findByTestId('dashboard-nav-date')

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })

        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-04')
        expect(screen.getByTestId('dashboard-nav-next')).not.toBeDisabled()
        expect(screen.getByTestId('dashboard-nav-prev')).not.toBeDisabled()
    })

    it('con el rango en caché, ir y volver no vuelve a pedir el día ya visto', async () => {
        getCultosByDateRange.mockResolvedValue({
            success: true,
            data: [
                TODAY,
                culto({ id: 'viernes', fecha: '2026-09-04', tipo_culto: { nombre: 'Alabanza', color: '#b8964a' } }),
            ],
        })
        renderNav()
        await waitFor(() => {
            expect(getCultosByDateRange).toHaveBeenCalled()
        })
        await act(async () => {
            await Promise.resolve()
        })

        getCultosByDate.mockClear()

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-04')
        await waitFor(() => {
            expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Alabanza')
        })
        expect(getCultosByDate.mock.calls.map((c: unknown[]) => c[0])).not.toContain('2026-09-04')

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-prev'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-03')
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Enseñanza')
    })

    it('ignora la respuesta lenta de un día si el usuario ya saltó a otro', async () => {
        const pending = new Map<string, (value: unknown) => void>()
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockImplementation((fecha: string) => new Promise((resolve) => {
            pending.set(fecha, resolve)
        }))
        renderNav()
        await screen.findByTestId('dashboard-nav-date')

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-05')

        await act(async () => {
            pending.get('2026-09-04')?.({
                success: true,
                data: [culto({ id: 'tarde', fecha: '2026-09-04', tipo_culto: { nombre: 'Alabanza', color: '#b8964a' } })],
            })
        })

        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-05')
        expect(screen.queryByTestId('culto-nombre')?.textContent).not.toBe('Alabanza')

        await act(async () => {
            pending.get('2026-09-05')?.({
                success: true,
                data: [culto({ id: 'sabado', fecha: '2026-09-05', tipo_culto: { nombre: 'Estudio Bíblico', color: '#1f2e85' } })],
            })
        })
        await waitFor(() => {
            expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Estudio Bíblico')
        })
    })

    it('respeta los límites de ±1 semana', async () => {
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockResolvedValue({ success: true, data: [] })
        renderNav()
        await screen.findByTestId('dashboard-nav-date')

        const prev = screen.getByTestId('dashboard-nav-prev')
        for (let i = 0; i < 20; i++) {
            if ((prev as HTMLButtonElement).disabled) break
            await act(async () => {
                fireEvent.click(prev)
            })
        }
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-08-24')
        expect(prev).toBeDisabled()

        const next = screen.getByTestId('dashboard-nav-next')
        for (let i = 0; i < 30; i++) {
            if ((next as HTMLButtonElement).disabled) break
            await act(async () => {
                fireEvent.click(next)
            })
        }
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-13')
        expect(next).toBeDisabled()
    })

    it('domingo dual: muestra 10h por defecto a mediodía y permite cambiar a 17h', async () => {
        const c10 = culto({
            id: 'am',
            fecha: '2026-09-06',
            hora_inicio: '10:00:00',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
        })
        const c17 = culto({
            id: 'pm',
            fecha: '2026-09-06',
            hora_inicio: '17:00:00',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
        })
        renderNav({
            now: new Date('2026-09-06T12:00:00'),
            initialDate: '2026-09-06',
            initialCulto: c10,
            initialDayCultos: [c10, c17],
        })
        await screen.findByTestId('dashboard-nav-hours')
        const hours = screen.getByTestId('dashboard-nav-hours')
        expect(hours.textContent).toMatch(/10:00/)
        expect(hours.textContent).toMatch(/17:00/)

        const pmBtn = screen.getByRole('button', { name: /17:00/ })
        await act(async () => {
            fireEvent.click(pmBtn)
        })
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Enseñanza')
        expect(pmBtn.className).toMatch(/from-\[#1f2e85\]/)
    })

    it('tres pulsaciones seguidas avanzan tres días (no se pierde el clic)', async () => {
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockResolvedValue({ success: true, data: [] })
        renderNav()
        await screen.findByTestId('dashboard-nav-date')

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })

        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-06')
        expect(screen.getByTestId('dashboard-nav-content')).toBeTruthy()
    })

    it('con rango SSR, siguiente muestra el culto al instante sin pedir el día', async () => {
        getCultosByDateRange.mockReturnValue(new Promise(() => undefined))
        getCultosByDate.mockReturnValue(new Promise(() => undefined))
        const viernes = culto({
            id: 'viernes',
            fecha: '2026-09-04',
            tipo_culto: { nombre: 'Alabanza', color: '#b8964a' },
        })
        renderNav({
            initialRangeCultos: [TODAY, viernes],
        })
        await screen.findByTestId('dashboard-nav-date')
        getCultosByDate.mockClear()

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })

        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-04')
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Alabanza')
        expect(screen.queryByTestId('nav-loading')).not.toBeInTheDocument()
        expect(getCultosByDate).not.toHaveBeenCalled()

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-05')
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('none')
        expect(screen.queryByTestId('nav-loading')).not.toBeInTheDocument()
    })

    it('un prefetch vacío no pisa un día que el rango ya trajo', async () => {
        const viernes = culto({
            id: 'viernes',
            fecha: '2026-09-04',
            tipo_culto: { nombre: 'Alabanza', color: '#b8964a' },
        })
        getCultosByDateRange.mockResolvedValue({ success: true, data: [TODAY, viernes] })
        getCultosByDate.mockResolvedValue({ success: true, data: [] })
        renderNav()
        await waitFor(() => {
            expect(getCultosByDateRange).toHaveBeenCalled()
        })
        await act(async () => {
            await Promise.resolve()
        })

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-04')
        await waitFor(() => {
            expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Alabanza')
        })
    })

    async function flushFocusRefresh() {
        await act(async () => {
            window.dispatchEvent(new Event('focus'))
            await new Promise((resolve) => setTimeout(resolve, 200))
        })
    }

    it('con un diálogo abierto, el focus de ventana no refetch', async () => {
        getCultosByDateRange.mockResolvedValue({ success: true, data: [TODAY] })
        renderNav({ initialRangeCultos: [TODAY], initialDayCultos: [TODAY] })
        await waitFor(() => {
            expect(getCultosByDateRange).toHaveBeenCalled()
        })
        const calls = getCultosByDateRange.mock.calls.length
        const dialog = document.createElement('div')
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        document.body.appendChild(dialog)
        await flushFocusRefresh()
        expect(getCultosByDateRange.mock.calls.length).toBe(calls)
        dialog.remove()
    })

    it('un refetch del rango sustituye la asignación cacheada', async () => {
        const stale = culto({
            id: 'hoy',
            fecha: '2026-09-03',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
            id_usuario_intro: 'rafael',
        })
        getCultosByDateRange.mockResolvedValue({ success: true, data: [stale] })
        renderNav({
            initialCulto: stale,
            initialDayCultos: [stale],
            initialRangeCultos: [stale],
        })
        expect(await screen.findByTestId('culto-intro')).toHaveTextContent('rafael')

        const fresh = culto({
            id: 'hoy',
            fecha: '2026-09-03',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
            id_usuario_intro: 'hugo',
        })
        getCultosByDateRange.mockResolvedValue({ success: true, data: [fresh] })
        await flushFocusRefresh()
        await waitFor(() => {
            expect(screen.getByTestId('culto-intro')).toHaveTextContent('hugo')
        })
        expect(screen.queryByTestId('nav-loading')).not.toBeInTheDocument()
    })

    it('si el servidor ya no trae el culto, el día pasa a vacío', async () => {
        renderNav({ initialRangeCultos: [TODAY], initialDayCultos: [TODAY] })
        expect(await screen.findByTestId('culto-nombre')).toHaveTextContent('Enseñanza')

        getCultosByDateRange.mockResolvedValue({ success: true, data: [] })
        await flushFocusRefresh()
        await waitFor(() => {
            expect(screen.getByTestId('culto-nombre')).toHaveTextContent('none')
        })
    })

    it('un refetch fallido no borra lo que ya se ve', async () => {
        renderNav({ initialRangeCultos: [TODAY], initialDayCultos: [TODAY] })
        expect(await screen.findByTestId('culto-nombre')).toHaveTextContent('Enseñanza')

        getCultosByDateRange.mockResolvedValue({ success: false, error: 'red caída' })
        await flushFocusRefresh()
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Enseñanza')
        expect(screen.getByTestId('dashboard-nav-next')).not.toBeDisabled()
    })

    it('props SSR nuevas (router.refresh) actualizan el culto visible', async () => {
        const stale = culto({
            id: 'hoy',
            fecha: '2026-09-03',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
            id_usuario_intro: 'rafael',
        })
        const view = renderNav({
            initialCulto: stale,
            initialDayCultos: [stale],
            initialRangeCultos: [stale],
        })
        expect(await screen.findByTestId('culto-intro')).toHaveTextContent('rafael')

        const fresh = culto({
            id: 'hoy',
            fecha: '2026-09-03',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
            id_usuario_intro: 'hugo',
            estado: 'realizado',
        })
        view.rerender(
            <CultoNavigator
                initialCulto={fresh}
                initialDate="2026-09-03"
                esHoy
                now={NOW}
                initialDayCultos={[fresh]}
                initialRangeCultos={[fresh]}
            >
                {(c, loading) => (
                    <div>
                        {loading ? (
                            <span data-testid="nav-loading">loading</span>
                        ) : (
                            <>
                                <span data-testid="culto-nombre">{c?.tipo_culto?.nombre ?? 'none'}</span>
                                <span data-testid="culto-intro">{c?.id_usuario_intro ?? 'none'}</span>
                                <span data-testid="culto-hora">{c?.hora_inicio?.slice(0, 5) ?? ''}</span>
                                <span data-testid="culto-estado">{c?.estado ?? ''}</span>
                            </>
                        )}
                    </div>
                )}
            </CultoNavigator>,
        )
        await waitFor(() => {
            expect(screen.getByTestId('culto-intro')).toHaveTextContent('hugo')
        })
        expect(screen.getByTestId('culto-estado')).toHaveTextContent('realizado')
    })

    it('en domingo dual, un refresh actualiza las 17h sin volver a las 10h', async () => {
        const c10 = culto({
            id: 'am',
            fecha: '2026-09-06',
            hora_inicio: '10:00:00',
            id_usuario_intro: 'a',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
        })
        const c17 = culto({
            id: 'pm',
            fecha: '2026-09-06',
            hora_inicio: '17:00:00',
            id_usuario_intro: 'rafael',
            tipo_culto: { nombre: 'Enseñanza', color: '#1f2e85' },
        })
        renderNav({
            now: new Date('2026-09-06T12:00:00'),
            initialDate: '2026-09-06',
            initialCulto: c10,
            initialDayCultos: [c10, c17],
            initialRangeCultos: [c10, c17],
        })
        await screen.findByTestId('dashboard-nav-hours')
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /17:00/ }))
        })
        expect(screen.getByTestId('culto-hora')).toHaveTextContent('17:00')
        expect(screen.getByTestId('culto-intro')).toHaveTextContent('rafael')

        const c17b = { ...c17, id_usuario_intro: 'hugo' }
        getCultosByDateRange.mockResolvedValue({ success: true, data: [c10, c17b] })
        await flushFocusRefresh()
        await waitFor(() => {
            expect(screen.getByTestId('culto-intro')).toHaveTextContent('hugo')
        })
        expect(screen.getByTestId('culto-hora')).toHaveTextContent('17:00')
    })

    it('tras un refresh, siguiente sigue saliendo de caché sin pedir el día', async () => {
        const viernes = culto({
            id: 'viernes',
            fecha: '2026-09-04',
            tipo_culto: { nombre: 'Alabanza', color: '#b8964a' },
        })
        getCultosByDateRange.mockResolvedValue({ success: true, data: [TODAY, viernes] })
        renderNav({ initialRangeCultos: [TODAY, viernes], initialDayCultos: [TODAY] })
        await screen.findByTestId('dashboard-nav-date')
        await waitFor(() => expect(getCultosByDateRange).toHaveBeenCalled())
        getCultosByDate.mockClear()

        await act(async () => {
            fireEvent.click(screen.getByTestId('dashboard-nav-next'))
        })
        expect(screen.getByTestId('dashboard-nav-date')).toHaveAttribute('data-date', '2026-09-04')
        expect(screen.getByTestId('culto-nombre')).toHaveTextContent('Alabanza')
        expect(getCultosByDate).not.toHaveBeenCalled()
    })
})
