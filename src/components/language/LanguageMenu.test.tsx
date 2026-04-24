/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LanguageMenu } from './LanguageMenu'
import type { Language, TranslationKey } from '@/lib/i18n/types'

const t = (key: TranslationKey) => {
    const map: Partial<Record<TranslationKey, string>> = {
        'common.language.ariaGroup': 'Idioma',
        'common.language.openMenu': 'Elegir idioma',
        'common.language.nameEs': 'Español',
        'common.language.nameCa': 'Català',
        'common.language.ariaSelectEs': 'Español',
        'common.language.ariaSelectCa': 'Català',
    }
    return map[key] ?? String(key)
}

describe('LanguageMenu (UI/UX)', () => {
    it('el disparador muestra la bandera del idioma activo (ES / CA)', () => {
        const { rerender } = render(<LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="login" />)
        expect(screen.getByTestId('language-trigger-flag-es')).toBeInTheDocument()
        expect(screen.queryByTestId('language-trigger-flag-ca')).toBeNull()

        rerender(<LanguageMenu language="ca-ES" setLanguage={vi.fn()} t={t} variant="login" />)
        expect(screen.getByTestId('language-trigger-flag-ca')).toBeInTheDocument()
        expect(screen.queryByTestId('language-trigger-flag-es')).toBeNull()
    })

    it('aria del disparador indica menú + idioma actual', () => {
        render(<LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="profile" />)
        const btn = screen.getByTestId('language-menu-trigger')
        expect(btn).toHaveAttribute('aria-label', 'Elegir idioma: Español')
    })

    it('solo muestra el disparador hasta que se abre el menú', () => {
        render(<LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="login" />)
        expect(screen.queryByRole('menu')).toBeNull()
        expect(screen.getByTestId('language-menu-trigger')).toBeInTheDocument()
    })

    it('abre menú — AMBAS opciones visibles (Español y Català)', async () => {
        const setLanguage = vi.fn()
        render(<LanguageMenu language="es-ES" setLanguage={setLanguage} t={t} variant="login" />)
        fireEvent.click(screen.getByTestId('language-menu-trigger'))

        expect(screen.getByRole('menu')).toBeInTheDocument()
        // Las dos opciones deben estar presentes siempre
        expect(screen.getByTestId('language-select-es')).toBeInTheDocument()
        expect(screen.getByTestId('language-select-ca')).toBeInTheDocument()

        // Elegir catalán cierra el menú
        fireEvent.click(screen.getByTestId('language-select-ca'))
        expect(setLanguage).toHaveBeenCalledWith('ca-ES')
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('cierra con Escape', async () => {
        render(<LanguageMenu language="ca-ES" setLanguage={vi.fn()} t={t} variant="login" />)
        fireEvent.click(screen.getByTestId('language-menu-trigger'))
        expect(screen.getByRole('menu')).toBeInTheDocument()
        fireEvent.keyDown(document, { key: 'Escape' })
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('cierra al hacer clic fuera del menú', async () => {
        render(
            <div>
                <LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="login" />
                <button type="button" data-testid="outside">fuera</button>
            </div>
        )
        fireEvent.click(screen.getByTestId('language-menu-trigger'))
        expect(screen.getByRole('menu')).toBeInTheDocument()
        fireEvent.mouseDown(screen.getByTestId('outside'))
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    })

    it('menuitemradio refleja la selección actual (aria-checked)', () => {
        let language: Language = 'ca-ES'
        const { rerender } = render(
            <LanguageMenu language={language} setLanguage={vi.fn()} t={t} variant="profile" />
        )
        fireEvent.click(screen.getByTestId('language-menu-trigger'))

        // CA activo
        expect(screen.getByTestId('language-select-ca')).toHaveAttribute('aria-checked', 'true')
        expect(screen.getByTestId('language-select-es')).toHaveAttribute('aria-checked', 'false')

        // Cambiar a ES
        language = 'es-ES'
        rerender(<LanguageMenu language={language} setLanguage={vi.fn()} t={t} variant="profile" />)
        expect(screen.getByTestId('language-select-es')).toHaveAttribute('aria-checked', 'true')
        expect(screen.getByTestId('language-select-ca')).toHaveAttribute('aria-checked', 'false')
    })

    it('el texto de las opciones NO queda recortado (scrollWidth ≤ clientWidth + 2)', () => {
        render(<LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="login" />)
        fireEvent.click(screen.getByTestId('language-menu-trigger'))
        const esBtn = screen.getByTestId('language-select-es') as HTMLButtonElement
        const caBtn = screen.getByTestId('language-select-ca') as HTMLButtonElement
        expect(esBtn.scrollWidth).toBeLessThanOrEqual(esBtn.clientWidth + 2)
        expect(caBtn.scrollWidth).toBeLessThanOrEqual(caBtn.clientWidth + 2)
    })

    it('el panel tiene role="menu" y aria-label en el idioma activo', () => {
        render(<LanguageMenu language="es-ES" setLanguage={vi.fn()} t={t} variant="sidebar" />)
        fireEvent.click(screen.getByTestId('language-menu-trigger'))
        const menu = screen.getByRole('menu')
        expect(menu).toHaveAttribute('aria-label', 'Idioma')
    })
})
