'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Check, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { formatServicioFechaLabel } from './ofrendaLocale'
import { OfrendaLiquidShell, diaTipoToAccent, useOfrendaMobileOrTablet } from './OfrendaLiquidShell'
import type { OfrMiembro, OfrServicio } from './actions'
import { puedeMiembroEnTurno } from './ofrendaMemberAvailability'

export interface PersonaPickerContext {
    servicio: OfrServicio
    rolLabel: string
    turnoLabel?: string | null
    headerColorClass: string
}

interface PersonaPickerProps {
    open: boolean
    onClose: () => void
    miembros: OfrMiembro[]
    selectedId: string | null
    onSelect: (id: string | null) => void
    context: PersonaPickerContext
    anchorRect?: DOMRect | null
}

function MemberList({
    members,
    selectedId,
    onSelect,
    onClose,
    t,
}: Readonly<{
    members: Array<OfrMiembro & { elegibleEnTurno: boolean }>
    selectedId: string | null
    onSelect: (id: string | null) => void
    onClose: () => void
    t: (key: string) => string
}>) {
    const rowBase =
        'ofrenda-liquid-member w-[calc(100%-1.5rem)] flex items-center gap-3 px-4 py-3.5 text-left text-sm transition-all touch-manipulation min-h-[52px]'

    const unassignSelected = selectedId === null

    return (
        <div className="px-0 py-3" data-testid="ofrenda-picker-member-list">
            <button
                type="button"
                onClick={() => { onSelect(null); onClose() }}
                className={`${rowBase} ${unassignSelected ? 'ofrenda-liquid-member--selected font-bold' : ''}`}
            >
                <span className="ofrenda-liquid-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <User className="w-4 h-4 opacity-70" />
                </span>
                <span className="flex-1 font-medium">{t('ofrenda.picker.unassign')}</span>
                {unassignSelected && <Check className="w-4 h-4 shrink-0" aria-hidden />}
            </button>
            {members.map(m => {
                const isSel = m.id === selectedId
                const outOfTurn = !m.elegibleEnTurno
                return (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => { onSelect(m.id); onClose() }}
                        className={`${rowBase} ${isSel ? 'ofrenda-liquid-member--selected font-bold' : ''} ${outOfTurn ? 'opacity-90' : ''}`}
                        data-testid={`ofrenda-picker-member-${m.id}`}
                        data-elegible-turno={m.elegibleEnTurno ? 'true' : 'false'}
                    >
                        <span className="ofrenda-liquid-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs">
                            {m.nombre.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block truncate">{m.nombre}</span>
                            {outOfTurn && (
                                <span
                                    className="mt-0.5 block text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                                    data-testid={`ofrenda-picker-out-of-turn-${m.id}`}
                                >
                                    {t('ofrenda.picker.outOfTurn')}
                                </span>
                            )}
                        </span>
                        {isSel && <Check className="w-4 h-4 shrink-0" aria-hidden />}
                    </button>
                )
            })}
            {members.length === 0 && (
                <p className="px-4 py-8 text-sm text-center text-slate-500">—</p>
            )}
        </div>
    )
}

export function PersonaPicker({
    open,
    onClose,
    miembros,
    selectedId,
    onSelect,
    context,
}: Readonly<PersonaPickerProps>) {
    const { t, language } = useI18n()
    const isMobileOrTablet = useOfrendaMobileOrTablet()
    const [search, setSearch] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)

    const diaTipo = context.servicio.dia_tipo

    const sortedMembers = useMemo(() => {
        const q = search.trim().toLowerCase()
        const withFlag = miembros
            .filter(m => m.nombre.toLowerCase().includes(q))
            .map(m => ({
                ...m,
                elegibleEnTurno: puedeMiembroEnTurno(m, diaTipo),
            }))
        return withFlag.sort((a, b) => {
            const orderA = a.elegibleEnTurno ? 0 : 1
            const orderB = b.elegibleEnTurno ? 0 : 1
            if (orderA !== orderB) return orderA - orderB
            return a.nombre.localeCompare(b.nombre, language)
        })
    }, [miembros, search, diaTipo, language])

    const selectedName = miembros.find(m => m.id === selectedId)?.nombre ?? t('ofrenda.picker.unassign')

    useEffect(() => {
        if (!open) {
            setSearch('')
            return
        }
        const tId = setTimeout(() => searchRef.current?.focus(), isMobileOrTablet ? 220 : 120)
        return () => clearTimeout(tId)
    }, [open, isMobileOrTablet])

    const fechaLabel = formatServicioFechaLabel(
        language,
        context.servicio.fecha,
        context.servicio.dia_tipo,
        t
    )

    const headline = context.turnoLabel
        ? `${context.rolLabel} · ${context.turnoLabel}`
        : context.rolLabel

    if (!open) return null

    return (
        <OfrendaLiquidShell
            open={open}
            onClose={onClose}
            ariaLabel={t('ofrenda.picker.title')}
            title={t('ofrenda.picker.title')}
            headline={headline}
            subtitle={fechaLabel}
            currentLabel={t('ofrenda.picker.current')}
            currentValue={selectedName}
            currentTestId="ofrenda-picker-current-name"
            accent={diaTipoToAccent(context.servicio.dia_tipo)}
            testIdPrefix="ofrenda-picker"
            unstyledBody
            closeLabel={t('common.close')}
        >
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="ofrenda-liquid-picker__body shrink-0 border-b border-slate-100 px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={searchRef}
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('ofrenda.picker.search')}
                            className="ofrenda-liquid-search w-full rounded-2xl py-3.5 pl-10 pr-4 text-sm font-medium"
                            aria-label={t('ofrenda.picker.search')}
                            data-testid="ofrenda-picker-search"
                        />
                    </div>
                </div>
                <div className="ofrenda-liquid-picker__body min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80">
                    <MemberList
                        members={sortedMembers}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        onClose={onClose}
                        t={t}
                    />
                </div>
            </div>
        </OfrendaLiquidShell>
    )
}
