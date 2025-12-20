'use client'

import { BellRing } from 'lucide-react'
import { useState } from 'react'
import { sendTestNotification } from '@/app/actions/notifications'
import { toast } from 'sonner'

export default function TestNotificationButton() {
    const [loading, setLoading] = useState(false)

    const handleTest = async () => {
        setLoading(true)
        try {
            const res = await sendTestNotification()
            if (res.success) {
                toast.success('Notificación enviada correctamente')
            } else {
                toast.error(res.error || 'Error al enviar notificación')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error al enviar notificación')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleTest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
        >
            <BellRing className="w-4 h-4" />
            {loading ? 'Enviando...' : 'Enviar Prueba Push'}
        </button>
    )
}
