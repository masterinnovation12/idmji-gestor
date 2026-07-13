'use client'

import { KeyRound, ShieldCheck } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n/I18nProvider'
import {
    PERMISSION_DEFS,
    PERMISSION_GROUP_LABELS,
    roleDefault,
    type PermisosOverrides,
    type PermissionGroup,
    type PermissionKey,
} from '@/lib/auth/permissions'

interface PermisosEditorProps {
    rol: string
    value: PermisosOverrides
    onChange: (next: PermisosOverrides) => void
}

/**
 * Matriz de permisos granulares del usuario. Muestra el permiso EFECTIVO
 * (override si existe, si no el default del rol) y guarda solo los overrides
 * que difieren del default — así cambiar el rol no arrastra ajustes obsoletos.
 */
export default function PermisosEditor({ rol, value, onChange }: Readonly<PermisosEditorProps>) {
    const { t } = useI18n()
    const isAdmin = rol === 'ADMIN'
    const groups: PermissionGroup[] = ['cultos', 'labores', 'contenido']

    const effective = (key: PermissionKey): boolean => {
        if (isAdmin) return true
        const override = value[key]
        return typeof override === 'boolean' ? override : roleDefault(rol)
    }

    const toggle = (key: PermissionKey, checked: boolean) => {
        const next: PermisosOverrides = { ...value }
        if (checked === roleDefault(rol)) {
            delete next[key]
        } else {
            next[key] = checked
        }
        onChange(next)
    }

    return (
        <div className="space-y-4" data-testid="permisos-editor">
            <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-100" />
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span suppressHydrationWarning>{t('admin.permisos.titulo')}</span>
                </span>
                <div className="h-px flex-1 bg-zinc-100" />
            </div>

            {isAdmin ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 leading-snug" suppressHydrationWarning>
                        {t('admin.permisos.adminTodo')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map(group => {
                        const defs = PERMISSION_DEFS.filter(d => d.group === group)
                        if (defs.length === 0) return null
                        return (
                            <div key={group} className="rounded-2xl border border-zinc-200 overflow-hidden">
                                <p className="px-4 py-2 bg-zinc-50 text-[11px] font-black uppercase tracking-widest text-zinc-500" suppressHydrationWarning>
                                    {t(PERMISSION_GROUP_LABELS[group])}
                                </p>
                                <div className="divide-y divide-zinc-100">
                                    {defs.map(def => {
                                        const checked = effective(def.key)
                                        const hasOverride = typeof value[def.key] === 'boolean'
                                        return (
                                            <div
                                                key={def.key}
                                                className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${checked ? 'bg-white' : 'bg-zinc-50/60'}`}
                                            >
                                                <div className="min-w-0">
                                                    <Label
                                                        htmlFor={`perm-${def.key}`}
                                                        className={`cursor-pointer text-sm ${checked ? 'text-zinc-800 font-semibold' : 'text-zinc-500'}`}
                                                    >
                                                        <span suppressHydrationWarning>{t(def.labelKey)}</span>
                                                        {hasOverride && (
                                                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#f8f3e8] text-[#b68f2f] border border-[rgba(184,150,74,0.35)] align-middle">
                                                                <span suppressHydrationWarning>{t('admin.permisos.personalizado')}</span>
                                                            </span>
                                                        )}
                                                    </Label>
                                                    <p className="text-xs text-zinc-400 leading-snug" suppressHydrationWarning>
                                                        {t(def.descriptionKey)}
                                                    </p>
                                                </div>
                                                <Switch
                                                    id={`perm-${def.key}`}
                                                    data-testid={`perm-switch-${def.key}`}
                                                    checked={checked}
                                                    onCheckedChange={(v) => toggle(def.key, v)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
