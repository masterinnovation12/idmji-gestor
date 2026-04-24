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
        }) as any
        expect(element.props.className).toContain('flex justify-center')
        expect(element.props['data-testid']).toBe('save-changes-bar')
        const inner = element.props.children
        expect(inner.props.className).toContain('bg-white')
        expect(inner.props.className).toContain('dark:bg-slate-900')
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
        }) as any
        const innerChildren = element.props.children.props.children as any[]
        const discardButton = innerChildren[1]
        const saveButton = innerChildren[2]
        discardButton.props.onClick()
        saveButton.props.onClick()
        expect(onDiscard).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledTimes(1)
    })
})

