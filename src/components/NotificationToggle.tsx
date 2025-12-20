'use client'

import { Bell } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function NotificationToggle() {
    const { isSupported, subscription, subscribeToPush, loading } = usePushNotifications()
    const { t } = useI18n()

    const isEnabled = !!subscription

    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-background/30 border border-border">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p className="font-medium">{t('profile.notifications')}</p>
                    <p className="text-xs text-muted-foreground">{t('profile.notifications.desc')}</p>
                </div>
            </div>

            {isSupported ? (
                <button
                    onClick={isEnabled ? undefined : subscribeToPush}
                    disabled={isEnabled || loading}
                    className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                        ${isEnabled ? 'bg-primary' : 'bg-muted'}
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    <span
                        className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                    />
                </button>
            ) : (
                <span className="text-xs text-muted-foreground">No soportado</span>
            )}
        </div>
    )
}
