/**
 * ProfileClient - IDMJI Gestor de Púlpito
 *
 * Perfil unificado: borrador local + barra Guardar/Descartar (mismo modelo que el detalle de culto).
 * Avatar nuevo o eliminación solo se persisten al confirmar "Guardar cambios".
 */

'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    User, Mail, Phone, Shield, Moon, Sun,
    Camera, Loader2, Sparkles, UserCircle,
    Calendar, AlertCircle, Trash2, Bell,
} from 'lucide-react'
import NextImage from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { Profile } from '@/types/database'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { toast } from 'sonner'
import { updateProfile, uploadAvatar, deleteAvatar } from './actions'
import AvatarEditor from '@/components/AvatarEditor'
import AvailabilityManager from '@/components/AvailabilityManager'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { obtenerIniciales } from '@/lib/helpers'
import SaveChangesBar from '@/app/dashboard/cultos/[id]/SaveChangesBar'
import { LanguageMenu } from '@/components/language/LanguageMenu'
import { FlagSpain } from '@/components/language/FlagSpain'
import { FlagCatalonia } from '@/components/language/FlagCatalonia'
import {
    cloneProfileForm,
    profilePendingCount,
    type ProfileCommittedSnapshot,
    type ProfileEditorForm,
} from './profileDraft'
import { cn } from '@/lib/utils'
import type { TranslationKey } from '@/lib/i18n/types'

interface ProfileClientProps {
    profile: Profile | null
    email: string
}

function buildInitialForm(profile: Profile | null, languageFromContext: string): ProfileEditorForm {
    const initialAvailability = profile?.availability
        ? 'template' in profile.availability
            ? (profile.availability as ProfileEditorForm['availability'])
            : { template: profile.availability as NonNullable<ProfileEditorForm['availability']>['template'], exceptions: {} }
        : { template: {}, exceptions: {} }

    return {
        nombre: profile?.nombre || '',
        apellidos: profile?.apellidos || '',
        email_contacto: profile?.email_contacto || '',
        telefono: profile?.telefono || '',
        language: (profile?.language ?? profile?.idioma_preferido ?? languageFromContext) as 'es-ES' | 'ca-ES',
        availability: initialAvailability,
    }
}

function buildCommitted(profile: Profile | null, languageFromContext: string): ProfileCommittedSnapshot {
    const form = buildInitialForm(profile, languageFromContext)
    return {
        form: cloneProfileForm(form),
        avatarUrl: profile?.avatar_url ?? null,
    }
}

export default function ProfileClient({ profile, email }: ProfileClientProps) {
    const { t, language, setLanguage: setI18nLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()

    const [formData, setFormData] = useState<ProfileEditorForm>(() => buildInitialForm(profile, language))
    const [committed, setCommitted] = useState<ProfileCommittedSnapshot>(() => buildCommitted(profile, language))

    const [isSaving, setIsSaving] = useState(false)
    const [mounted, setMounted] = useState(false)

    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
    const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null)
    const [pendingAvatarDelete, setPendingAvatarDelete] = useState(false)
    const blobPreviewUrlRef = useRef<string | null>(null)

    const [isCropOpen, setIsCropOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
    const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        return () => {
            if (blobPreviewUrlRef.current) {
                URL.revokeObjectURL(blobPreviewUrlRef.current)
                blobPreviewUrlRef.current = null
            }
        }
    }, [])

    const pendingCount = useMemo(
        () => profilePendingCount(committed, formData, pendingAvatarBlob, pendingAvatarDelete),
        [committed, formData, pendingAvatarBlob, pendingAvatarDelete]
    )
    const isDirty = pendingCount > 0

    const revokeBlobPreview = useCallback(() => {
        if (blobPreviewUrlRef.current) {
            URL.revokeObjectURL(blobPreviewUrlRef.current)
            blobPreviewUrlRef.current = null
        }
    }, [])

    useEffect(() => {
        const handler = (event: BeforeUnloadEvent) => {
            if (!isDirty) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    useEffect(() => {
        const clickHandler = (event: MouseEvent) => {
            if (!isDirty) return
            const target = event.target as HTMLElement | null
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('#')) return
            event.preventDefault()
            event.stopPropagation()
            setPendingNavigationHref(href)
            setLeaveConfirmOpen(true)
        }
        document.addEventListener('click', clickHandler, true)
        return () => document.removeEventListener('click', clickHandler, true)
    }, [isDirty])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.addEventListener('load', () => setTempImageSrc(reader.result?.toString() || null))
            reader.readAsDataURL(file)
            setIsCropOpen(true)
        }
    }

    const handleCropComplete = (croppedBlob: Blob) => {
        revokeBlobPreview()
        const url = URL.createObjectURL(croppedBlob)
        blobPreviewUrlRef.current = url
        setPendingAvatarBlob(croppedBlob)
        setPendingAvatarDelete(false)
        setAvatarPreview(url)
        setIsCropOpen(false)
        setTempImageSrc(null)
    }

    const handleDiscard = () => {
        revokeBlobPreview()
        setPendingAvatarBlob(null)
        setPendingAvatarDelete(false)
        setFormData(cloneProfileForm(committed.form))
        setI18nLanguage(committed.form.language)
        setAvatarPreview(committed.avatarUrl)
        toast.success(t('profile.draftBar.discarded' as TranslationKey))
    }

    const handleSave = async () => {
        if (!isDirty) return
        setIsSaving(true)
        try {
            const profileResult = await updateProfile(formData)
            if (!profileResult.success) {
                toast.error(profileResult.error || 'Error al actualizar perfil')
                return
            }

            let newAvatarUrl = committed.avatarUrl

            if (pendingAvatarBlob) {
                const data = new FormData()
                data.append('avatar', pendingAvatarBlob, 'avatar.jpg')
                const uploadResult = await uploadAvatar(data)
                if (!uploadResult.success || !uploadResult.data) {
                    toast.error(uploadResult.error || 'Error al subir avatar')
                    return
                }
                newAvatarUrl = uploadResult.data
            } else if (pendingAvatarDelete && committed.avatarUrl) {
                const delResult = await deleteAvatar()
                if (!delResult.success) {
                    toast.error(delResult.error || 'Error al eliminar avatar')
                    return
                }
                newAvatarUrl = null
            }

            revokeBlobPreview()
            setPendingAvatarBlob(null)
            setPendingAvatarDelete(false)
            setCommitted({
                form: cloneProfileForm(formData),
                avatarUrl: newAvatarUrl,
            })
            setAvatarPreview(newAvatarUrl)
            setI18nLanguage(formData.language)
            toast.success(t('profile.saveSuccess' as TranslationKey))
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Error inesperado')
        } finally {
            setIsSaving(false)
        }
    }

    const openRemoveAvatarDialog = () => {
        setIsDeleteDialogOpen(true)
    }

    const confirmRemoveAvatar = () => {
        revokeBlobPreview()
        setPendingAvatarBlob(null)
        setPendingAvatarDelete(true)
        setAvatarPreview(null)
        setIsDeleteDialogOpen(false)
    }

    const handleAvatarDeleteOrCancelSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (pendingAvatarBlob) {
            revokeBlobPreview()
            setPendingAvatarBlob(null)
            setPendingAvatarDelete(false)
            setAvatarPreview(committed.avatarUrl)
            return
        }
        if (pendingAvatarDelete) {
            setPendingAvatarDelete(false)
            setAvatarPreview(committed.avatarUrl)
            return
        }
        openRemoveAvatarDialog()
    }

    const saveBarLabels = useMemo(
        () => ({
            pendingBadge:
                pendingCount > 0
                    ? (t('profile.draftBar.withCount' as TranslationKey) as string).replace(
                          '{count}',
                          String(pendingCount)
                      )
                    : t('profile.draftBar.base' as TranslationKey),
            discard: t('profile.draftBar.discard' as TranslationKey),
            save: t('profile.draftBar.save' as TranslationKey),
            saving: t('profile.draftBar.saving' as TranslationKey),
        }),
        [pendingCount, t]
    )

    if (!mounted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div
            className={cn(
                'max-w-5xl mx-auto space-y-8 px-4 no-scrollbar',
                isDirty ? 'pb-32 sm:pb-28' : 'pb-12 sm:pb-12'
            )}
        >
            <div className="space-y-2">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <UserCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                        {t('profile.title')}
                    </h1>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground font-medium flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4 text-accent" />
                    {t('profile.desc')}
                </motion.p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    if (isDirty && !isSaving) void handleSave()
                }}
                className="grid gap-8 lg:grid-cols-3"
            >
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <Card className="rounded-[2.5rem] border-none shadow-2xl group glass">
                        <CardContent className="p-4 sm:p-6 md:p-8 text-center space-y-6 overflow-visible">
                            <div className="relative mx-auto w-44 h-44 group/avatar">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover/avatar:bg-primary/40 transition-all" />
                                <div
                                    className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-accent to-primary p-1 shadow-xl cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden border-4 border-background relative">
                                        {avatarPreview ? (
                                            <NextImage
                                                src={avatarPreview}
                                                alt="Avatar"
                                                fill
                                                className="object-cover"
                                                unoptimized={avatarPreview.startsWith('blob:')}
                                            />
                                        ) : (
                                            <div
                                                className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-gradient-to-br from-primary via-accent to-primary' : 'bg-gradient-to-br from-blue-200 via-blue-100 to-blue-200'}`}
                                            >
                                                <span
                                                    className={`text-5xl font-black tracking-tighter drop-shadow-sm ${isDark ? 'text-white' : 'text-black'}`}
                                                >
                                                    {obtenerIniciales(formData.nombre, formData.apellidos) || 'U'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-opacity">
                                            <Camera className="w-8 h-8 text-white mb-2" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                {t('users.form.change')}
                                            </span>
                                        </div>

                                        {isSaving && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />

                                {(avatarPreview || pendingAvatarDelete) && !isSaving && (
                                    <button
                                        type="button"
                                        onClick={handleAvatarDeleteOrCancelSelection}
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-1.5 z-10"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        {pendingAvatarBlob || pendingAvatarDelete ? t('common.cancel') : t('common.delete')}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1 sm:space-y-2">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                                    {formData.nombre} {formData.apellidos}
                                </h2>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <Shield className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                        {profile?.rol || 'MIEMBRO'}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50 space-y-4">
                                <div className="flex items-center gap-2 text-left">
                                    <div className="p-2 bg-muted rounded-xl">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            {t('profile.registeredAt')}
                                        </p>
                                        <p className="text-sm font-bold">
                                            {profile?.created_at
                                                ? new Date(profile.created_at).toLocaleDateString(
                                                      language === 'es-ES' ? 'es' : 'ca'
                                                  )
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 space-y-8"
                >
                    <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                        <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-visible">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    {t('profile.info')}
                                </h3>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="nombre"
                                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                                    >
                                        {t('profile.firstName')}
                                    </Label>
                                    <Input
                                        id="nombre"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        required
                                        className="h-14 rounded-2xl bg-white/5 border-border/50 focus:ring-2 focus:ring-primary/50 font-bold px-5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="apellidos"
                                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                                    >
                                        {t('profile.lastName')}
                                    </Label>
                                    <Input
                                        id="apellidos"
                                        name="apellidos"
                                        value={formData.apellidos}
                                        onChange={handleInputChange}
                                        required
                                        className="h-14 rounded-2xl bg-white/5 border-border/50 focus:ring-2 focus:ring-primary/50 font-bold px-5"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 space-y-6">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                        {t('profile.contactInfo')}
                                    </span>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="email_contacto"
                                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                                        >
                                            {t('profile.contactEmail')}
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                            <Input
                                                id="email_contacto"
                                                name="email_contacto"
                                                type="email"
                                                value={formData.email_contacto}
                                                onChange={handleInputChange}
                                                placeholder="email@ejemplo.com"
                                                className="h-14 rounded-2xl bg-white/5 border-border/50 focus:ring-2 focus:ring-primary/50 font-bold pl-12 pr-5"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="telefono"
                                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                                        >
                                            {t('profile.phone')}
                                        </Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                            <Input
                                                id="telefono"
                                                name="telefono"
                                                type="tel"
                                                value={formData.telefono}
                                                onChange={handleInputChange}
                                                placeholder="+34 600 000 000"
                                                className="h-14 rounded-2xl bg-white/5 border-border/50 focus:ring-2 focus:ring-primary/50 font-bold pl-12 pr-5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-8 md:grid-cols-2">
                        <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                            <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-visible">
                                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-xl">
                                        <Shield className="w-5 h-5 text-amber-500" />
                                    </div>
                                    {t('profile.account')}
                                </h3>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden group">
                                        <div className="absolute right-3 top-3 px-2 py-1 bg-muted rounded-lg text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('profile.readOnly')}
                                        </div>
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                            {t('profile.loginEmail')}
                                        </Label>
                                        <p className="font-bold text-sm truncate mt-1">{email}</p>
                                    </div>

                                    <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-blue-600 dark:text-blue-400">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <p className="text-[10px] font-bold leading-tight">
                                            El email de inicio de sesión es gestionado por el administrador para garantizar la
                                            seguridad.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                            <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-visible">
                                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 rounded-xl">
                                        <Sparkles className="w-5 h-5 text-accent" />
                                    </div>
                                    {t('profile.preferences')}
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="p-2 bg-background rounded-xl shadow-sm">
                                                {isDark ? (
                                                    <Moon className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <Sun className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs uppercase tracking-tight">{t('profile.darkMode')}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">
                                                    {t('profile.darkModeDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleTheme}
                                            className={`relative w-14 h-8 sm:w-12 sm:h-7 rounded-full transition-colors duration-300 shrink-0 ${isDark ? 'bg-primary' : 'bg-zinc-300'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-6 h-6 sm:w-5 sm:h-5 bg-white rounded-full shadow-md"
                                                animate={{ x: isDark ? 24 : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                                                {language === 'es-ES' ? (
                                                    <FlagSpain className="h-4 w-6 rounded-sm border border-black/10 shadow-sm" aria-hidden />
                                                ) : (
                                                    <FlagCatalonia className="h-4 w-6 rounded-sm border border-black/10 shadow-sm" aria-hidden />
                                                )}
                                            </div>
                                            <p className="truncate font-bold text-xs uppercase tracking-tight">
                                                {t('profile.language')}
                                            </p>
                                        </div>
                                        <LanguageMenu
                                            language={language}
                                            setLanguage={(lang) => {
                                                setI18nLanguage(lang)
                                                setFormData((prev) => ({ ...prev, language: lang }))
                                            }}
                                            t={t}
                                            variant="profile"
                                            className="shrink-0"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-[2.5rem] border-none shadow-xl glass overflow-hidden">
                        <CardContent className="p-4 sm:p-6 md:p-8">
                            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <Bell className="w-5 h-5 text-blue-500" />
                                </div>
                                {t('profile.notifications')}
                            </h3>
                            <PushNotificationToggle />
                        </CardContent>
                    </Card>
                </motion.div>
            </form>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
            >
                <AvailabilityManager
                    value={formData.availability}
                    onChange={(newAvailability) =>
                        setFormData((prev) => ({ ...prev, availability: newAvailability }))
                    }
                    isDark={isDark}
                />
            </motion.div>

            {tempImageSrc && (
                <AvatarEditor
                    imageSrc={tempImageSrc}
                    isOpen={isCropOpen}
                    onClose={() => {
                        setIsCropOpen(false)
                        setTempImageSrc(null)
                    }}
                    onSave={handleCropComplete}
                />
            )}

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="rounded-2xl border-none shadow-2xl glass p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 rounded-xl">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">Eliminar Avatar</DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground">
                            La foto se quitará al pulsar &quot;Guardar cambios&quot; en la barra inferior. Puedes descartar antes
                            si cambias de idea.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="p-6 pt-0 gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmRemoveAvatar}
                            className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
                <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">
                            {t('profile.leave.title' as TranslationKey)}
                        </DialogTitle>
                        <DialogDescription>{t('profile.leave.desc' as TranslationKey)}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setLeaveConfirmOpen(false)
                                setPendingNavigationHref(null)
                            }}
                            className="rounded-xl"
                        >
                            {t('profile.leave.stay' as TranslationKey)}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                const targetHref = pendingNavigationHref
                                setLeaveConfirmOpen(false)
                                setPendingNavigationHref(null)
                                handleDiscard()
                                if (targetHref) globalThis.location.href = targetHref
                            }}
                            className="rounded-xl"
                        >
                            {t('profile.leave.withoutSave' as TranslationKey)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SaveChangesBar
                isDirty={isDirty}
                isSaving={isSaving}
                pendingCount={pendingCount}
                onSave={() => void handleSave()}
                onDiscard={handleDiscard}
                labels={saveBarLabels}
            />
        </div>
    )
}
