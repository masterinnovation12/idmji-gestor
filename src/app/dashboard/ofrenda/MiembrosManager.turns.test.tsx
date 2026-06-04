/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MiembrosManager } from './MiembrosManager'
import { makeOfrMiembro } from './ofrendaTestFixtures'

vi.mock('./actions', () => ({
    upsertMiembro: vi.fn(),
    deleteMiembro: vi.fn(),
    reordenarMiembros: vi.fn(),
    syncHermanos: vi.fn(),
    getMiembros: vi.fn(),
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        language: 'es',
    }),
}))

vi.mock('./ofrendaFeedback', () => ({
    useOfrendaToast: () => ({
        quickError: vi.fn(),
        quickSuccess: vi.fn(),
        quickWarning: vi.fn(),
    }),
}))

import { upsertMiembro, getMiembros } from './actions'

describe('MiembrosManager — turnos colapsables y guardado explícito', () => {
    const initial = [
        makeOfrMiembro({
            id: 'm1',
            nombre: 'Jeffrey Bolaños',
            grupo: 1,
            orden: 0,
            puede_jueves: true,
            puede_domingo_manana: true,
            puede_domingo_tarde: false,
        }),
    ]

    beforeEach(() => {
        vi.mocked(upsertMiembro).mockReset()
        vi.mocked(getMiembros).mockResolvedValue({ data: initial })
    })

    it('panel colapsado: solo puntos, sin chips', () => {
        render(
            <MiembrosManager initialMiembros={initial} canEdit onChange={vi.fn()} />,
        )
        expect(screen.getByTestId('ofrenda-member-turns-m1-summary')).toBeInTheDocument()
        expect(screen.queryByTestId('ofrenda-member-turns-m1-puede_jueves')).not.toBeInTheDocument()
    })

    it('al desmarcar domingo mañana guarda false explícito en BD', async () => {
        vi.mocked(upsertMiembro).mockResolvedValue({
            data: makeOfrMiembro({
                ...initial[0],
                puede_jueves: true,
                puede_domingo_manana: false,
                puede_domingo_tarde: false,
            }),
        })

        render(
            <MiembrosManager initialMiembros={initial} canEdit onChange={vi.fn()} />,
        )

        fireEvent.click(screen.getByTestId('ofrenda-member-turns-toggle-m1'))
        fireEvent.click(screen.getByTestId('ofrenda-member-turns-m1-puede_domingo_manana'))

        await waitFor(() => {
            expect(upsertMiembro).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'm1',
                    puede_jueves: true,
                    puede_domingo_manana: false,
                    puede_domingo_tarde: false,
                }),
            )
        })
    })
})
