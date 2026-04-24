import { describe, expect, it } from 'vitest'
import {
    availabilityEqual,
    cloneProfileForm,
    countFormFieldChanges,
    isAvatarDirty,
    isProfileDirty,
    profilePendingCount,
    type ProfileCommittedSnapshot,
    type ProfileEditorForm,
} from './profileDraft'

const baseForm = (): ProfileEditorForm => ({
    nombre: 'Ana',
    apellidos: 'García',
    email_contacto: 'ana@example.com',
    telefono: '600',
    language: 'es-ES',
    availability: { template: { '1': { intro: true } }, exceptions: {} },
})

const snapshot = (): ProfileCommittedSnapshot => ({
    form: cloneProfileForm(baseForm()),
    avatarUrl: 'https://cdn.example.com/a.jpg',
})

describe('profileDraft', () => {
    it('cloneProfileForm produce copia profunda de availability', () => {
        const a = baseForm()
        const b = cloneProfileForm(a)
        b.availability.template!['1']!.intro = false
        expect(a.availability.template?.['1']?.intro).toBe(true)
    })

    it('availabilityEqual detecta diferencias en exceptions', () => {
        const a = baseForm().availability
        const b = { ...baseForm().availability, exceptions: { '2026-04-01': { intro: false } } }
        expect(availabilityEqual(a, b)).toBe(false)
    })

    it('countFormFieldChanges cuenta cada dimensión modificada', () => {
        const committed = baseForm()
        const current = { ...committed, nombre: 'Bea', telefono: '601' }
        expect(countFormFieldChanges(committed, current)).toBe(2)
    })

    it('isAvatarDirty con blob pendiente', () => {
        expect(
            isAvatarDirty({
                pendingAvatarBlob: new Blob(),
                pendingAvatarDelete: false,
                committedAvatarUrl: null,
            })
        ).toBe(true)
    })

    it('isAvatarDirty con borrado pendiente solo si había avatar', () => {
        expect(
            isAvatarDirty({
                pendingAvatarBlob: null,
                pendingAvatarDelete: true,
                committedAvatarUrl: 'https://x',
            })
        ).toBe(true)
        expect(
            isAvatarDirty({
                pendingAvatarBlob: null,
                pendingAvatarDelete: true,
                committedAvatarUrl: null,
            })
        ).toBe(false)
    })

    it('isProfileDirty combina formulario y avatar', () => {
        const c = snapshot()
        expect(isProfileDirty(c, c.form, null, false)).toBe(false)
        expect(isProfileDirty(c, { ...c.form, nombre: 'Otro' }, null, false)).toBe(true)
        expect(isProfileDirty(c, c.form, new Blob(), false)).toBe(true)
    })

    it('profilePendingCount suma bloques de formulario más avatar', () => {
        const c = snapshot()
        const changed = { ...c.form, nombre: 'X', apellidos: 'Y' }
        expect(profilePendingCount(c, changed, null, false)).toBe(2)
        expect(profilePendingCount(c, c.form, new Blob(), false)).toBe(1)
        expect(profilePendingCount(c, { ...c.form, nombre: 'Z' }, new Blob(), false)).toBe(2)
    })
})
