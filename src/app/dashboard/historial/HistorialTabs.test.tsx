/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HistorialTabs from './HistorialTabs'

let mockPath = '/dashboard/historial/lecturas'

vi.mock('next/navigation', () => ({
    usePathname: () => mockPath,
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => k, language: 'es-ES' }),
}))

describe('HistorialTabs', () => {
    it('renderiza los dos enlaces de la sección Historial', () => {
        mockPath = '/dashboard/historial/lecturas'
        render(<HistorialTabs />)
        const lecturas = screen.getByRole('link', { name: /nav\.lecturas/ })
        const temas = screen.getByRole('link', { name: /nav\.temasAlabanza/ })
        expect(lecturas).toHaveAttribute('href', '/dashboard/historial/lecturas')
        expect(temas).toHaveAttribute('href', '/dashboard/historial/temas-alabanza')
    })

    it('marca "Lecturas" como activa cuando la ruta es lecturas', () => {
        mockPath = '/dashboard/historial/lecturas'
        render(<HistorialTabs />)
        const lecturas = screen.getByRole('link', { name: /nav\.lecturas/ })
        // La pestaña activa usa el gradiente marino.
        expect(lecturas.className).toContain('from-[#1f2e85]')
    })

    it('marca "Temas Alabanza" como activa cuando la ruta es temas-alabanza', () => {
        mockPath = '/dashboard/historial/temas-alabanza'
        render(<HistorialTabs />)
        const temas = screen.getByRole('link', { name: /nav\.temasAlabanza/ })
        expect(temas.className).toContain('from-[#1f2e85]')
    })
})
