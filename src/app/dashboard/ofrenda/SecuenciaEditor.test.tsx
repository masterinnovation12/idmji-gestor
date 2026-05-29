/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SecuenciaEditor } from './SecuenciaEditor'
import { resetOfrendaScrollLockForTests } from './ofrendaScrollLock'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.sequence.edit': 'Editar secuencia',
                'ofrenda.sequence.help': 'Ayuda secuencia',
                'ofrenda.sequence.from': 'Desde',
                'ofrenda.sequence.to': 'Hasta',
                'ofrenda.sequence.preview': 'Vista previa',
                'ofrenda.sequence.limitBadge': 'En {day} cada servicio usa exactamente {required} sacos',
                'ofrenda.sequence.limitCountOk': '{count} sacos — correcto',
                'ofrenda.sequence.limitCountWrong': 'Llevas {count} sacos y deben ser {required}',
                'ofrenda.sequence.limitInlineTooFew':
                    'Te faltan sacos: llevas {count} y en {day} deben ser {required}.',
                'ofrenda.sequence.limitInlineTooMany':
                    'Te sobran sacos: llevas {count} y en {day} deben ser {required}.',
                'ofrenda.table.sacos': 'Sacos',
                'common.cancel': 'Cancelar',
                'common.save': 'Guardar',
                'common.close': 'Cerrar',
                'ofrenda.sequence.applySingle': 'Solo este servicio',
                'ofrenda.sequence.applyForward': 'Este y siguientes',
                'ofrenda.sequence.applyForwardHint': 'Recalcula el resto del mes.',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

const servicioJueves = {
    id: 'srv-1',
    plan_id: 'plan-1',
    fecha: '2026-05-07',
    dia_tipo: 'jueves' as const,
    semana_iso: 1,
    secuencia_desde: 1,
    secuencia_hasta: 4,
    secuencia_texto: '01 al 04',
    posicion: 0,
}

describe('SecuenciaEditor — cantidad exacta de sacos', () => {
    const onSave = vi.fn()
    const onLimitExceeded = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        resetOfrendaScrollLockForTests()
    })

    function renderEditor(overrides?: Partial<Parameters<typeof SecuenciaEditor>[0]>) {
        return render(
            <SecuenciaEditor
                open
                onClose={vi.fn()}
                servicio={servicioJueves}
                initialDesde={1}
                initialHasta={4}
                displayTexto="01 al 04"
                saving={false}
                maxSacos={4}
                secuenciaMaximo={20}
                followingCount={0}
                dayConfigLabel="Jueves"
                onSave={onSave}
                onLimitExceeded={onLimitExceeded}
                {...overrides}
            />
        )
    }

    it('muestra cuántos sacos debe llevar el día', () => {
        renderEditor()
        expect(screen.getByTestId('ofrenda-sequence-limit-badge')).toHaveTextContent(
            'En Jueves cada servicio usa exactamente 4 sacos'
        )
    })

    it('avisa con too_few si 11 al 13 (3 sacos) y el plan pide 4', () => {
        renderEditor({ initialDesde: 11, initialHasta: 13 })
        expect(screen.getByTestId('ofrenda-sequence-preview')).toHaveAttribute(
            'data-sequence-mismatch',
            'true'
        )
        const alert = screen.getByTestId('ofrenda-sequence-limit-alert')
        expect(alert).toHaveAttribute('data-mismatch-reason', 'too_few')
        expect(alert).toHaveTextContent('Te faltan sacos')
        const saveBtn = screen.getByTestId('ofrenda-sequence-save')
        expect(saveBtn).toBeDisabled()
        expect(onSave).not.toHaveBeenCalled()
    })

    it('avisa con too_many si 01 al 08 (8 sacos) y el plan pide 4', () => {
        renderEditor({ initialDesde: 1, initialHasta: 8 })
        expect(screen.getByTestId('ofrenda-sequence-limit-alert')).toHaveAttribute(
            'data-mismatch-reason',
            'too_many'
        )
        expect(screen.getByTestId('ofrenda-sequence-save')).toBeDisabled()
    })

    it('guarda cuando hay exactamente 4 sacos', () => {
        renderEditor()
        expect(screen.getByTestId('ofrenda-sequence-count')).toHaveTextContent('4 sacos — correcto')
        fireEvent.click(screen.getByTestId('ofrenda-sequence-save'))
        expect(onSave).toHaveBeenCalledWith(1, 4, 'single')
        expect(onLimitExceeded).not.toHaveBeenCalled()
    })

    it('ofrece aplicar solo o hacia adelante si hay servicios posteriores', () => {
        renderEditor({ followingCount: 3 })
        expect(screen.getByTestId('ofrenda-sequence-save-forward')).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-sequence-save-single')).toBeInTheDocument()
        expect(screen.queryByTestId('ofrenda-sequence-save')).not.toBeInTheDocument()
        fireEvent.click(screen.getByTestId('ofrenda-sequence-save-forward'))
        expect(onSave).toHaveBeenCalledWith(1, 4, 'forward')
    })
})
