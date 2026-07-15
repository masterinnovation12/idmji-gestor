'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { UsersRound, Mic2, HandHeart, Grid3x3, Plus, Edit2, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { Sede } from '@/types/database'
import {
    getPersonasSede,
    savePersonaLabor,
    savePersonaPlano,
    updatePersonaPulpito,
    type PersonaLabor,
    type PersonaPlano,
    type PersonaPulpito,
    type PersonasSede,
} from './actions'

type SedeOption = Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo' | 'es_principal'>
type Tab = 'pulpito' | 'labor' | 'plano'

interface Props {
    readonly sedes: SedeOption[]
    readonly initialSedeId: string
    readonly initialPersonas: PersonasSede
}

export default function PersonasClient({ sedes, initialSedeId, initialPersonas }: Props) {
    const { t } = useI18n()
    const [sedeId, setSedeId] = useState(initialSedeId)
    const [personas, setPersonas] = useState<PersonasSede>(initialPersonas)
    const [tab, setTab] = useState<Tab>('pulpito')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Modales de edición/alta
    const [pulpitoEdit, setPulpitoEdit] = useState<PersonaPulpito | null>(null)
    const [laborEdit, setLaborEdit] = useState<Partial<PersonaLabor> | null>(null)
    const [planoEdit, setPlanoEdit] = useState<Partial<PersonaPlano> | null>(null)

    const refresh = useCallback(async (id: string) => {
        setIsLoading(true)
        const res = await getPersonasSede(id)
        if (res.success && res.data) setPersonas(res.data)
        else toast.error(res.error ?? t('common.error'))
        setIsLoading(false)
    }, [t])

    useEffect(() => {
        if (sedeId !== initialSedeId) void refresh(sedeId)
    }, [sedeId, initialSedeId, refresh])

    const tabs: Array<{ id: Tab; icon: React.ElementType; label: string; count: number }> = [
        { id: 'pulpito', icon: Mic2, label: t('admin.personas.tabPulpito'), count: personas.pulpito.length },
        { id: 'labor', icon: HandHeart, label: t('admin.personas.tabLabor'), count: personas.labor.length },
        { id: 'plano', icon: Grid3x3, label: t('admin.personas.tabPlano'), count: personas.plano.length },
    ]

    const grupoLabel = useMemo(() => ({
        1: t('admin.personas.grupo1'),
        2: t('admin.personas.grupo2'),
        3: t('admin.personas.grupo3'),
    }), [t])

    const capacidadLabel = useMemo(() => ({
        ofrendario: t('admin.personas.capacidadOfrendario'),
        apoyo: t('admin.personas.capacidadApoyo'),
        ambos: t('admin.personas.capacidadAmbos'),
    }), [t])

    const handleSavePulpito = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!pulpitoEdit) return
        setIsSaving(true)
        try {
            const res = await updatePersonaPulpito({
                id: pulpitoEdit.id,
                nombre: pulpitoEdit.nombre,
                apellidos: pulpitoEdit.apellidos,
                pulpito: pulpitoEdit.pulpito,
                sedeId,
            })
            if (res.success) {
                toast.success(t('admin.personas.toastGuardado'))
                setPulpitoEdit(null)
                await refresh(sedeId)
            } else {
                toast.error(res.error ?? t('common.error'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveLabor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!laborEdit?.nombre) return
        setIsSaving(true)
        try {
            const res = await savePersonaLabor({
                id: laborEdit.id,
                sedeId,
                nombre: laborEdit.nombre,
                grupo: (laborEdit.grupo ?? 1) as 1 | 2 | 3,
                activo: laborEdit.activo ?? true,
            })
            if (res.success) {
                toast.success(t('admin.personas.toastGuardado'))
                setLaborEdit(null)
                await refresh(sedeId)
            } else {
                toast.error(res.error ?? t('common.error'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSavePlano = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!planoEdit?.nombre) return
        setIsSaving(true)
        try {
            const res = await savePersonaPlano({
                id: planoEdit.id,
                sedeId,
                nombre: planoEdit.nombre,
                capacidad: (planoEdit.capacidad ?? 'ambos') as 'ofrendario' | 'apoyo' | 'ambos',
                activo: planoEdit.activo ?? true,
            })
            if (res.success) {
                toast.success(t('admin.personas.toastGuardado'))
                setPlanoEdit(null)
                await refresh(sedeId)
            } else {
                toast.error(res.error === 'DUPLICADA' ? t('admin.personas.errorDuplicada') : res.error ?? t('common.error'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const inputClass = 'bg-white border-zinc-300 text-zinc-900 rounded-xl'
    const dialogClass = 'max-w-md bg-white border-[rgba(184,150,74,0.45)] rounded-3xl shadow-2xl text-zinc-900'
    const rowClass = 'flex items-center gap-3 rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3'

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-personas">
            <PageHero
                title={t('admin.personas.title')}
                subtitle={t('admin.personas.desc')}
                icon={UsersRound}
                animate={false}
                data-testid="personas-hero"
            />

            {/* Selector de sede */}
            <div className="flex flex-wrap items-center gap-2" data-testid="personas-sede-selector">
                {sedes.map(sede => (
                    <button
                        key={sede.id}
                        type="button"
                        onClick={() => setSedeId(sede.id)}
                        data-testid={`personas-sede-${sede.slug}`}
                        className={sede.id === sedeId
                            ? 'px-4 py-2 rounded-xl font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-2 border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                            : `px-4 py-2 rounded-xl font-semibold bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:border-[#b8964a] hover:text-[#1f2e85] transition-all ${!sede.activo ? 'opacity-50' : ''}`}
                    >
                        {sede.nombre}
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1.5 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] w-fit">
                {tabs.map(tb => {
                    const Icon = tb.icon
                    return (
                        <button
                            key={tb.id}
                            type="button"
                            onClick={() => setTab(tb.id)}
                            data-testid={`personas-tab-${tb.id}`}
                            className={tab === tb.id
                                ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                                : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-slate-500 hover:text-[#1f2e85] transition-all'}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span suppressHydrationWarning>{tb.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${tab === tb.id ? 'bg-white/20' : 'bg-[#1f2e85]/10 text-[#1f2e85]'}`}>
                                {tb.count}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className={`ofrenda-liquid-card rounded-3xl p-5 space-y-3 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`} data-testid="personas-lista">
                {tab === 'pulpito' && (
                    <>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500" suppressHydrationWarning>{t('admin.personas.pulpitoNota')}</p>
                            <Link
                                href="/dashboard/admin/users"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f2e85] hover:text-[#b8964a] transition-colors shrink-0"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span suppressHydrationWarning>{t('admin.personas.irAUsuarios')}</span>
                            </Link>
                        </div>
                        {personas.pulpito.map(p => (
                            <div key={p.id} className={rowClass} data-testid={`persona-pulpito-${p.id}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate">{p.nombre} {p.apellidos}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{p.email ?? '—'} · {p.rol}</p>
                                </div>
                                {p.pulpito && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#1f2e85]/10 text-[#1f2e85] shrink-0">
                                        <span suppressHydrationWarning>{t('admin.personas.badgePulpito')}</span>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPulpitoEdit(p)}
                                    aria-label={t('common.edit')}
                                    data-testid={`persona-pulpito-editar-${p.id}`}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1f2e85]/70 hover:text-[#1f2e85] hover:bg-white transition-colors shrink-0"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'labor' && (
                    <>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setLaborEdit({ grupo: 1, activo: true, nombre: '' })}
                                data-testid="persona-labor-nueva"
                                className="gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8]"
                            >
                                <Plus className="w-4 h-4" />
                                <span suppressHydrationWarning>{t('common.add')}</span>
                            </Button>
                        </div>
                        {personas.labor.map(p => (
                            <div key={p.id} className={`${rowClass} ${!p.activo ? 'opacity-50' : ''}`} data-testid={`persona-labor-${p.id}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate">{p.nombre}</p>
                                    <p className="text-[11px] text-slate-500" suppressHydrationWarning>
                                        {grupoLabel[p.grupo]}{!p.activo ? ` · ${t('admin.sedes.inactiva')}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLaborEdit(p)}
                                    aria-label={t('common.edit')}
                                    data-testid={`persona-labor-editar-${p.id}`}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1f2e85]/70 hover:text-[#1f2e85] hover:bg-white transition-colors shrink-0"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'plano' && (
                    <>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setPlanoEdit({ capacidad: 'ambos', activo: true, nombre: '' })}
                                data-testid="persona-plano-nueva"
                                className="gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8]"
                            >
                                <Plus className="w-4 h-4" />
                                <span suppressHydrationWarning>{t('common.add')}</span>
                            </Button>
                        </div>
                        {personas.plano.map(p => (
                            <div key={p.id} className={`${rowClass} ${!p.activo ? 'opacity-50' : ''}`} data-testid={`persona-plano-${p.id}`}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate">{p.nombre}</p>
                                    <p className="text-[11px] text-slate-500" suppressHydrationWarning>
                                        {capacidadLabel[p.capacidad as keyof typeof capacidadLabel] ?? p.capacidad}
                                        {!p.activo ? ` · ${t('admin.sedes.inactiva')}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPlanoEdit(p)}
                                    aria-label={t('common.edit')}
                                    data-testid={`persona-plano-editar-${p.id}`}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1f2e85]/70 hover:text-[#1f2e85] hover:bg-white transition-colors shrink-0"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Modal púlpito */}
            <Dialog open={pulpitoEdit != null} onOpenChange={(open) => { if (!open) setPulpitoEdit(null) }}>
                <DialogContent className={dialogClass}>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-black text-[#1f2e85]">
                            <span suppressHydrationWarning>{t('admin.personas.editarPulpito')}</span>
                        </DialogTitle>
                        <button onClick={() => setPulpitoEdit(null)} aria-label={t('common.close')} className="text-zinc-500 hover:text-[#1f2e85] p-1 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <DialogDescription className="text-zinc-500">{pulpitoEdit?.email ?? ''}</DialogDescription>
                    {pulpitoEdit && (
                        <form onSubmit={handleSavePulpito} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pp-nombre" className="text-zinc-700">{t('admin.personas.campoNombre')}</Label>
                                <Input
                                    id="pp-nombre"
                                    data-testid="persona-pulpito-nombre"
                                    value={pulpitoEdit.nombre}
                                    onChange={(e) => setPulpitoEdit({ ...pulpitoEdit, nombre: e.target.value })}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pp-apellidos" className="text-zinc-700">{t('admin.personas.campoApellidos')}</Label>
                                <Input
                                    id="pp-apellidos"
                                    data-testid="persona-pulpito-apellidos"
                                    value={pulpitoEdit.apellidos}
                                    onChange={(e) => setPulpitoEdit({ ...pulpitoEdit, apellidos: e.target.value })}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                                <Label htmlFor="pp-pulpito" className="text-zinc-700 text-sm">
                                    <span suppressHydrationWarning>{t('admin.personas.campoPulpito')}</span>
                                </Label>
                                <Switch
                                    id="pp-pulpito"
                                    checked={pulpitoEdit.pulpito}
                                    onCheckedChange={(checked) => setPulpitoEdit({ ...pulpitoEdit, pulpito: checked })}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    data-testid="persona-pulpito-guardar"
                                    className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8"
                                >
                                    <span suppressHydrationWarning>{isSaving ? t('common.loading') : t('common.save')}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal labor */}
            <Dialog open={laborEdit != null} onOpenChange={(open) => { if (!open) setLaborEdit(null) }}>
                <DialogContent className={dialogClass}>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-black text-[#1f2e85]">
                            <span suppressHydrationWarning>
                                {laborEdit?.id ? t('admin.personas.editarLabor') : t('admin.personas.crearLabor')}
                            </span>
                        </DialogTitle>
                        <button onClick={() => setLaborEdit(null)} aria-label={t('common.close')} className="text-zinc-500 hover:text-[#1f2e85] p-1 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <DialogDescription className="text-zinc-500">
                        <span suppressHydrationWarning>{t('admin.personas.laborNota')}</span>
                    </DialogDescription>
                    {laborEdit && (
                        <form onSubmit={handleSaveLabor} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pl-nombre" className="text-zinc-700">{t('admin.personas.campoNombre')}</Label>
                                <Input
                                    id="pl-nombre"
                                    data-testid="persona-labor-nombre"
                                    value={laborEdit.nombre ?? ''}
                                    onChange={(e) => setLaborEdit({ ...laborEdit, nombre: e.target.value })}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-700" suppressHydrationWarning>{t('admin.personas.campoGrupo')}</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([1, 2, 3] as const).map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setLaborEdit({ ...laborEdit, grupo: g })}
                                            data-testid={`persona-labor-grupo-${g}`}
                                            className={laborEdit.grupo === g
                                                ? 'p-2 rounded-xl border-2 border-[#b8964a] bg-[#f8f3e8] font-bold text-sm text-[#1f2e85]'
                                                : 'p-2 rounded-xl border border-zinc-200 bg-white text-sm text-slate-600 hover:border-[#b8964a]/50'}
                                        >
                                            <span suppressHydrationWarning>{grupoLabel[g]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                                <Label htmlFor="pl-activo" className="text-zinc-700 text-sm">
                                    <span suppressHydrationWarning>{t('admin.personas.campoActivo')}</span>
                                </Label>
                                <Switch
                                    id="pl-activo"
                                    checked={laborEdit.activo ?? true}
                                    onCheckedChange={(checked) => setLaborEdit({ ...laborEdit, activo: checked })}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    data-testid="persona-labor-guardar"
                                    className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8"
                                >
                                    <span suppressHydrationWarning>{isSaving ? t('common.loading') : t('common.save')}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal plano */}
            <Dialog open={planoEdit != null} onOpenChange={(open) => { if (!open) setPlanoEdit(null) }}>
                <DialogContent className={dialogClass}>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-black text-[#1f2e85]">
                            <span suppressHydrationWarning>
                                {planoEdit?.id ? t('admin.personas.editarPlano') : t('admin.personas.crearPlano')}
                            </span>
                        </DialogTitle>
                        <button onClick={() => setPlanoEdit(null)} aria-label={t('common.close')} className="text-zinc-500 hover:text-[#1f2e85] p-1 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <DialogDescription className="text-zinc-500">
                        <span suppressHydrationWarning>{t('admin.personas.planoNota')}</span>
                    </DialogDescription>
                    {planoEdit && (
                        <form onSubmit={handleSavePlano} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pn-nombre" className="text-zinc-700">{t('admin.personas.campoNombre')}</Label>
                                <Input
                                    id="pn-nombre"
                                    data-testid="persona-plano-nombre"
                                    value={planoEdit.nombre ?? ''}
                                    onChange={(e) => setPlanoEdit({ ...planoEdit, nombre: e.target.value })}
                                    required
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-700" suppressHydrationWarning>{t('admin.personas.campoCapacidad')}</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['ofrendario', 'apoyo', 'ambos'] as const).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setPlanoEdit({ ...planoEdit, capacidad: c })}
                                            data-testid={`persona-plano-capacidad-${c}`}
                                            className={planoEdit.capacidad === c
                                                ? 'p-2 rounded-xl border-2 border-[#b8964a] bg-[#f8f3e8] font-bold text-sm text-[#1f2e85]'
                                                : 'p-2 rounded-xl border border-zinc-200 bg-white text-sm text-slate-600 hover:border-[#b8964a]/50'}
                                        >
                                            <span suppressHydrationWarning>{capacidadLabel[c]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                                <Label htmlFor="pn-activo" className="text-zinc-700 text-sm">
                                    <span suppressHydrationWarning>{t('admin.personas.campoActivo')}</span>
                                </Label>
                                <Switch
                                    id="pn-activo"
                                    checked={planoEdit.activo ?? true}
                                    onCheckedChange={(checked) => setPlanoEdit({ ...planoEdit, activo: checked })}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    data-testid="persona-plano-guardar"
                                    className="border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold rounded-xl px-8"
                                >
                                    <span suppressHydrationWarning>{isSaving ? t('common.loading') : t('common.save')}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
