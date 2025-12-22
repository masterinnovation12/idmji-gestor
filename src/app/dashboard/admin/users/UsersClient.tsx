'use client'

import { useState, useRef, useEffect } from 'react'
import { getUsers, createUser, updateUserFull, deleteUser, cleanupNonDomainUsers, UserData } from './actions'
import { Users, Search, Shield, UserCheck, Trash2, Edit2, Plus, Camera, RotateCw, AlertTriangle, AlertCircle } from 'lucide-react'
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
}

export default function UsersClient({ initialUsers, counts }: UsersClientProps) {
    const { t } = useI18n()
    const [users, setUsers] = useState<UserData[]>(initialUsers)
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [isCleanupOpen, setIsCleanupOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

    // Form States
    const [formData, setFormData] = useState({
        nombre: '',
        apellidos: '',
        email: '',
        password: '',
        rol: 'MIEMBRO',
        pulpito: false
    })
    const [avatarFile, setAvatarFile] = useState<Blob | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isCropOpen, setIsCropOpen] = useState(false)
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

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
            password: '',
            rol: 'MIEMBRO',
            pulpito: false
        })
        setAvatarFile(null)
        setAvatarPreview(null)
        setTempImageSrc(null)
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const data = new FormData()
        data.append('nombre', formData.nombre)
        data.append('apellidos', formData.apellidos)
        data.append('rol', formData.rol)
        data.append('pulpito', String(formData.pulpito))
        if (avatarFile) data.append('avatar', avatarFile, 'avatar.jpg')

        let result
        if (selectedUser) {
            // Edit Mode
            data.append('id', selectedUser.id)
            data.append('currentAvatarUrl', selectedUser.avatar_url || '')
            result = await updateUserFull(data)
        } else {
            // Create Mode
            data.append('email', formData.email)
            data.append('password', formData.password)
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
        setIsLoading(false)
    }

    const handleDelete = async () => {
        if (!selectedUser) return
        setIsLoading(true)
        const result = await deleteUser(selectedUser.id)
        if (result.success) {
            toast.success(t('users.toast.deleted'))
            setUsers(users.filter(u => u.id !== selectedUser.id))
            setIsDeleteOpen(false)
        } else {
            toast.error(result.error)
        }
        setIsLoading(false)
    }

    const handleCleanup = async () => {
        setIsLoading(true)
        const result = await cleanupNonDomainUsers()
        if (result.success) {
            toast.success(`${t('users.toast.cleaned')}: ${result.data}`)
            const refresh = await getUsers()
            if (refresh.success && refresh.data) setUsers(refresh.data)
            setIsCleanupOpen(false)
        } else {
            toast.error(result.error)
        }
        setIsLoading(false)
    }

    const openEdit = (user: UserData) => {
        setSelectedUser(user)
        setFormData({
            nombre: user.nombre === 'Sin nombre' ? '' : user.nombre,
            apellidos: user.apellidos === 'Sin apellidos' ? '' : user.apellidos,
            email: user.email || '',
            password: '',
            rol: user.rol,
            pulpito: user.pulpito
        })
        setAvatarPreview(user.avatar_url)
        setIsEditOpen(true)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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
                        variant="destructive"
                        onClick={() => setIsCleanupOpen(true)}
                        className="gap-2 rounded-xl font-bold"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('users.clean')}
                    </Button>
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
                <DialogContent className="max-w-2xl bg-white border-zinc-200 p-0 overflow-hidden gap-0 rounded-3xl shadow-2xl text-zinc-900">
                    <div className="bg-zinc-50 p-6 border-b border-zinc-200">
                        <DialogTitle className="text-2xl font-black flex items-center gap-3 text-zinc-900">
                            {isEditOpen ? <Edit2 className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                            {isEditOpen ? t('users.edit.title') : t('users.create.title')}
                        </DialogTitle>
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
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            required
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apellidos" className="text-zinc-700">{t('users.form.lastName')}</Label>
                                        <Input
                                            id="apellidos"
                                            value={formData.apellidos}
                                            onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                                            required
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-700">{t('users.form.email')} <span className="text-zinc-400 text-xs">(@idmjisabadell.org)</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        disabled={isEditOpen}
                                        className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-zinc-100 placeholder:text-zinc-400"
                                    />
                                    {isCreateOpen && !formData.email.endsWith('@idmjisabadell.org') && formData.email.length > 5 && (
                                        <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Debe terminar en @idmjisabadell.org
                                        </p>
                                    )}
                                </div>

                                {isCreateOpen && (
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-zinc-700">{t('users.form.password')}</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            minLength={6}
                                            className="bg-white border-zinc-300 text-zinc-900 rounded-xl focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-400"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-700">{t('users.form.role')}</Label>
                                        <div className="[&>button]:bg-white [&>button]:border-zinc-300 [&>button]:text-zinc-900 [&>button]:h-10 [&>button]:rounded-xl">
                                            <Select value={formData.rol} onValueChange={(val) => setFormData({ ...formData, rol: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white border-zinc-200 text-zinc-900 shadow-xl">
                                                    <SelectItem value="MIEMBRO">MIEMBRO</SelectItem>
                                                    <SelectItem value="EDITOR">EDITOR</SelectItem>
                                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50 h-[42px] mt-[26px]">
                                        <Label className="cursor-pointer text-zinc-700" htmlFor="pulpito-switch">{t('users.form.pulpit')}</Label>
                                        <Switch
                                            id="pulpito-switch"
                                            checked={formData.pulpito}
                                            onCheckedChange={(checked) => setFormData({ ...formData, pulpito: checked })}
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
                <DialogContent className="max-w-md bg-white border-zinc-200 rounded-3xl shadow-2xl text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {t('users.delete.title')}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            {t('users.delete.desc')} <strong>{selectedUser?.nombre} {selectedUser?.apellidos}</strong>.
                            <br /><br />
                            Esta acción no se puede deshacer.
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

            {/* Confirm Cleanup Modal - LIGHT THEME */}
            <Dialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
                <DialogContent className="max-w-md bg-white border-zinc-200 rounded-3xl shadow-2xl text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            {t('users.clean.title')}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            {t('users.clean.desc')} (<code>@idmjisabadell.org</code>).
                            <br /><br />
                            Usa esto con precaución.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCleanupOpen(false)} className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">{t('common.cancel')}</Button>
                        <Button onClick={handleCleanup} disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                            {isLoading ? t('common.loading') : t('users.clean.confirm')}
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
