'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { getSedeSwitcherData, setActiveSede } from '@/app/dashboard/admin/sedes/actions'
import type { TranslationKey } from '@/lib/i18n/types'

interface SedeSwitcherProps {
    t: (key: TranslationKey) => string
    collapsed?: boolean
    /** En móvil cierra el drawer tras confirmar el cambio de sede. */
    onSedeChanged?: () => void
}

interface SwitcherSede {
    id: string
    nombre: string
    slug: string
    activo: boolean
}

/**
 * Selector de sede activa. Solo visible para ADMIN con más de una sede:
 * el resto de usuarios trabaja siempre sobre su propia sede (RLS).
 */
export function SedeSwitcher({ t, collapsed = false, onSedeChanged }: Readonly<SedeSwitcherProps>) {
    const router = useRouter()
    const [sedes, setSedes] = useState<SwitcherSede[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        let isMounted = true
        getSedeSwitcherData().then((res) => {
            if (!isMounted || !res.success || !res.data) return
            setSedes(res.data.sedes)
            setActiveId(res.data.activeSedeId)
        })
        return () => { isMounted = false }
    }, [])

    // Solo ADMIN (sedes > 0) y con más de una sede tiene sentido cambiar
    if (sedes.length <= 1) return null

    const active = sedes.find(s => s.id === activeId)

    const handleSelect = (sede: SwitcherSede) => {
        setIsOpen(false)
        if (sede.id === activeId) return
        startTransition(async () => {
            const res = await setActiveSede(sede.id)
            if (res.success) {
                setActiveId(sede.id)
                toast.success(`${t('sede.cambiada')}: ${sede.nombre}`)
                // Cerrar el drawer móvil y llevar al dashboard con los datos
                // de la sede recién elegida (el push + refresh remonta las
                // páginas server, que llevan key por sede).
                onSedeChanged?.()
                router.push('/dashboard')
                router.refresh()
            } else {
                toast.error(res.error || t('common.error'))
            }
        })
    }

    if (collapsed) {
        return (
            <div className="flex justify-center" data-testid="sede-switcher-collapsed">
                <div
                    className="w-11 h-11 rounded-2xl bg-white/10 border border-[rgba(184,150,74,0.3)] flex items-center justify-center text-[#e8d9a8]"
                    title={active?.nombre}
                >
                    <Building2 size={18} />
                </div>
            </div>
        )
    }

    return (
        <div data-testid="sede-switcher">
            <button
                onClick={() => setIsOpen(o => !o)}
                disabled={isPending}
                aria-label={t('sede.selector')}
                data-testid="sede-switcher-boton"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-[rgba(184,150,74,0.3)] transition-all text-white disabled:opacity-60"
            >
                <Building2 size={16} className="text-[#e8d9a8] shrink-0" />
                <span className="flex-1 text-left text-xs font-bold truncate" suppressHydrationWarning>
                    {active?.nombre ?? t('sede.selector')}
                </span>
                <ChevronDown size={14} className={`shrink-0 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Lista EN FLUJO (no absolute): dentro del drawer móvil los
                overlays absolutos quedaban recortados/tapados por el propio
                menú; al expandirse en flujo siempre es visible y clicable. */}
            {isOpen && (
                <div
                    data-testid="sede-switcher-lista"
                    className="mt-2 rounded-2xl bg-[#141f56] border border-[rgba(184,150,74,0.4)] shadow-2xl overflow-y-auto max-h-56 no-scrollbar"
                >
                    {sedes.map(sede => (
                        <button
                            key={sede.id}
                            onClick={() => handleSelect(sede)}
                            data-testid={`sede-switcher-opcion-${sede.slug}`}
                            className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
                                sede.id === activeId ? 'bg-white/15 text-[#e8d9a8]' : 'text-white/80 hover:bg-white/10'
                            } ${!sede.activo ? 'opacity-50' : ''}`}
                        >
                            <span className="flex-1 truncate">{sede.nombre}</span>
                            {sede.id === activeId && <Check size={14} className="shrink-0 text-[#e8d9a8]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
