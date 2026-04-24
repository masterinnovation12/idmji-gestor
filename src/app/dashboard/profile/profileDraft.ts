/**
 * Lógica pura del borrador de perfil (comparación con snapshot confirmado).
 * Sin dependencias de React para facilitar tests y reuso.
 */

export type ProfileAvailability = {
    template?: Record<
        string,
        {
            intro?: boolean
            finalization?: boolean
            teaching?: boolean
            testimonies?: boolean
        }
    >
    exceptions?: Record<
        string,
        {
            intro?: boolean
            finalization?: boolean
            teaching?: boolean
            testimonies?: boolean
        }
    >
}

export type ProfileEditorForm = {
    nombre: string
    apellidos: string
    email_contacto: string
    telefono: string
    language: 'es-ES' | 'ca-ES'
    availability: ProfileAvailability
}

export type ProfileCommittedSnapshot = {
    form: ProfileEditorForm
    avatarUrl: string | null
}

export function cloneProfileForm(form: ProfileEditorForm): ProfileEditorForm {
    return JSON.parse(JSON.stringify(form)) as ProfileEditorForm
}

export function availabilityEqual(a: ProfileAvailability, b: ProfileAvailability): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

/** Número de “bloques” de cambio en el formulario (similar al culto: varias dimensiones). */
export function countFormFieldChanges(committed: ProfileEditorForm, current: ProfileEditorForm): number {
    const checks = [
        committed.nombre !== current.nombre,
        committed.apellidos !== current.apellidos,
        committed.email_contacto !== current.email_contacto,
        committed.telefono !== current.telefono,
        committed.language !== current.language,
        !availabilityEqual(committed.availability, current.availability),
    ]
    return checks.filter(Boolean).length
}

export function isAvatarDirty(args: {
    pendingAvatarBlob: Blob | null
    pendingAvatarDelete: boolean
    committedAvatarUrl: string | null
}): boolean {
    if (args.pendingAvatarBlob) return true
    if (args.pendingAvatarDelete && !!args.committedAvatarUrl) return true
    return false
}

export function isProfileDirty(
    committed: ProfileCommittedSnapshot,
    currentForm: ProfileEditorForm,
    pendingAvatarBlob: Blob | null,
    pendingAvatarDelete: boolean
): boolean {
    if (countFormFieldChanges(committed.form, currentForm) > 0) return true
    return isAvatarDirty({
        pendingAvatarBlob,
        pendingAvatarDelete,
        committedAvatarUrl: committed.avatarUrl,
    })
}

export function profilePendingCount(
    committed: ProfileCommittedSnapshot,
    currentForm: ProfileEditorForm,
    pendingAvatarBlob: Blob | null,
    pendingAvatarDelete: boolean
): number {
    const formCount = countFormFieldChanges(committed.form, currentForm)
    const avatarCount = isAvatarDirty({
        pendingAvatarBlob,
        pendingAvatarDelete,
        committedAvatarUrl: committed.avatarUrl,
    })
        ? 1
        : 0
    return formCount + avatarCount
}
