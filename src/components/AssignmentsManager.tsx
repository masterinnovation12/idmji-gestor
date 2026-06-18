'use client'

import UserSelector from '@/components/UserSelector'
import { updateAssignment } from '@/app/dashboard/cultos/[id]/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types/database'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface AssignmentsManagerProps {
    cultoId: string
    assignments: {
        intro: Profile | null
        ensenanza: Profile | null
        finalizacion: Profile | null
    }
}

export function AssignmentsManager({ cultoId, assignments }: AssignmentsManagerProps) {
    const { t } = useI18n()
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)

    async function handleUpdate(field: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios', userId: string | null) {
        await updateAssignment(cultoId, field, userId)
        router.refresh()
    }

    if (!isEditing) {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <label className="text-sm text-muted-foreground block mb-1">{t('cultos.intro')}</label>
                    <div className="font-medium">
                        {assignments.intro ? `${assignments.intro.nombre} ${assignments.intro.apellidos}` : t('dashboard.himnario.unassigned')}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <label className="text-sm text-muted-foreground block mb-1">{t('assignments.teachingPreaching')}</label>
                    <div className="font-medium">
                        {assignments.ensenanza ? `${assignments.ensenanza.nombre} ${assignments.ensenanza.apellidos}` : t('dashboard.himnario.unassigned')}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <label className="text-sm text-muted-foreground block mb-1">{t('cultos.finalizacion')}</label>
                    <div className="font-medium">
                        {assignments.finalizacion ? `${assignments.finalizacion.nombre} ${assignments.finalizacion.apellidos}` : t('dashboard.himnario.unassigned')}
                    </div>
                </div>

                <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 transition-colors font-medium"
                >
                    {t('assignments.editTitle')}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('cultos.intro')}</label>
                <UserSelector
                    selectedUserId={assignments.intro?.id || null}
                    onSelect={(userOrId) => handleUpdate('introduccion', typeof userOrId === 'object' ? userOrId?.id || null : userOrId)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('assignments.teachingPreaching')}</label>
                <UserSelector
                    selectedUserId={assignments.ensenanza?.id || null}
                    onSelect={(userOrId) => handleUpdate('ensenanza', typeof userOrId === 'object' ? userOrId?.id || null : userOrId)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('cultos.finalizacion')}</label>
                <UserSelector
                    selectedUserId={assignments.finalizacion?.id || null}
                    onSelect={(userOrId) => handleUpdate('finalizacion', typeof userOrId === 'object' ? userOrId?.id || null : userOrId)}
                />
            </div>

            <button
                onClick={() => setIsEditing(false)}
                className="w-full py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
            >
                {t('assignments.finishEditing')}
            </button>
        </div>
    )
}
