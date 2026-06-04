/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemberTurnAvailability, TurnAvailabilityDots } from './MemberTurnAvailability'

const labels = {
    jueves: 'Jueves',
    domManana: 'Dom. mañana',
    domTarde: 'Dom. tarde',
}

describe('TurnAvailabilityDots', () => {
    it('muestra tres indicadores según disponibilidad', () => {
        render(
            <TurnAvailabilityDots
                value={{
                    puede_jueves: true,
                    puede_domingo_manana: false,
                    puede_domingo_tarde: false,
                }}
                color="emerald"
                testIdPrefix="dots"
            />,
        )
        expect(screen.getByTestId('dots-summary')).toBeInTheDocument()
    })
})

describe('MemberTurnAvailability — una sola fila', () => {
    it('solo muestra los tres turnos, sin presets', () => {
        render(
            <MemberTurnAvailability
                value={{
                    puede_jueves: true,
                    puede_domingo_manana: true,
                    puede_domingo_tarde: false,
                }}
                onChange={vi.fn()}
                color="emerald"
                labels={labels}
                testIdPrefix="turns-test"
            />,
        )
        expect(screen.getByTestId('turns-test-chips')).toBeInTheDocument()
        expect(screen.queryByTestId('turns-test-preset-jueves')).not.toBeInTheDocument()
        expect(screen.getByTestId('turns-test-puede_jueves')).toBeInTheDocument()
        expect(screen.getByTestId('turns-test-puede_domingo_manana')).toBeInTheDocument()
        expect(screen.getByTestId('turns-test-puede_domingo_tarde')).toBeInTheDocument()
    })

    it('toggle domingo mañana apaga solo ese flag', () => {
        const onChange = vi.fn()
        render(
            <MemberTurnAvailability
                value={{
                    puede_jueves: true,
                    puede_domingo_manana: true,
                    puede_domingo_tarde: false,
                }}
                onChange={onChange}
                color="blue"
                labels={labels}
                testIdPrefix="turns-test"
            />,
        )
        fireEvent.click(screen.getByTestId('turns-test-puede_domingo_manana'))
        expect(onChange).toHaveBeenCalledWith({
            puede_jueves: true,
            puede_domingo_manana: false,
            puede_domingo_tarde: false,
        })
    })

    it('permite dejar los tres turnos apagados', () => {
        const onChange = vi.fn()
        render(
            <MemberTurnAvailability
                value={{
                    puede_jueves: true,
                    puede_domingo_manana: false,
                    puede_domingo_tarde: false,
                }}
                onChange={onChange}
                color="emerald"
                labels={labels}
                testIdPrefix="turns-test"
            />,
        )
        fireEvent.click(screen.getByTestId('turns-test-puede_jueves'))
        expect(onChange).toHaveBeenCalledWith({
            puede_jueves: false,
            puede_domingo_manana: false,
            puede_domingo_tarde: false,
        })
    })
})
