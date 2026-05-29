/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanMonthNavigator } from './PlanMonthNavigator'

describe('PlanMonthNavigator', () => {
    it('centra el título entre flechas con flex-1', () => {
        render(
            <PlanMonthNavigator
                title="Mayo 2026"
                onPrev={vi.fn()}
                onNext={vi.fn()}
                prevAriaLabel="Mes anterior"
                nextAriaLabel="Mes siguiente"
            />
        )
        const title = screen.getByTestId('ofrenda-month-title')
        expect(title).toHaveClass('flex-1', 'text-center')
        expect(screen.getByText('Mayo 2026')).toBeInTheDocument()
    })

    it('navega con las flechas', () => {
        const onPrev = vi.fn()
        const onNext = vi.fn()
        render(
            <PlanMonthNavigator
                title="Mayo 2026"
                onPrev={onPrev}
                onNext={onNext}
                prevAriaLabel="Mes anterior"
                nextAriaLabel="Mes siguiente"
            />
        )
        fireEvent.click(screen.getByLabelText('Mes anterior'))
        fireEvent.click(screen.getByLabelText('Mes siguiente'))
        expect(onPrev).toHaveBeenCalledOnce()
        expect(onNext).toHaveBeenCalledOnce()
    })

    it('muestra skeleton al cargar', () => {
        render(
            <PlanMonthNavigator
                title="Mayo 2026"
                isLoading
                onPrev={vi.fn()}
                onNext={vi.fn()}
                prevAriaLabel="Mes anterior"
                nextAriaLabel="Mes siguiente"
            />
        )
        expect(screen.getByTestId('ofrenda-month-title-skeleton')).toBeInTheDocument()
        expect(screen.queryByText('Mayo 2026')).not.toBeInTheDocument()
    })

    it('la barra ocupa todo el ancho disponible', () => {
        render(
            <PlanMonthNavigator
                title="Mayo 2026"
                onPrev={vi.fn()}
                onNext={vi.fn()}
                prevAriaLabel="Mes anterior"
                nextAriaLabel="Mes siguiente"
            />
        )
        expect(screen.getByTestId('ofrenda-month-nav')).toHaveClass('w-full')
    })
})
