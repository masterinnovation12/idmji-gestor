'use client'

import UserSelector from '@/components/UserSelector'
import { updateAssignment } from '@/app/dashboard/cultos/[id]/actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AssignmentUser {
    id: string
    nombre: string
    apellidos: string
}

interface AssignmentsManagerProps {
    cultoId: string
    assignments: {
        intro: AssignmentUser | null
        ensenanza: AssignmentUser | null
        finalizacion: AssignmentUser | null
    }
}

export function AssignmentsManager({ cultoId, assignments }: AssignmentsManagerProps) {
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
                    <label className="text-sm text-muted-foreground block mb-1">Introducción</label>
                    <div className="font-medium">
                        {assignments.intro ? `${assignments.intro.nombre} ${assignments.intro.apellidos}` : 'Sin asignar'}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <label className="text-sm text-muted-foreground block mb-1">Enseñanza / Predicación</label>
                    <div className="font-medium">
                        {assignments.ensenanza ? `${assignments.ensenanza.nombre} ${assignments.ensenanza.apellidos}` : 'Sin asignar'}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                    <label className="text-sm text-muted-foreground block mb-1">Finalización</label>
                    <div className="font-medium">
                        {assignments.finalizacion ? `${assignments.finalizacion.nombre} ${assignments.finalizacion.apellidos}` : 'Sin asignar'}
                    </div>
                </div>

                <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 transition-colors font-medium"
                >
                    Editar Asignaciones
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
                <label className="text-sm font-medium">Introducción</label>
                <UserSelector
                    selectedUserId={assignments.intro?.id || null}
                    onSelect={(userId) => handleUpdate('introduccion', userId)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Enseñanza / Predicación</label>
                <UserSelector
                    selectedUserId={assignments.ensenanza?.id || null}
                    onSelect={(userId) => handleUpdate('ensenanza', userId)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Finalización</label>
                <UserSelector
                    selectedUserId={assignments.finalizacion?.id || null}
                    onSelect={(userId) => handleUpdate('finalizacion', userId)}
                />
            </div>

            <button
                onClick={() => setIsEditing(false)}
                className="w-full py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
            >
                Terminar Edición
            </button>
        </div>
    )
}
