'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Edit2, Trash2, AlertCircle, X, Users, Calendar, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { getSedes, createSede, updateSede, deleteSede, type SedeConStats } from './actions'

const emptyForm = { nombre: '', ciudad: '', direccion: '', email_dominio: '', activo: true, lat: '', lng: '' }

function parseCoord(value: string): number | null {
    const n = Number.parseFloat(value.replace(',', '.'))
    return Number.isFinite(n) ? n : null
}

export default function SedesClient({ initialSedes }: Readonly<{ initialSedes: SedeConStats[] }>) {
    const { t } = useI18n()
    const [sedes, setSedes] = useState<SedeConStats[]>(initialSedes)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selected, setSelected] = useState<SedeConStats | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [isLoading, setIsLoading] = useState(false)

    const refresh = async () => {
        const res = await getSedes()
        if (res.success && res.data) setSedes(res.data)
    }

    const openCreate = () => {
        setSelected(null)
        setForm(emptyForm)
        setIsFormOpen(true)
    }

    const openEdit = (sede: SedeConStats) => {
        setSelected(sede)
        setForm({
            nombre: sede.nombre,
            ciudad: sede.ciudad ?? '',
            direccion: sede.direccion ?? '',
            email_dominio: sede.email_dominio ?? '',
            activo: sede.activo,
            lat: sede.lat != null ? String(sede.lat) : '',
            lng: sede.lng != null ? String(sede.lng) : '',
        })
        setIsFormOpen(true)
    }

    const errorMessage = (code?: string): string => {
        switch (code) {
            case 'DUPLICADA': return t('admin.sedes.errorDuplicada')
            case 'PRINCIPAL_NO_DESACTIVABLE': return t('admin.sedes.errorPrincipalDesactivar')
            case 'PRINCIPAL_NO_ELIMINABLE': return t('admin.sedes.errorPrincipalEliminar')
            case 'SEDE_CON_DATOS': return t('admin.sedes.errorConDatos')
            default: return code || t('common.error')
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const payload = {
                nombre: form.nombre,
                ciudad: form.ciudad,
                direccion: form.direccion,
                email_dominio: form.email_dominio,
                lat: parseCoord(form.lat),
                lng: parseCoord(form.lng),
            }
            const result = selected
                ? await updateSede(selected.id, { ...payload, activo: form.activo })
                : await createSede(payload)

            if (result.success) {
                toast.success(selected ? t('admin.sedes.toastActualizada') : t('admin.sedes.toastCreada'))
                setIsFormOpen(false)
                await refresh()
            } else {
                toast.error(errorMessage(result.error))
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!selected) return
        setIsLoading(true)
        try {
            const result = await deleteSede(selected.id)
            if (result.success) {
                toast.success(t('admin.sedes.toastEliminada'))
                setIsDeleteOpen(false)
                setSelected(null)
                await refresh()
            } else {
                toast.error(errorMessage(result.error))
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="ofrenda-liquid-scope space-y-8 animate-in fade-in duration-500" data-page="admin-sedes">
            <PageHero
                title={t('admin.sedes.title')}
                subtitle={t('admin.sedes.desc')}
                icon={Building2}
                animate={false}
                data-testid="sedes-hero"
                actions={
                    <Button
                        onClick={openCreate}
                        data-testid="sedes-nueva"
                        className="w-full lg:w-auto gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        <span suppressHydrationWarning>{t('admin.sedes.nueva')}</span>
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                    {sedes.map((sede) => (
                        <motion.div
                            key={sede.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                            data-testid={`sede-card-${sede.slug}`}
                            className={`group relative ofrenda-liquid-card rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-[#1f2e85]/15 hover:-translate-y-1 ${!sede.activo ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-[#1f2e85]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg text-slate-900 truncate flex items-center gap-2">
                                            {sede.nombre}
                                            {sede.es_principal && (
                                                <Star
                                                    className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0"
                                                    aria-label={t('admin.sedes.principal')}
                                                />
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-500 truncate">
                                            {sede.ciudad || sede.slug}
                                        </p>
                                    </div>
                                </div>
                                {!sede.activo && (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-200 text-zinc-600">
                                        <span suppressHydrationWarning>{t('admin.sedes.inactiva')}</span>
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 flex items-center gap-2.5">
                                    <Users className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-lg font-black text-[#1f2e85] leading-none">{sede.usuarios}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide truncate" suppressHydrationWarning>
                                            {t('admin.sedes.usuarios')}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 flex items-center gap-2.5">
                                    <Calendar className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-lg font-black text-[#1f2e85] leading-none">{sede.cultos}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide truncate" suppressHydrationWarning>
                                            {t('admin.sedes.cultos')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEdit(sede)}
                                    data-testid={`sede-editar-${sede.slug}`}
                                    className="flex-1 rounded-xl h-9 font-bold bg-white border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                                >
                                    <Edit2 className="w-3.5 h-3.5 mr-2" />
                                    <span suppressHydrationWarning>{t('common.edit')}</span>
                                </Button>
                                {!sede.es_principal && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setSelected(sede); setIsDeleteOpen(true) }}
                                        aria-label={t('common.delete')}
                                        data-testid={`sede-eliminar-${sede.slug}`}
                                        className="rounded-xl h-9 w-9 text-red-500/70 hover:text-red-500 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Crear / Editar */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false) }}>
                <DialogContent className="max-w-lg bg-white border-[rgba(184,150,74,0.45)] p-0 gap-0 rounded-3xl shadow-2xl text-zinc-900 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="bg-[#f8f3e8] p-6 border-b border-[rgba(184,150,74,0.35)] sticky top-0 z-10">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-[#1f2e85]">
                                {selected ? <Edit2 className="w-6 h-6 text-[#b68f2f]" /> : <Plus className="w-6 h-6 text-[#b68f2f]" />}
                                <span suppressHydrationWarning>
                                    {selected ? t('admin.sedes.editarTitulo') : t('admin.sedes.crearTitulo')}
                                </span>
                            </DialogTitle>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-zinc-500 hover:text-[#1f2e85] transition-colors p-1 rounded-lg hover:bg-white"
                                aria-label={t('common.close')}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <DialogDescription className="text-zinc-500 mt-1">
                            <span suppressHydrationWarning>{t('admin.sedes.formDesc')}</span>
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                        <div className="space-y-2">
                            <Label htmlFor="sede-nombre" className="text-zinc-700">{t('admin.sedes.campoNombre')}</Label>
                            <Input
                                id="sede-nombre"
                                data-testid="sede-form-nombre"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                required
                                minLength={2}
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sede-ciudad" className="text-zinc-700">{t('admin.sedes.campoCiudad')}</Label>
                                <Input
                                    id="sede-ciudad"
                                    data-testid="sede-form-ciudad"
                                    value={form.ciudad}
                                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sede-dominio" className="text-zinc-700">{t('admin.sedes.campoDominio')}</Label>
                                <Input
                                    id="sede-dominio"
                                    data-testid="sede-form-dominio"
                                    value={form.email_dominio}
                                    onChange={(e) => setForm({ ...form, email_dominio: e.target.value })}
                                    placeholder="@idmjibarcelona.org" // i18n-ignore — dominio de ejemplo, no traducible
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sede-direccion" className="text-zinc-700">{t('admin.sedes.campoDireccion')}</Label>
                            <Input
                                id="sede-direccion"
                                data-testid="sede-form-direccion"
                                value={form.direccion}
                                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sede-lat" className="text-zinc-700">{t('admin.sedes.campoLat')}</Label>
                                <Input
                                    id="sede-lat"
                                    data-testid="sede-form-lat"
                                    value={form.lat}
                                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                                    inputMode="decimal"
                                    placeholder="41.5433" // i18n-ignore — coordenada de ejemplo, no traducible
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sede-lng" className="text-zinc-700">{t('admin.sedes.campoLng')}</Label>
                                <Input
                                    id="sede-lng"
                                    data-testid="sede-form-lng"
                                    value={form.lng}
                                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                                    inputMode="decimal"
                                    placeholder="2.1094" // i18n-ignore — coordenada de ejemplo, no traducible
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 -mt-2" suppressHydrationWarning>
                            {t('admin.sedes.coordsAyuda')}
                        </p>

                        {selected && !selected.es_principal && (
                            <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${form.activo ? 'border-blue-500/50 bg-blue-50' : 'border-zinc-200 bg-zinc-50'}`}>
                                <Label htmlFor="sede-activa" className={form.activo ? 'text-blue-700 font-semibold' : 'text-zinc-700'}>
                                    <span suppressHydrationWarning>{t('admin.sedes.campoActiva')}</span>
                                </Label>
                                <Switch
                                    id="sede-activa"
                                    checked={form.activo}
                                    onCheckedChange={(checked) => setForm({ ...form, activo: checked })}
                                />
                            </div>
                        )}

                        <DialogFooter className="pt-4 border-t border-[rgba(184,150,74,0.25)]">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a] rounded-xl"
                            >
                                <span suppressHydrationWarning>{t('common.cancel')}</span>
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                data-testid="sede-form-guardar"
                                className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8 shadow-[0_4px_16px_rgba(31,46,133,0.32)]"
                            >
                                <span suppressHydrationWarning>{isLoading ? t('common.loading') : t('common.save')}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Eliminar */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-md bg-white border-[rgba(184,150,74,0.45)] rounded-3xl shadow-2xl text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span suppressHydrationWarning>{t('admin.sedes.eliminarTitulo')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            <span suppressHydrationWarning>
                                {t('admin.sedes.eliminarDesc').replace('{name}', selected?.nombre ?? '')}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteOpen(false)}
                            className="text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a] rounded-xl"
                        >
                            <span suppressHydrationWarning>{t('common.cancel')}</span>
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                            data-testid="sede-eliminar-confirmar"
                            className="font-bold rounded-xl bg-red-600 text-white hover:bg-red-700"
                        >
                            <span suppressHydrationWarning>{isLoading ? t('common.loading') : t('common.delete')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
