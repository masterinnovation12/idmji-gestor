'use client'

import { isSonidoUser } from '@/lib/utils/isSonido'
import CultoNavigator from '@/components/CultoNavigator'
import { CultoCardRenderer } from '@/components/dashboard/cultos/CultoCardRenderer'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { MyAssignmentsPanel } from '@/components/dashboard/MyAssignmentsPanel'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'
import { Culto, Profile } from '@/types/database'

interface DashboardClientProps {
    user: Profile & { id: string }
    culto: (Culto & { lecturas?: any[] }) | null
    esHoy: boolean
    initialAssignments: Culto[]
    initialDate: string
}

export default function DashboardClient({ 
    user, 
    culto, 
    esHoy, 
    initialAssignments, 
    initialDate 
}: DashboardClientProps) {
    const { t } = useI18n()

    return (
        <div className="space-y-4 md:space-y-8 animate-fade-in-up pb-16 md:pb-20">
            {/* 1. Header Premium */}
            <DashboardHeader user={user} />

            {/* 2. Main Action Area: Next/Today Culto & Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Culto Card (Takes 2 cols on Desktop; full width for SONIDO) */}
                <div className={`${isSonidoUser(user) ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
                    <CultoNavigator
                        initialCulto={culto}
                        initialDate={initialDate}
                        esHoy={esHoy}
                    >
                        {(navCulto, isNavLoading, navEsHoy) => (
                            <>
                                {isNavLoading ? (
                                    <div className="relative">
                                        <div className="bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] h-[500px] animate-pulse w-full"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-6 py-3 rounded-full shadow-xl">
                                                <p className="text-sm font-black text-slate-500 animate-pulse uppercase tracking-widest">{t('dashboard.navigator.loading' as any)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : navCulto ? (
                                    /* Renderizado Delegado al Componente Renderer */
                                    <CultoCardRenderer culto={navCulto} esHoy={navEsHoy} currentUserId={user.id} />
                                ) : (
                                    <div className="glass rounded-[2.5rem] p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400 font-bold">{t('dashboard.navigator.noService' as any)}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </CultoNavigator>
                </div>

                {/* Right: My Assignments (Hidden for SONIDO role) */}
                {!isSonidoUser(user) && (
                    <div className="lg:col-span-1">
                        <MyAssignmentsPanel user={user} initialAssignments={initialAssignments} />
                    </div>
                )}
            </div>

            {/* 3. Quick Actions Grid */}
            <QuickActionsGrid />
        </div>
    )
}
