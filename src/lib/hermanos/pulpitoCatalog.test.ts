/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const searchProfilesMock = vi.fn()
vi.mock('@/app/dashboard/cultos/[id]/actions', () => ({
    searchProfiles: (...args: unknown[]) => searchProfilesMock(...args),
}))

import { loadPulpitoCatalog, peekPulpitoCatalog, resetPulpitoCatalog } from './pulpitoCatalog'

const ANDRES = {
    id: 'u1',
    nombre: 'Andres',
    apellidos: 'Zapata',
    email: 'andres@example.com',
    email_contacto: null,
    telefono: null,
    rol: 'MIEMBRO' as const,
    avatar_url: null,
    pulpito: true,
    created_at: '2026-01-01T00:00:00Z',
}

describe('pulpitoCatalog', () => {
    beforeEach(() => {
        resetPulpitoCatalog()
        vi.clearAllMocks()
        searchProfilesMock.mockResolvedValue({ data: [ANDRES] })
        document.cookie = 'idmji-sede-activa=sede-test'
    })

    it('deduplica la carga: varios callers comparten un solo fetch', async () => {
        const [a, b] = await Promise.all([loadPulpitoCatalog(), loadPulpitoCatalog()])
        expect(searchProfilesMock).toHaveBeenCalledTimes(1)
        expect(a).toEqual([ANDRES])
        expect(b).toEqual([ANDRES])
        expect(peekPulpitoCatalog()).toEqual([ANDRES])
    })

    it('reutiliza el catálogo fresco sin volver a pedir al servidor', async () => {
        await loadPulpitoCatalog()
        await loadPulpitoCatalog()
        expect(searchProfilesMock).toHaveBeenCalledTimes(1)
    })

    it('con force vuelve a pedir la lista', async () => {
        await loadPulpitoCatalog()
        await loadPulpitoCatalog(true)
        expect(searchProfilesMock).toHaveBeenCalledTimes(2)
    })
})
