/**
 * ProfileClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para la gestión integral del perfil del usuario.
 * Fusiona perfil y configuración en una sola interfaz premium.
 * 
 * Características:
 * - Edición de datos personales (Nombre, Apellidos)
 * - Sincronización de datos de contacto (Email, Teléfono)
 * - Gestión de Avatar con recorte, zoom y rotación
 * - Preferencias de aplicación (Modo Oscuro, Notificaciones)
 * - Diseño Glassmorphism ultra-premium y 100% responsivo
 * 
 * @author Antigravity AI
 * @date 2024-12-23
 */

'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
    User, Mail, Phone, Shield, Moon, Globe, Sun,
    Camera, Loader2, Sparkles, UserCircle,
    Calendar, Save, AlertCircle, Trash2
} from 'lucide-react'
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
import { obtenerIniciales } from '@/lib/helpers'

interface ProfileClientProps {
    profile: Profile | null
    email: string
}

export default function ProfileClient({ profile, email }: ProfileClientProps) {
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()

    // Form States
    const [formData, setFormData] = useState({
        nombre: profile?.nombre || '',
        apellidos: profile?.apellidos || '',
        email_contacto: profile?.email_contacto || '',
        telefono: profile?.telefono || '',
        availability: profile?.availability || {}
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Avatar States
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
    const [isCropOpen, setIsCropOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
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

    const handleCropSave = async (croppedBlob: Blob) => {
        setIsLoading(true)
        try {
            const data = new FormData()
            data.append('avatar', croppedBlob, 'avatar.jpg')

            const result = await uploadAvatar(data)
            if (result.success && result.data) {
                setAvatarPreview(result.data)
                toast.success(t('profile.avatarSuccess'))
            } else {
                toast.error(result.error || 'Error al subir avatar')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error inesperado al subir avatar')
        } finally {
            setIsLoading(false)
            setIsCropOpen(false)
            setTempImageSrc(null)
        }
    }

    const handleDeleteAvatar = async () => {
        if (!avatarPreview) return

        setIsDeleteDialogOpen(false)
        setIsLoading(true)
        try {
            const result = await deleteAvatar()
            if (result.success) {
                setAvatarPreview(null)
                toast.success('Avatar eliminado correctamente')
            } else {
                toast.error(result.error || 'Error al eliminar avatar')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error inesperado al eliminar avatar')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const result = await updateProfile(formData)
            if (result.success) {
                toast.success(t('profile.saveSuccess'))
            } else {
                toast.error(result.error || 'Error al actualizar perfil')
            }
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : 'Error inesperado')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4 no-scrollbar">
            {/* Header con Animación */}
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

            <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
                {/* Panel Lateral: Avatar y Rol */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <Card className="rounded-[2.5rem] border-none shadow-2xl group glass">
                        <CardContent className="p-8 text-center space-y-6 overflow-visible">
                            {/* Avatar Editable */}
                            <div className="relative mx-auto w-44 h-44 group/avatar">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover/avatar:bg-primary/40 transition-all" />
                                <div
                                    className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-accent to-primary p-1 shadow-xl cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden border-4 border-background relative">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-gradient-to-br from-primary via-accent to-primary' : 'bg-gradient-to-br from-blue-200 via-blue-100 to-blue-200'}`}>
                                                <span className={`text-5xl font-black tracking-tighter drop-shadow-sm ${isDark ? 'text-white' : 'text-black'}`}>
                                                    {obtenerIniciales(formData.nombre, formData.apellidos) || 'U'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay de Edición */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center transition-opacity">
                                            <Camera className="w-8 h-8 text-white mb-2" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('users.form.change')}</span>
                                        </div>

                                        {isLoading && (
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

                                {/* Botón Eliminar Avatar - Solo visible cuando hay avatar */}
                                {avatarPreview && !isLoading && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsDeleteDialogOpen(true)
                                        }}
                                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-1.5 z-10"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Eliminar
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight truncate">
                                    {formData.nombre} {formData.apellidos}
                                </h2>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{profile?.rol || 'MIEMBRO'}</span>
                                </div>
                            </div>

                            {/* Info de Acceso (Lectura) */}
                            <div className="pt-4 border-t border-border/50 space-y-4">
                                <div className="flex items-center gap-2 text-left">
                                    <div className="p-2 bg-muted rounded-xl">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('profile.registeredAt')}</p>
                                        <p className="text-sm font-bold">
                                            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(language === 'es-ES' ? 'es' : 'ca') : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Panel Principal: Formulario */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 space-y-8"
                >
                    {/* Sección: Datos Personales */}
                    <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                        <CardContent className="p-8 space-y-8 overflow-visible">
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
                                    <Label htmlFor="nombre" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
                                    <Label htmlFor="apellidos" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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

                            {/* Sección de Contacto */}
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
                                        <Label htmlFor="email_contacto" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
                                        <Label htmlFor="telefono" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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

                                {/* Botón Guardar Centrado */}
                                <div className="flex justify-center pt-6">
                                    <Button
                                        type="submit"
                                        disabled={isSaving}
                                        className={`rounded-2xl px-8 py-3 font-black uppercase tracking-widest text-xs h-12 shadow-xl border-2 text-white hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark
                                            ? 'bg-primary border-primary/50 hover:bg-primary/90 shadow-primary/40'
                                            : 'bg-blue-600 border-blue-700 hover:bg-blue-700 shadow-blue-500/50'
                                            }`}
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2 text-white" /> : <Save className="w-5 h-5 mr-2 text-white" />}
                                        <span className="text-white font-black">{t('common.save')}</span>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sección: Cuenta y Preferencias */}
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Cuenta de Acceso (Lectura) */}
                        <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                            <CardContent className="p-8 space-y-6 overflow-visible">
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
                                            El email de inicio de sesión es gestionado por el administrador para garantizar la seguridad.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preferencias de Aplicación */}
                        <Card className="rounded-[2.5rem] border-none shadow-xl glass">
                            <CardContent className="p-8 space-y-6 overflow-visible">
                                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 rounded-xl">
                                        <Sparkles className="w-5 h-5 text-accent" />
                                    </div>
                                    {t('profile.preferences')}
                                </h3>

                                <div className="space-y-4">
                                    {/* Selector de Tema */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-xl shadow-sm">
                                                {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs uppercase tracking-tight">{t('profile.darkMode')}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{t('profile.darkModeDesc')}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleTheme}
                                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${isDark ? 'bg-primary' : 'bg-zinc-300'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
                                                animate={{ x: isDark ? 20 : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    {/* Selector de Idioma */}
                                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="p-2 bg-background rounded-xl shadow-sm">
                                                <Globe className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <p className="font-bold text-xs uppercase tracking-tight">{t('profile.language')}</p>
                                        </div>
                                        <div className={`flex gap-1 p-1 rounded-xl shadow-inner justify-center ${isDark ? 'bg-muted/50' : 'bg-muted/30'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setLanguage('es-ES')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${language === 'es-ES'
                                                    ? isDark
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/40'
                                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                                    : isDark
                                                        ? 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                        : 'bg-white text-foreground hover:bg-muted/50 shadow-sm'
                                                    }`}
                                            >
                                                ES
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLanguage('ca-ES')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${language === 'ca-ES'
                                                    ? isDark
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/40'
                                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                                    : isDark
                                                        ? 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                        : 'bg-white text-foreground hover:bg-muted/50 shadow-sm'
                                                    }`}
                                            >
                                                CA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notificaciones Push */}
                    {/* <Card className="rounded-[2.5rem] border-none shadow-xl glass overflow-hidden">
                        <CardContent className="p-8">
                            <PushNotificationToggle />
                        </CardContent>
                    </Card> */}
                </motion.div>
            </form>

            <div className="mt-8 space-y-6">
                {/* Availability Manager */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <AvailabilityManager
                        value={formData.availability}
                        onChange={(newAvailability) => setFormData(prev => ({ ...prev, availability: newAvailability }))}
                        isDark={isDark}
                    />
                    <div className="flex justify-center pt-6">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className={`rounded-2xl px-12 py-4 font-black uppercase tracking-widest text-sm h-14 shadow-xl border-2 text-white hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isDark
                                ? 'bg-emerald-600 border-emerald-500/50 hover:bg-emerald-500/90 shadow-emerald-500/40'
                                : 'bg-emerald-600 border-emerald-700 hover:bg-emerald-700 shadow-emerald-500/50'
                                }`}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2 text-white" /> : <Save className="w-5 h-5 mr-2 text-white" />}
                            <span className="text-white font-black">{t('common.save')}</span>
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Modal de Edición de Avatar */}
            {tempImageSrc && (
                <AvatarEditor
                    imageSrc={tempImageSrc}
                    isOpen={isCropOpen}
                    onClose={() => { setIsCropOpen(false); setTempImageSrc(null) }}
                    onSave={handleCropSave}
                />
            )}

            {/* Diálogo de Confirmación para Eliminar Avatar */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="rounded-2xl border-none shadow-2xl glass p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-500/10 rounded-xl">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">
                                Eliminar Avatar
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground">
                            ¿Estás seguro de que deseas eliminar tu foto de perfil? Esta acción no se puede deshacer y se eliminará permanentemente del sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="p-6 pt-0 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAvatar}
                            disabled={isLoading}
                            className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
