'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, Plus, Search, Edit2, Trash2, AlertCircle, X, Clock, ListMusic } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import {
    getCatalogo,
    createCatalogoItem,
    updateCatalogoItem,
    deleteCatalogoItem,
    type CatalogoItem,
} from './actions'
import { formatDuracion, parseDuracion, type CatalogoTipo } from './himnarioValidation'

interface Props {
    initialHimnos: CatalogoItem[]
    initialCoros: CatalogoItem[]
}

const emptyForm = { numero: '', titulo: '', duracion: '' }

export default function HimnarioAdminClient({ initialHimnos, initialCoros }: Readonly<Props>) {
    const { t } = useI18n()
    const [tab, setTab] = useState<CatalogoTipo>('himno')
    const [himnos, setHimnos] = useState<CatalogoItem[]>(initialHimnos)
    const [coros, setCoros] = useState<CatalogoItem[]>(initialCoros)
    const [search, setSearch] = useState('')
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [selected, setSelected] = useState<CatalogoItem | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [isLoading, setIsLoading] = useState(false)

    const items = tab === 'himno' ? himnos : coros

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return items
        return items.filter(
            i => i.titulo.toLowerCase().includes(q) || String(i.numero).includes(q),
        )
    }, [items, search])

    const refresh = async (tipo: CatalogoTipo) => {
        const res = await getCatalogo(tipo)
        if (res.success && res.data) {
            if (tipo === 'himno') setHimnos(res.data)
            else setCoros(res.data)
        }
    }

    const errorMessage = (code?: string): string => {
        switch (code) {
            case 'NUMERO_DUPLICADO': return t('admin.himnario.errorNumeroDuplicado')
            case 'NUMERO_INVALIDO': return t('admin.himnario.errorNumero')
            case 'TITULO_INVALIDO': return t('admin.himnario.errorTitulo')
            case 'DURACION_INVALIDA': return t('admin.himnario.errorDuracion')
            case 'EN_USO': return t('admin.himnario.errorEnUso')
            default: return code || t('common.error')
        }
    }

    const openCreate = () => {
        setSelected(null)
        setForm(emptyForm)
        setIsFormOpen(true)
    }

    const openEdit = (item: CatalogoItem) => {
        setSelected(item)
        setForm({
            numero: String(item.numero),
            titulo: item.titulo,
            duracion: item.duracion_segundos > 0 ? formatDuracion(item.duracion_segundos) : '',
        })
        setIsFormOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const duracion = parseDuracion(form.duracion)
        if (duracion === null) {
            toast.error(t('admin.himnario.errorDuracion'))
            return
        }
        const payload = {
            numero: Number(form.numero),
            titulo: form.titulo,
            duracion_segundos: duracion,
        }

        setIsLoading(true)
        try {
            const result = selected
                ? await updateCatalogoItem(tab, selected.id, payload)
                : await createCatalogoItem(tab, payload)

            if (result.success) {
                toast.success(selected ? t('admin.himnario.toastActualizado') : t('admin.himnario.toastCreado'))
                setIsFormOpen(false)
                await refresh(tab)
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
            const result = await deleteCatalogoItem(tab, selected.id)
            if (result.success) {
                toast.success(t('admin.himnario.toastEliminado'))
                setIsDeleteOpen(false)
                setSelected(null)
                await refresh(tab)
            } else {
                toast.error(errorMessage(result.error))
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-himnario">
            <PageHero
                title={t('admin.himnario.title')}
                subtitle={t('admin.himnario.desc')}
                icon={Music}
                animate={false}
                data-testid="himnario-admin-hero"
                actions={
                    <Button
                        onClick={openCreate}
                        data-testid="himnario-nuevo"
                        className="w-full lg:w-auto gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        <span suppressHydrationWarning>
                            {tab === 'himno' ? t('admin.himnario.nuevoHimno') : t('admin.himnario.nuevoCoro')}
                        </span>
                    </Button>
                }
            />

            {/* Tabs + buscador */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex gap-2 rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white p-1.5 w-fit" role="tablist">
                    {([
                        { id: 'himno' as const, label: t('admin.himnario.tabHimnos'), count: himnos.length },
                        { id: 'coro' as const, label: t('admin.himnario.tabCoros'), count: coros.length },
                    ]).map(def => (
                        <button
                            key={def.id}
                            role="tab"
                            aria-selected={tab === def.id}
                            data-testid={`himnario-tab-${def.id}`}
                            onClick={() => { setTab(def.id); setSearch('') }}
                            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${tab === def.id
                                ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                                : 'text-slate-500 hover:text-[#1f2e85]'}`}
                        >
                            <span suppressHydrationWarning>{def.label}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${tab === def.id ? 'bg-white/20' : 'bg-zinc-100'}`}>
                                {def.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative bg-white rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.32)] focus-within:border-[#b8964a] shadow-sm flex items-center px-4 h-12 md:w-80">
                    <Search className="w-4 h-4 text-[#b8964a] mr-3 shrink-0" />
                    <input
                        type="text"
                        data-testid="himnario-buscar"
                        placeholder={t('admin.himnario.buscar')}
                        className="bg-transparent border-none outline-none w-full text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-2">
                <AnimatePresence initial={false}>
                    {filtered.map(item => (
                        <motion.div
                            key={`${tab}-${item.id}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            data-testid={`himnario-item-${tab}-${item.numero}`}
                            className="ofrenda-liquid-card rounded-2xl px-4 py-3 flex items-center gap-3 md:gap-4"
                        >
                            <span className="shrink-0 w-12 h-10 rounded-xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center font-black text-[#1f2e85] text-sm">
                                {item.numero}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 truncate">{item.titulo}</p>
                                <p className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.duracion_segundos > 0 ? formatDuracion(item.duracion_segundos) : '—'}
                                    </span>
                                    <span className="flex items-center gap-1" suppressHydrationWarning>
                                        <ListMusic className="w-3 h-3" />
                                        {t('admin.himnario.usos').replace('{n}', String(item.usos))}
                                    </span>
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEdit(item)}
                                    aria-label={t('common.edit')}
                                    data-testid={`himnario-editar-${tab}-${item.numero}`}
                                    className="rounded-xl h-9 w-9 p-0 bg-white border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelected(item); setIsDeleteOpen(true) }}
                                    disabled={item.usos > 0}
                                    aria-label={t('common.delete')}
                                    title={item.usos > 0 ? t('admin.himnario.errorEnUso') : undefined}
                                    data-testid={`himnario-eliminar-${tab}-${item.numero}`}
                                    className="rounded-xl h-9 w-9 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div className="border-2 border-dashed border-[rgba(184,150,74,0.3)] rounded-2xl p-10 text-center text-sm text-slate-500" suppressHydrationWarning>
                        {t('admin.himnario.sinResultados')}
                    </div>
                )}
            </div>

            {/* Crear / Editar */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false) }}>
                <DialogContent className="max-w-md bg-white border-[rgba(184,150,74,0.45)] p-0 gap-0 rounded-3xl shadow-2xl text-zinc-900">
                    <div className="bg-[#f8f3e8] p-6 border-b border-[rgba(184,150,74,0.35)]">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-xl font-black flex items-center gap-3 text-[#1f2e85]">
                                {selected ? <Edit2 className="w-5 h-5 text-[#b68f2f]" /> : <Plus className="w-5 h-5 text-[#b68f2f]" />}
                                <span suppressHydrationWarning>
                                    {selected
                                        ? (tab === 'himno' ? t('admin.himnario.editarHimno') : t('admin.himnario.editarCoro'))
                                        : (tab === 'himno' ? t('admin.himnario.nuevoHimno') : t('admin.himnario.nuevoCoro'))}
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
                            <span suppressHydrationWarning>{t('admin.himnario.formDesc')}</span>
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cat-numero" className="text-zinc-700">{t('admin.himnario.campoNumero')}</Label>
                                <Input
                                    id="cat-numero"
                                    data-testid="himnario-form-numero"
                                    type="number"
                                    min={1}
                                    max={9999}
                                    value={form.numero}
                                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                    required
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cat-duracion" className="text-zinc-700">{t('admin.himnario.campoDuracion')}</Label>
                                <Input
                                    id="cat-duracion"
                                    data-testid="himnario-form-duracion"
                                    value={form.duracion}
                                    onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                                    placeholder="4:05"
                                    className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-titulo" className="text-zinc-700">{t('admin.himnario.campoTitulo')}</Label>
                            <Input
                                id="cat-titulo"
                                data-testid="himnario-form-titulo"
                                value={form.titulo}
                                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                required
                                minLength={2}
                                maxLength={160}
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                            />
                        </div>

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
                                data-testid="himnario-form-guardar"
                                className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8"
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
                            <span suppressHydrationWarning>{t('admin.himnario.eliminarTitulo')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            <span suppressHydrationWarning>
                                {t('admin.himnario.eliminarDesc')
                                    .replace('{numero}', String(selected?.numero ?? ''))
                                    .replace('{titulo}', selected?.titulo ?? '')}
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
                            data-testid="himnario-eliminar-confirmar"
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
