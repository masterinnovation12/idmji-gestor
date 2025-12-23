'use client'

import { useState, useRef, useEffect } from 'react'
import { getUsers, createUser, updateUserFull, deleteUser, UserData } from './actions'
import { Users, Search, Shield, UserCheck, Trash2, Edit2, Plus, Camera, RotateCw, AlertTriangle, AlertCircle, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import AvatarEditor from '@/components/AvatarEditor'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface UsersClientProps {
    initialUsers: UserData[]
    counts: { total: number, pulpito: number, admins: number }
    availableRoles: string[]
}

export default function UsersClient({ initialUsers, counts, availableRoles }: UsersClientProps) {
    const { t } = useI18n()
    const [users, setUsers] = useState<UserData[]>(initialUsers)
    const defaultRole = availableRoles[0] || 'MIEMBRO'
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

    // Form States
    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        email: '',
        email_contacto: '',
        telefono: '',
        password: '',
        rol: defaultRole,
        pulpito: false
    })
    const [avatarFile, setAvatarFile] = useState<Blob | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isCropOpen, setIsCropOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const isAnyModalOpen = isCreateOpen || isEditOpen || isDeleteOpen || isCropOpen

    // Asegurar que el scroll esté habilitado cuando no hay modales abiertos
    useEffect(() => {
        if (!isAnyModalOpen) {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
            document.body.style.touchAction = ''
        }
    }, [isAnyModalOpen])

    // Filter Users
    const filteredUsers = users.filter(u => {
        const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase()
        const email = u.email?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()
        return fullName.includes(search) || email.includes(search)
    })

    // Reset Form
    const resetForm = () => {
        setFormData({
            nombre: '',
            apellidos: '',
            email: '',
            email_contacto: '',
            telefono: '',
            password: '',
            rol: defaultRole,
            pulpito: false
        })
        setAvatarFile(null)
        setAvatarPreview(null)
        setTempImageSrc(null)
        setShowPassword(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.addEventListener('load', () => setTempImageSrc(reader.result?.toString() || null))
            reader.readAsDataURL(file)
            setIsCropOpen(true)
        }
    }

    const handleCropSave = (croppedBlob: Blob) => {
        setAvatarFile(croppedBlob)
        setAvatarPreview(URL.createObjectURL(croppedBlob))
        setIsCropOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formDataFromDom = new FormData(e.currentTarget)

        try {
            const data = new FormData()
            // Usar valores del DOM preferiblemente, o fallback al estado
            data.append('nombre', (formDataFromDom.get('nombre') as string) || formData.nombre)
            data.append('apellidos', (formDataFromDom.get('apellidos') as string) || formData.apellidos)
            data.append('rol', (formDataFromDom.get('rol') as string) || formData.rol)
            data.append('pulpito', String(formData.pulpito))
            data.append('email_contacto', (formDataFromDom.get('email_contacto') as string) || formData.email_contacto)
            data.append('telefono', (formDataFromDom.get('telefono') as string) || formData.telefono)
            if (avatarFile) data.append('avatar', avatarFile, 'avatar.jpg')

            let result
            if (selectedUser) {
                // Edit Mode
                data.append('id', selectedUser.id)
                data.append('currentAvatarUrl', selectedUser.avatar_url || '')
                result = await updateUserFull(data)
            } else {
                // Create Mode - Añadir el dominio al email si no lo tiene
                const emailInput = (formDataFromDom.get('email') as string) || formData.email
                const fullEmail = emailInput.includes('@') ? emailInput : `${emailInput}@idmjisabadell.org`
                data.append('email', fullEmail)
                data.append('password', (formDataFromDom.get('password') as string) || formData.password)
                result = await createUser(data)
            }

            if (result.success) {
                toast.success(selectedUser ? t('users.toast.updated') : t('users.toast.created'))
                resetForm()
                setIsCreateOpen(false)
                setIsEditOpen(false)
                const refresh = await getUsers()
                if (refresh.success && refresh.data) setUsers(refresh.data)
            } else {
                toast.error(result.error)
            }
        } catch (err: any) {
            console.error('handleSubmit error', err)
            toast.error(err?.message || t('users.error.unexpectedSave'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedUser) {
            console.error('No user selected for deletion')
            return
        }
        
        console.log('handleDelete called for user:', selectedUser.id, selectedUser.email)
        setIsLoading(true)
        
        try {
            const result = await deleteUser(selectedUser.id)
            console.log('deleteUser result:', result)
            
            if (result.success) {
                console.log('User deleted successfully, updating UI')
                toast.success(t('users.toast.deleted'))
                setUsers(users.filter(u => u.id !== selectedUser.id))
                setIsDeleteOpen(false)
                setSelectedUser(null)
            } else {
                console.error('deleteUser failed:', result.error)
                toast.error(result.error || t('users.error.deleteFailed'))
            }
        } catch (error: any) {
            console.error('Exception in handleDelete:', error)
            toast.error(error?.message || t('users.error.unexpectedDelete'))
        } finally {
            setIsLoading(false)
        }
    }

    const openEdit = (user: UserData) => {
        setSelectedUser(user)
        setFormData({
            nombre: user.nombre === t('users.defaults.noName') ? '' : user.nombre,
            apellidos: user.apellidos === t('users.defaults.noLastName') ? '' : user.apellidos,
            email: user.email || '',
            email_contacto: user.email_contacto || '',
            telefono: user.telefono || '',
            password: '',
            rol: user.rol,
            pulpito: user.pulpito
        })
        setAvatarPreview(user.avatar_url)
        setIsEditOpen(true)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 no-scrollbar" data-page="users">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card/50 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        {t('users.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">{t('users.desc')}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => { resetForm(); setIsCreateOpen(true) }}
                        className="gap-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        {t('users.new')}
                    </Button>
                </div>
            </div>

            {/* Search & Stats Bar */}
            <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative group">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <div className="relative bg-card rounded-2xl border border-white/10 shadow-lg flex items-center px-4 h-14">
                        <Search className="w-5 h-5 text-muted-foreground mr-3" />
                        <input
                            type="text"
                            placeholder={t('users.search')}
                            className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/50 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-white/10 p-4 flex items-center justify-between shadow-lg">
                    <span className="text-muted-foreground font-medium text-sm">{t('users.total')}</span>
                    <span className="text-2xl font-black text-blue-500">{users.length}</span>
                </div>
                <div className="bg-card rounded-2xl border border-white/10 p-4 flex items-center justify-between shadow-lg">
                    <span className="text-muted-foreground font-medium text-sm">{t('users.admins')}</span>
                    <span className="text-2xl font-black text-amber-500">{users.filter(u => u.rol === 'ADMIN').length}</span>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>
                    {filteredUsers.map((user) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                            className="group relative bg-card hover:bg-card/80 border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-black/20"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="relative w-24 h-24 rounded-full object-cover border-4 border-card group-hover:border-blue-500/20 transition-colors shadow-xl" />
                                    ) : (
                                        <div className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-black text-muted-foreground border-4 border-card group-hover:border-blue-500/20 transition-colors shadow-xl">
                                            {user.nombre?.[0]}{user.apellidos?.[0]}
                                        </div>
                                    )}
                                    <span className={`absolute bottom-1 right-1 px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-card uppercase ${user.rol === 'ADMIN' ? 'bg-amber-500 text-black' :
                                            user.rol === 'EDITOR' ? 'bg-blue-500 text-white' : 'bg-zinc-200 text-zinc-700'
                                        }`}>
                                        {user.rol}
                                    </span>
                                </div>

                                <div className="space-y-1 w-full">
                                    <h3 className="font-bold text-lg leading-tight truncate px-2">{user.nombre} {user.apellidos}</h3>
                                    <p className="text-xs text-muted-foreground truncate px-2">{user.email}</p>
                                </div>

                                <div className="flex items-center gap-2 pt-2 w-full">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEdit(user)}
                                        className="flex-1 rounded-xl h-9 font-bold bg-white/5 border-white/10 hover:bg-white/10"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                                        {t('common.edit')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setSelectedUser(user); setIsDeleteOpen(true) }}
                                        className="rounded-xl h-9 w-9 text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Create/Edit Modal - LIGHT THEME */}
            <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditOpen(false); } }}>
                <DialogContent className="max-w-2xl bg-white border-zinc-200 p-0 gap-0 rounded-3xl shadow-2xl text-zinc-900 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="bg-zinc-50 p-6 border-b border-zinc-200 sticky top-0 z-10">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-zinc-900">
                                {isEditOpen ? <Edit2 className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                                {isEditOpen ? t('users.edit.title') : t('users.create.title')}
                            </DialogTitle>
                            <button
                                onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); resetForm(); }}
                                className="text-zinc-500 hover:text-zinc-800 transition-colors p-1 rounded-lg hover:bg-zinc-100"
                                aria-label={t('common.close') || 'Cerrar'}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <DialogDescription className="text-zinc-500 mt-1">
                            {isEditOpen ? t('users.edit.desc') : t('users.create.desc')}
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center space-y-4">
                                <div
                                    className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-100 hover:border-blue-500 transition-colors cursor-pointer group bg-zinc-100"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarPreview ? (
                                        <img src={avatarPreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-400 group-hover:text-blue-500 transition-colors">
                                            <Camera className="w-10 h-10" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-white text-xs font-bold uppercase tracking-widest">{t('users.form.change')}</span>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-full text-xs text-zinc-600 border-zinc-200 hover:bg-zinc-50">
                                    {t('users.form.photo')}
                                </Button>
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre" className="text-zinc-700">{t('users.form.name')}</Label>
                                        <Input
                                            id="nombre"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={(e) => {
                                                const newName = e.target.value
                                                const emailPrefix = newName.toLowerCase().trim().replace(/\s+/g, '.')
                                                setFormData({ 
                                                    ...formData, 
                                                    nombre: newName,
                                                    email: isCreateOpen ? emailPrefix : formData.email
                                                })
                                            }}
                                            required
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apellidos" className="text-zinc-700">{t('users.form.lastName')}</Label>
                                        <Input
                                            id="apellidos"
                                            name="apellidos"
                                            value={formData.apellidos}
                                            onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                            required
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-700">{t('users.form.email')}</Label>
                                    {isCreateOpen ? (
                                        <div className="flex items-center">
                                            <Input
                                                id="email"
                                                name="email"
                                                type="text"
                                                value={formData.email}
                                                readOnly
                                                required
                                                placeholder={t('users.form.emailPlaceholder')}
                                                className="bg-zinc-50 border-zinc-300 text-zinc-500 rounded-xl rounded-r-none cursor-not-allowed focus:ring-0 focus:border-zinc-300 placeholder:text-zinc-400"
                                            />
                                            <div className="bg-zinc-100 border border-l-0 border-zinc-300 rounded-r-xl px-4 py-2 text-zinc-600 font-medium flex items-center h-11">
                                                {t('users.form.emailDomain')}
                                            </div>
                                        </div>
                                    ) : (
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            disabled={true}
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-zinc-100 placeholder:text-zinc-400"
                                        />
                                    )}
                                </div>

                                {isCreateOpen && (
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-zinc-700">{t('users.form.password')}</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                minLength={6}
                                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl pr-12 focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 hover:text-zinc-700"
                                                aria-label={showPassword ? t('users.form.hidePassword') : t('users.form.showPassword')}
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Sección de Contacto */}
                                <div className="pt-2 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-zinc-100" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('users.form.contact')}</span>
                                        <div className="h-px flex-1 bg-zinc-100" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email_contacto" className="text-zinc-700">{t('users.form.contactEmail')}</Label>
                                            <Input
                                                id="email_contacto"
                                                name="email_contacto"
                                                type="email"
                                                value={formData.email_contacto}
                                                onChange={(e) => setFormData({ ...formData, email_contacto: e.target.value })}
                                                placeholder="email@ejemplo.com"
                                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telefono" className="text-zinc-700">{t('users.form.phone')}</Label>
                                            <Input
                                                id="telefono"
                                                name="telefono"
                                                type="tel"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                                placeholder="+34 000 000 000"
                                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-700">{t('users.form.role')}</Label>
                                        <div className="[&>button]:bg-white [&>button]:border-zinc-300 [&>button]:text-zinc-900 [&>button]:h-10 [&>button]:rounded-xl">
                                            <Select value={formData.rol} onValueChange={(val) => setFormData({ ...formData, rol: val })}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-300 text-zinc-900 focus:ring-blue-500 focus:border-blue-500">
                                                    <SelectValue placeholder={t('users.form.selectRole') || 'Seleccionar rol'} />
                                                </SelectTrigger>
                                                <SelectContent className="min-w-[200px]">
                                                    {availableRoles.length === 0 && (
                                                        <SelectItem value={defaultRole}>{defaultRole}</SelectItem>
                                                    )}
                                                    {availableRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className={`flex items-center justify-between p-3 rounded-xl border min-h-[44px] mt-[26px] overflow-hidden transition-colors ${
                                        formData.pulpito 
                                            ? 'border-blue-500/50 bg-blue-50' 
                                            : 'border-zinc-200 bg-zinc-50'
                                    }`}>
                                        <Label className={`cursor-pointer ${formData.pulpito ? 'text-blue-700 font-semibold' : 'text-zinc-700'}`} htmlFor="pulpito-switch">{t('users.form.pulpit')}</Label>
                                        <Switch
                                            id="pulpito-switch"
                                            checked={formData.pulpito}
                                            onCheckedChange={(checked) => setFormData({ ...formData, pulpito: checked })}
                                            className="pulpito-blue"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t border-zinc-100">
                            <Button variant="ghost" type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false) }} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 shadow-lg shadow-blue-600/20">
                                {isLoading ? t('common.loading') : t('users.form.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Modal - LIGHT THEME */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-md bg-white border-zinc-200 rounded-3xl shadow-2xl text-zinc-900 overflow-hidden [&>*]:no-scrollbar">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {t('users.delete.title')}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            {t('users.delete.desc')} <strong>{selectedUser?.nombre} {selectedUser?.apellidos}</strong>.
                            <br /><br />
                            {t('users.delete.irreversible')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">{t('common.cancel')}</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="font-bold rounded-xl bg-red-600 text-white hover:bg-red-700">
                            {isLoading ? t('common.loading') : t('users.delete.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Avatar Editor Modal */}
            {tempImageSrc && (
                <AvatarEditor
                    imageSrc={tempImageSrc}
                    isOpen={isCropOpen}
                    onClose={() => { setIsCropOpen(false); setTempImageSrc(null) }}
                    onSave={handleCropSave}
                />
            )}
        </div>
    )
}
