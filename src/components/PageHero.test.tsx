/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sparkles } from 'lucide-react'
import PageHero from './PageHero'

describe('PageHero', () => {
    it('renderiza el título', () => {
        render(<PageHero title="Calendario" />)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calendario')
    })

    it('aplica el tratamiento liquid marino + borde dorado (contrato visual)', () => {
        render(<PageHero title="Hola" data-testid="hero" />)
        const hero = screen.getByTestId('hero')
        // Firma del hero premium reutilizado en todo el dashboard.
        expect(hero.className).toContain('border-2')
        expect(hero.className).toContain('border-[#b8964a]')
        expect(hero.className).toContain('from-[#1f2e85]')
        expect(hero.className).toContain('via-[#283593]')
        expect(hero.className).toContain('to-[#151f5c]')
        expect(hero.className).toContain('rounded-[2rem]')
        expect(hero.className).toContain('md:rounded-[3rem]')
    })

    it('renderiza el acento dorado del título como segunda línea', () => {
        render(<PageHero title="Hermanos" titleAccent="de Púlpito" />)
        const heading = screen.getByRole('heading', { level: 1 })
        expect(heading).toHaveTextContent('Hermanos')
        const accent = screen.getByText('de Púlpito')
        expect(accent.className).toContain('bg-clip-text')
        expect(accent.className).toContain('text-transparent')
    })

    it('subtítulo con variante "dot" muestra el punto dorado pulsante', () => {
        const { container } = render(<PageHero title="X" subtitle="Descripción" />)
        expect(screen.getByText('Descripción')).toBeInTheDocument()
        expect(container.querySelector('.animate-pulse')).not.toBeNull()
    })

    it('subtítulo con variante "line" no usa punto pulsante', () => {
        const { container } = render(
            <PageHero title="X" subtitle="Directorio" subtitleVariant="line" />
        )
        expect(screen.getByText('Directorio')).toBeInTheDocument()
        expect(container.querySelector('.animate-pulse')).toBeNull()
    })

    it('no renderiza subtítulo cuando no se pasa', () => {
        const { container } = render(<PageHero title="Solo" />)
        expect(container.querySelector('p')).toBeNull()
    })

    it('renderiza acciones (buscador / botones) a la derecha', () => {
        render(
            <PageHero
                title="X"
                actions={<button type="button">Filtros</button>}
            />
        )
        expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument()
    })

    it('renderiza el icono cuando se pasa', () => {
        const { container } = render(<PageHero title="X" icon={Sparkles} />)
        expect(container.querySelector('svg')).not.toBeNull()
    })

    it('renderiza children en línea bajo el subtítulo', () => {
        render(<PageHero title="X" subtitle="Sub">{<span>selector-inline</span>}</PageHero>)
        expect(screen.getByText('selector-inline')).toBeInTheDocument()
    })

    it('con animate=false sigue siendo accesible y mantiene el contrato visual', () => {
        render(<PageHero title="Estático" animate={false} data-testid="hero-static" />)
        const hero = screen.getByTestId('hero-static')
        expect(hero.className).toContain('from-[#1f2e85]')
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Estático')
    })
})
