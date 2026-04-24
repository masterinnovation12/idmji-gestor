/**
 * Tests de perfil: borrador, barra de guardado, orden de persistencia y layout base.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileClient from './ProfileClient'
import type { Profile } from '@/types/database'

const translations: Record<string, string> = {
    'profile.title': 'Mi Perfil',
    'profile.desc': 'Descripción perfil',
    'users.form.change': 'Cambiar',
    'profile.registeredAt': 'Registro',
    'profile.info': 'Información',
    'profile.firstName': 'Nombre',
    'profile.lastName': 'Apellidos',
    'profile.contactInfo': 'Contacto',
    'profile.contactEmail': 'Email contacto',
    'profile.phone': 'Teléfono',
    'profile.account': 'Cuenta',
    'profile.readOnly': 'Solo lectura',
    'profile.loginEmail': 'Email login',
    'profile.preferences': 'Preferencias',
    'profile.darkMode': 'Oscuro',
    'profile.darkModeDesc': 'Desc oscuro',
    'profile.language': 'Idioma',
    'profile.notifications': 'Notificaciones',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'profile.draftBar.withCount': '{count} cambios sin guardar',
    'profile.draftBar.base': 'Cambios sin guardar',
    'profile.draftBar.discard': 'Descartar',
    'profile.draftBar.save': 'Guardar cambios',
    'profile.draftBar.saving': 'Guardando...',
    'profile.draftBar.discarded': 'Descartado',
    'profile.saveSuccess': 'Guardado ok',
    'profile.leave.title': 'Salir?',
    'profile.leave.desc': 'Perderás cambios',
    'profile.leave.stay': 'Quedarme',
    'profile.leave.withoutSave': 'Salir sin guardar',
}

const setLanguage = vi.fn()

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (k: string) => translations[k] ?? k,
        language: 'es-ES' as const,
        setLanguage,
    }),
}))

vi.mock('@/lib/theme/ThemeProvider', () => ({
    useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}))

const updateProfile = vi.fn()
const uploadAvatar = vi.fn()
const deleteAvatar = vi.fn()

vi.mock('./actions', () => ({
    updateProfile: (...args: unknown[]) => updateProfile(...args),
    uploadAvatar: (...args: unknown[]) => uploadAvatar(...args),
    deleteAvatar: (...args: unknown[]) => deleteAvatar(...args),
}))

vi.mock('@/components/AvailabilityManager', () => ({
    default: ({
        onChange,
    }: {
        onChange: (v: { template: Record<string, unknown>; exceptions: Record<string, unknown> }) => void
    }) => (
        <button
            type="button"
            data-testid="touch-availability"
            onClick={() => onChange({ template: { '2': { intro: true } }, exceptions: {} })}
        >
            Disponibilidad
        </button>
    ),
}))

vi.mock('@/components/PushNotificationToggle', () => ({
    PushNotificationToggle: () => <div data-testid="push-mock">push</div>,
}))

vi.mock('@/components/AvatarEditor', () => ({
    default: ({ onSave, isOpen }: { onSave: (b: Blob) => void; isOpen: boolean }) =>
        isOpen ? (
            <button type="button" data-testid="apply-crop" onClick={() => onSave(new Blob(['x'], { type: 'image/jpeg' }))}>
                Aplicar recorte
            </button>
        ) : null,
}))

vi.mock('next/image', () => ({
    default: function MockImage(props: { src: string; alt: string }) {
        return <img src={props.src} alt={props.alt} data-testid="next-image" />
    },
}))

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}))

function profileFixture(over: Partial<Profile> = {}): Profile {
    return {
        id: 'u1',
        nombre: 'Juan',
        apellidos: 'Pérez',
        email_contacto: '',
        telefono: '',
        rol: 'MIEMBRO',
        avatar_url: null,
        created_at: '2024-01-01',
        availability: { template: {}, exceptions: {} },
        ...over,
    } as Profile
}

describe('ProfileClient — borrador y guardado', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        updateProfile.mockResolvedValue({ success: true })
        uploadAvatar.mockResolvedValue({ success: true, data: 'https://cdn.example.com/new.jpg' })
        deleteAvatar.mockResolvedValue({ success: true })
    })

    it('no muestra la barra de guardado hasta que hay cambios', async () => {
        render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Mi Perfil' })).toBeInTheDocument()
        })

        expect(screen.queryByTestId('save-changes-bar')).not.toBeInTheDocument()
    })

    it('muestra la barra al editar el nombre y la oculta al descartar', async () => {
        render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pedro' } })

        expect(await screen.findByTestId('save-changes-bar')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

        await waitFor(() => {
            expect(screen.queryByTestId('save-changes-bar')).not.toBeInTheDocument()
        })
        expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Juan')
        expect(setLanguage).toHaveBeenCalledWith('es-ES')
    })

    it('guarda solo vía updateProfile cuando no hay cambios de avatar', async () => {
        render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Luis' } })
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1))
        expect(uploadAvatar).not.toHaveBeenCalled()
        expect(deleteAvatar).not.toHaveBeenCalled()
    })

    it('al marcar disponibilidad incluye el cambio en el guardado', async () => {
        render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => expect(screen.getByTestId('touch-availability')).toBeInTheDocument())

        fireEvent.click(screen.getByTestId('touch-availability'))
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        await waitFor(() => expect(updateProfile).toHaveBeenCalled())
        const payload = updateProfile.mock.calls[0][0] as { availability: { template: Record<string, unknown> } }
        expect(payload.availability.template['2']).toEqual({ intro: true })
    })

    it('añade padding inferior cuando hay cambios pendientes (espacio para la barra)', async () => {
        const { container } = render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeInTheDocument())

        const root = container.firstElementChild as HTMLElement
        expect(root.className).toMatch(/pb-12/)

        fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Gómez' } })

        await waitFor(() => expect(root.className).toMatch(/pb-32|pb-28/))
    })

    it('persiste primero el perfil y luego sube el avatar cuando hay recorte pendiente', async () => {
        const callOrder: string[] = []
        updateProfile.mockImplementation(async () => {
            callOrder.push('updateProfile')
            return { success: true }
        })
        uploadAvatar.mockImplementation(async () => {
            callOrder.push('uploadAvatar')
            return { success: true, data: 'https://cdn.example.com/x.jpg' }
        })

        const { container } = render(<ProfileClient profile={profileFixture()} email="login@example.com" />)

        await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeInTheDocument())

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
        const file = new File(['fake'], 'p.jpg', { type: 'image/jpeg' })
        fireEvent.change(fileInput, { target: { files: [file] } })

        const cropBtn = await screen.findByTestId('apply-crop')
        fireEvent.click(cropBtn)

        await waitFor(() => expect(screen.getByTestId('save-changes-bar')).toBeInTheDocument())

        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        await waitFor(() => expect(callOrder).toEqual(['updateProfile', 'uploadAvatar']))
    })
})
