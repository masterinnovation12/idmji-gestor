import { describe, expect, it, vi } from 'vitest'
import SaveChangesBar from './SaveChangesBar'

describe('SaveChangesBar', () => {
    it('no renderiza cuando no hay cambios pendientes', () => {
        const result = SaveChangesBar({
            isDirty: false,
            isSaving: false,
            pendingCount: 0,
            onSave: () => { },
            onDiscard: () => { },
        })
        expect(result).toBeNull()
    })

    it('renderiza botones centrados y fondo no transparente', () => {
        const element = SaveChangesBar({
            isDirty: true,
            isSaving: false,
            pendingCount: 2,
            onSave: () => { },
            onDiscard: () => { },
        }) as ReturnType<typeof SaveChangesBar> & { props: { className: string; 'data-testid': string; children: { props: { className: string; children: unknown } } } }
        expect(element.props.className).toContain('flex justify-center')
        expect(element.props['data-testid']).toBe('save-changes-bar')
        const inner = element.props.children
        expect(inner.props.className).toContain('bg-white')
        // Marco liquid: borde dorado fijo (la barra flota siempre clara, como los modales)
        expect(inner.props.className).toContain('border-[rgba(184,150,74,0.45)]')
        expect(inner.props.className).toContain('flex-wrap')
    })

    it('ejecuta callbacks de guardar y descartar', () => {
        const onSave = vi.fn()
        const onDiscard = vi.fn()
        const element = SaveChangesBar({
            isDirty: true,
            isSaving: false,
            pendingCount: 1,
            onSave,
            onDiscard,
        }) as ReturnType<typeof SaveChangesBar> & { props: { children: { props: { children: { props: { onClick: () => void } }[] } } } }
        const innerChildren = element.props.children.props.children
        const discardButton = innerChildren[1]
        const saveButton = innerChildren[2]
        discardButton.props.onClick()
        saveButton.props.onClick()
        expect(onDiscard).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledTimes(1)
    })
})

