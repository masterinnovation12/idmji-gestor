'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, Plus, Edit2, Trash2, AlertCircle, X, Clock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { CultoType, Sede } from '@/types/database'
import {
    createHorario,
    deleteHorario,
    getHorariosSede,
    updateHorario,
    type HorarioRow,
} from './actions'

type SedeOption = Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo' | 'es_principal'>

interface Props {
    readonly sedes: SedeOption[]
    readonly tipos: CultoType[]
    readonly initialSedeId: string
    readonly initialHorarios: HorarioRow[]
}

/** Orden visual de la semana: lunes → domingo. */
const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0] as const

const DIA_KEY = {
    0: 'day.sunday',
    1: 'day.monday',
    2: 'day.tuesday',
    3: 'day.wednesday',
    4: 'day.thursday',
    5: 'day.friday',
    6: 'day.saturday',
} as const

interface FormState {
    time: string
    tipoCultoId: number | null
    affected: boolean
    propagar: boolean
}

export default function HorariosClient({ sedes, tipos, initialSedeId, initialHorarios }: Props) {
    const { t } = useI18n()
    const [sedeId, setSedeId] = useState(initialSedeId)
    const [horarios, setHorarios] = useState<HorarioRow[]>(initialHorarios)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [formOpen, setFormOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [selected, setSelected] = useState<HorarioRow | null>(null)
    const [formDay, setFormDay] = useState<number>(1)
    const [form, setForm] = useState<FormState>({ time: '19:00', tipoCultoId: null, affected: true, propagar: true })
    const [eliminarFuturos, setEliminarFuturos] = useState(true)

    const sedeActual = useMemo(() => sedes.find(s => s.id === sedeId), [sedes, sedeId])
    // culto_types usa ids numéricos en BD aunque CultoType.id se declare string
    const tiposById = useMemo(() => new Map(tipos.map(tp => [Number(tp.id), tp])), [tipos])

    const refresh = useCallback(async (id: string) => {
        setIsLoading(true)
        const res = await getHorariosSede(id)
        if (res.success && res.data) setHorarios(res.data)
        else toast.error(res.error ?? t('common.error'))
        setIsLoading(false)
    }, [t])

    useEffect(() => {
        if (sedeId !== initialSedeId) void refresh(sedeId)
    }, [sedeId, initialSedeId, refresh])

    const porDia = useMemo(() => {
        const map = new Map<number, HorarioRow[]>()
        for (const h of horarios) {
            const list = map.get(h.day_of_week) ?? []
            list.push(h)
            map.set(h.day_of_week, list)
        }
        for (const list of map.values()) list.sort((a, b) => a.default_time.localeCompare(b.default_time))
        return map
    }, [horarios])

    const openCreate = (day: number) => {
        setSelected(null)
        setFormDay(day)
        setForm({ time: '19:00', tipoCultoId: tipos[0] ? Number(tipos[0].id) : null, affected: day >= 1 && day <= 5, propagar: true })
        setFormOpen(true)
    }

    const openEdit = (h: HorarioRow) => {
        setSelected(h)
        setFormDay(h.day_of_week)
        setForm({
            time: h.default_time.slice(0, 5),
            tipoCultoId: h.tipo_culto_id,
            affected: h.affected_by_laborable_festivo,
            propagar: true,
        })
        setFormOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (form.tipoCultoId == null) return
        setIsSaving(true)
        try {
            if (selected) {
                const res = await updateHorario(
                    selected.id,
                    { time: form.time, tipoCultoId: form.tipoCultoId, affected: form.affected },
                    form.propagar,
                )
                if (res.success && res.data) {
                    toast.success(
                        t('admin.horarios.toastActualizado').replace('{count}', String(res.data.cultosActualizados)),
                    )
                } else {
                    toast.error(res.error === 'DUPLICADO' ? t('admin.horarios.errorDuplicado') : res.error ?? t('common.error'))
                    return
                }
            } else {
                const res = await createHorario({
                    sedeId,
                    dayOfWeek: formDay,
                    time: form.time,
                    tipoCultoId: form.tipoCultoId,
                    affected: form.affected,
                })
                if (res.success && res.data) {
                    toast.success(t('admin.horarios.toastCreado').replace('{count}', String(res.data.cultosCreados)))
                } else {
                    toast.error(res.error === 'DUPLICADO' ? t('admin.horarios.errorDuplicado') : res.error ?? t('common.error'))
                    return
                }
            }
            setFormOpen(false)
            await refresh(sedeId)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selected) return
        setIsSaving(true)
        try {
            const res = await deleteHorario(selected.id, eliminarFuturos)
            if (res.success && res.data) {
                toast.success(t('admin.horarios.toastEliminado').replace('{count}', String(res.data.cultosEliminados)))
                setDeleteOpen(false)
                setSelected(null)
                await refresh(sedeId)
            } else {
                toast.error(res.error ?? t('common.error'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const tipoSeleccionado = form.tipoCultoId != null ? tiposById.get(form.tipoCultoId) : undefined

    return (
        <div className="ofrenda-liquid-scope space-y-8 animate-in fade-in duration-500" data-page="admin-horarios">
            <PageHero
                title={t('admin.horarios.title')}
                subtitle={t('admin.horarios.desc')}
                icon={CalendarClock}
                animate={false}
                data-testid="horarios-hero"
            />

            {/* Selector de sede */}
            <div className="flex flex-wrap items-center gap-2" data-testid="horarios-sede-selector">
                {sedes.map(sede => (
                    <button
                        key={sede.id}
                        type="button"
                        onClick={() => setSedeId(sede.id)}
                        data-testid={`horarios-sede-${sede.slug}`}
                        className={sede.id === sedeId
                            ? 'px-4 py-2 rounded-xl font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-2 border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                            : `px-4 py-2 rounded-xl font-semibold bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:border-[#b8964a] hover:text-[#1f2e85] transition-all ${!sede.activo ? 'opacity-50' : ''}`}
                    >
                        {sede.nombre}
                    </button>
                ))}
            </div>

            <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                {DIAS_ORDEN.map((day, index) => {
                    const items = porDia.get(day) ?? []
                    return (
                        <motion.div
                            key={`${sedeId}-${day}`}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            data-testid={`horarios-dia-${day}`}
                            className="ofrenda-liquid-card rounded-3xl p-5 flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-900" suppressHydrationWarning>
                                    {t(DIA_KEY[day as keyof typeof DIA_KEY])}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => openCreate(day)}
                                    aria-label={t('admin.horarios.nuevoEnDia')}
                                    data-testid={`horarios-add-${day}`}
                                    className="w-8 h-8 rounded-xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center text-[#1f2e85] hover:bg-[#b8964a]/20 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <p className="text-xs text-slate-400 italic" suppressHydrationWarning>
                                    {t('admin.horarios.sinCultos')}
                                </p>
                            ) : (
                                items.map(h => {
                                    const tipo = tiposById.get(h.tipo_culto_id)
                                    return (
                                        <div
                                            key={h.id}
                                            data-testid={`horario-${day}-${h.default_time.slice(0, 5)}`}
                                            className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 flex items-center gap-3"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Clock className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-black text-[#1f2e85] leading-tight">
                                                        {h.default_time.slice(0, 5)}
                                                    </p>
                                                    <p className="text-[11px] font-bold truncate flex items-center gap-1.5">
                                                        <span
                                                            className="inline-block w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: tipo?.color ?? '#94a3b8' }}
                                                        />
                                                        <span className="text-slate-600">{tipo?.nombre ?? '—'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(h)}
                                                    aria-label={t('common.edit')}
                                                    data-testid={`horario-editar-${day}-${h.default_time.slice(0, 5)}`}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1f2e85]/70 hover:text-[#1f2e85] hover:bg-white transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelected(h); setEliminarFuturos(true); setDeleteOpen(true) }}
                                                    aria-label={t('common.delete')}
                                                    data-testid={`horario-eliminar-${day}-${h.default_time.slice(0, 5)}`}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Crear / editar horario */}
            <Dialog open={formOpen} onOpenChange={(open) => { if (!open) setFormOpen(false) }}>
                <DialogContent className="max-w-lg bg-white border-[rgba(184,150,74,0.45)] p-0 gap-0 rounded-3xl shadow-2xl text-zinc-900 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="bg-[#f8f3e8] p-6 border-b border-[rgba(184,150,74,0.35)] sticky top-0 z-10">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-[#1f2e85]">
                                {selected ? <Edit2 className="w-6 h-6 text-[#b68f2f]" /> : <Plus className="w-6 h-6 text-[#b68f2f]" />}
                                <span suppressHydrationWarning>
                                    {selected ? t('admin.horarios.editarTitulo') : t('admin.horarios.crearTitulo')}
                                </span>
                            </DialogTitle>
                            <button
                                onClick={() => setFormOpen(false)}
                                className="text-zinc-500 hover:text-[#1f2e85] transition-colors p-1 rounded-lg hover:bg-white"
                                aria-label={t('common.close')}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <DialogDescription className="text-zinc-500 mt-1">
                            <span suppressHydrationWarning>
                                {`${sedeActual?.nombre ?? ''} · ${t(DIA_KEY[formDay as keyof typeof DIA_KEY])}`}
                            </span>
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                        <div className="space-y-2">
                            <Label htmlFor="horario-hora" className="text-zinc-700">{t('admin.horarios.campoHora')}</Label>
                            <Input
                                id="horario-hora"
                                data-testid="horario-form-hora"
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                                required
                                className="bg-white border-zinc-300 text-zinc-900 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-700" suppressHydrationWarning>{t('admin.horarios.campoTipo')}</Label>
                            <div className="grid gap-2">
                                {tipos.map(tipo => (
                                    <button
                                        key={tipo.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, tipoCultoId: Number(tipo.id) })}
                                        data-testid={`horario-form-tipo-${tipo.id}`}
                                        className={form.tipoCultoId === Number(tipo.id)
                                            ? 'flex items-center gap-3 p-3 rounded-xl border-2 border-[#b8964a] bg-[#f8f3e8] text-left transition-all'
                                            : 'flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white text-left hover:border-[#b8964a]/50 transition-all'}
                                    >
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tipo.color }} />
                                        <span className="min-w-0">
                                            <span className="block font-bold text-sm text-slate-900">{tipo.nombre}</span>
                                            <span className="block text-[11px] text-slate-500" suppressHydrationWarning>
                                                {[
                                                    tipo.tiene_lectura_introduccion ? t('admin.horarios.compIntro') : null,
                                                    tipo.tiene_ensenanza ? t('admin.horarios.compEnsenanza') : null,
                                                    tipo.tiene_testimonios ? t('admin.horarios.compTestimonios') : null,
                                                    tipo.tiene_himnos_y_coros ? t('admin.horarios.compHimnos') : null,
                                                    tipo.tiene_lectura_finalizacion ? t('admin.horarios.compFinal') : null,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                            <Label htmlFor="horario-festivo" className="text-zinc-700 text-sm pr-3">
                                <span suppressHydrationWarning>{t('admin.horarios.campoFestivo')}</span>
                            </Label>
                            <Switch
                                id="horario-festivo"
                                checked={form.affected}
                                onCheckedChange={(checked) => setForm({ ...form, affected: checked })}
                            />
                        </div>

                        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${form.propagar ? 'border-blue-500/50 bg-blue-50' : 'border-zinc-200 bg-zinc-50'}`}>
                            <Sparkles className="w-4 h-4 mt-0.5 text-[#1f2e85] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <Label htmlFor="horario-propagar" className={form.propagar ? 'text-blue-700 font-semibold' : 'text-zinc-700'}>
                                    <span suppressHydrationWarning>
                                        {selected ? t('admin.horarios.propagarEditar') : t('admin.horarios.propagarCrear')}
                                    </span>
                                </Label>
                                <p className="text-[11px] text-slate-500 mt-0.5" suppressHydrationWarning>
                                    {selected ? t('admin.horarios.propagarEditarDesc') : t('admin.horarios.propagarCrearDesc')}
                                </p>
                            </div>
                            {selected ? (
                                <Switch
                                    id="horario-propagar"
                                    data-testid="horario-form-propagar"
                                    checked={form.propagar}
                                    onCheckedChange={(checked) => setForm({ ...form, propagar: checked })}
                                />
                            ) : null}
                        </div>

                        {tipoSeleccionado && (
                            <p className="text-xs text-slate-500" suppressHydrationWarning>
                                {t('admin.horarios.notaTipo').replace('{tipo}', tipoSeleccionado.nombre)}
                            </p>
                        )}

                        <DialogFooter className="pt-4 border-t border-[rgba(184,150,74,0.25)]">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setFormOpen(false)}
                                className="text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a] rounded-xl"
                            >
                                <span suppressHydrationWarning>{t('common.cancel')}</span>
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving || form.tipoCultoId == null}
                                data-testid="horario-form-guardar"
                                className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8 shadow-[0_4px_16px_rgba(31,46,133,0.32)]"
                            >
                                <span suppressHydrationWarning>{isSaving ? t('common.loading') : t('common.save')}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Eliminar horario */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-md bg-white border-[rgba(184,150,74,0.45)] rounded-3xl shadow-2xl text-zinc-900">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span suppressHydrationWarning>{t('admin.horarios.eliminarTitulo')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            <span suppressHydrationWarning>
                                {t('admin.horarios.eliminarDesc')
                                    .replace('{dia}', selected ? t(DIA_KEY[selected.day_of_week as keyof typeof DIA_KEY]) : '')
                                    .replace('{hora}', selected?.default_time.slice(0, 5) ?? '')}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                        <Label htmlFor="horario-eliminar-futuros" className="text-zinc-700 text-sm pr-3">
                            <span suppressHydrationWarning>{t('admin.horarios.eliminarFuturos')}</span>
                        </Label>
                        <Switch
                            id="horario-eliminar-futuros"
                            data-testid="horario-eliminar-futuros"
                            checked={eliminarFuturos}
                            onCheckedChange={setEliminarFuturos}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteOpen(false)}
                            className="text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a] rounded-xl"
                        >
                            <span suppressHydrationWarning>{t('common.cancel')}</span>
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSaving}
                            data-testid="horario-eliminar-confirmar"
                            className="font-bold rounded-xl bg-red-600 text-white hover:bg-red-700"
                        >
                            <span suppressHydrationWarning>{isSaving ? t('common.loading') : t('common.delete')}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
