/**
 * CultoDetailClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para ver y gestionar los detalles de un culto específico.
 * Permite asignar hermanos a diferentes labores y gestionar lecturas/música.
 * 
 * Características:
 * - Asignación de responsables con búsqueda en tiempo real (Filtro Púlpito)
 * - Gestión de lecturas bíblicas con detección de repeticiones
 * - Planificación de himnos y coros
 * - Diseño Glassmorphism premium responsivo
 * - Multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Calendar, Clock, User, BookOpen, Music, BookMarked, AlertCircle, CheckCircle, Sparkles, AlertTriangle, Info, ChevronDown, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import UserSelector from '@/components/UserSelector'
import HimnoCoroSelector from '@/components/HimnoCoroSelector'
import BibleReadingManager from '@/components/BibleReadingManager'
import { saveCultoDraft } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { LIMITES } from '@/lib/constants'
import { TEMAS_ALABANZA_KEYS } from '@/lib/constants/temasAlabanza'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Culto, Profile } from '@/types/database'
import NextImage from 'next/image'
import { computeTemaDropdownStyle, shouldCloseTemaDropdown } from './temaDropdownPosition'
import type { TranslationKey } from '@/lib/i18n/types'
import SaveChangesBar from './SaveChangesBar'
import { reconcileOptimisticUser, resolveDisplayUser } from './assignmentDisplayUser'

interface CultoDetailClientProps {
    culto: Culto
    userId: string
    /** Si es true (rol SONIDO), puede ver asignaciones pero no editarlas. Sí puede añadir lecturas e himnos/coros. */
    readOnlyAssignments?: boolean
}

/**
 * Componente interno para tarjetas de asignación reutilizables con diseño premium
 */
interface AssignmentSectionProps {
    label: string,
    icon: React.ReactNode,
    selectedUserId: string | null,
    usuarioActual: Partial<Profile> | null | undefined,
    onSelect: (id: string | null, confirmed?: boolean) => Promise<void> | void,
    disabled: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: any) => string,
    cultoId: string,
    cultoDate?: string,
    assignmentType?: string,
    isFestivo?: boolean,
    onVerInstrucciones?: () => void,
    /** Solo lectura: muestra el asignado pero no permite editar (rol SONIDO) */
    readOnly?: boolean,
    readingMode?: 'commit' | 'draft',
    onReadingDraftChange?: (lecturas: import('@/types/database').LecturaBiblica[]) => void,
}

function AssignmentSection({
    label,
    icon,
    selectedUserId,
    usuarioActual,
    onSelect,
    disabled,
    t,
    cultoId,
    cultoDate,
    assignmentType,
    isFestivo,
    onVerInstrucciones,
    readOnly = false,
    readingMode = 'commit',
    onReadingDraftChange,
}: AssignmentSectionProps) {
    // En modo readOnly nunca se edita; si hay usuario asignado tampoco se empieza editando
    const [isEditing, setIsEditing] = useState(readOnly ? false : !selectedUserId)
    const [isSaving, setIsSaving] = useState(false)
    const [optimisticId, setOptimisticId] = useState(selectedUserId)
    const [optimisticUser, setOptimisticUser] = useState<Partial<Profile> | null>(usuarioActual || null)

    // Sincronizar estado cuando llega el dato real del servidor
    useEffect(() => {
        setOptimisticId(selectedUserId)
        setOptimisticUser((prev) => reconcileOptimisticUser(selectedUserId, prev, usuarioActual))
    }, [selectedUserId, usuarioActual])

    // Modificamos el UserSelector para que devuelva el objeto usuario completo en el onSelect
    // (Necesitaremos actualizar la firma en UserSelector también si no lo hace ya, 
    // pero UserSelector.tsx ya pasaba el objeto 'user' en su handleSelect interno, 
    // aunque la prop onSelect del padre solo recibía ID. Ajustaremos el callback aquí 
    // para recibir el perfil si es posible, o buscaremos otra forma).

    // UserSelector prop onSelect definition in props was: (id, confirmed) => ...
    // To support optimistic UI properly, we need the Profile object.
    // However, changing the prop signature of AssignmentSection might break usage in the grid parent.
    // BUT UserSelector actually has the Profile object when it calls onSelect.

    // TRUCO: El UserSelector tiene el objeto Profile. 
    // Vamos a interceptar el onSelect del UserSelector para capturar el perfil.

    // Necesitamos que el onSelect de AssignmentSection acepte el perfil OPCIONALMENTE?
    // O mejor, manejamos el estado optimista aquí dentro.

    // Vamos a definir un handler local enriquecido para el UserSelector
    const handleUserSelectorSelect = async (profileOrId: Profile | string | null, confirmed: boolean = true) => {
        setIsSaving(true)

        // Determinar ID y Perfil para optimismo
        let newId: string | null = null
        let newProfile: Partial<Profile> | null = null

        if (profileOrId && typeof profileOrId === 'object') {
            newId = profileOrId.id
            newProfile = profileOrId
        } else if (typeof profileOrId === 'string') {
            newId = profileOrId
            // Si solo recibimos ID (caso raro desde UserSelector moderno), no podemos pintar avatar optimista perfecto,
            // pero mantenemos el comportamiento anterior.
        } else {
            // Null
            newId = null
            newProfile = null
        }

        setOptimisticId(newId)
        setOptimisticUser(newProfile)

        try {
            if (newId && confirmed === false) {
                await onSelect(newId, false)
            } else {
                await onSelect(newId, true)
                if (newId) setIsEditing(false)
            }
        } catch (error) {
            console.error("Assignment failed", error)
            setOptimisticId(selectedUserId)
            setOptimisticUser(usuarioActual || null)
        } finally {
            setIsSaving(false)
        }
    }

    // Renderizado usa los valores optimistas
    const displayUser = resolveDisplayUser(optimisticId, optimisticUser, usuarioActual)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`h-full w-full min-w-0 ${isEditing ? 'relative z-100' : 'relative z-10'}`}
        >
            <Card className={`h-full w-full min-w-0 border-t-4 border-primary/40 glass group hover:border-primary transition-all duration-500 shadow-xl relative overflow-visible ${isEditing ? 'ring-4 ring-primary/30' : ''}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-4 shrink-0 gap-2 border-b border-primary/5">
                    <CardTitle icon={icon} className="text-primary font-black uppercase tracking-widest text-[10px] md:text-[11px] leading-tight">
                        {label}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                        {onVerInstrucciones && (
                            <button
                                type="button"
                                data-testid="ver-instrucciones-btn"
                                onClick={onVerInstrucciones}
                                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3 py-2.5 sm:px-2 sm:py-1 text-[9px] font-black uppercase tracking-widest text-primary/80 hover:text-primary rounded-xl hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5 touch-manipulation"
                                aria-label={t('culto.instrucciones.ver')}
                            >
                                <Info className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                                <span className="hidden sm:inline">{t('culto.instrucciones.ver')}</span>
                            </button>
                        )}
                        {optimisticId && !isEditing && !readOnly && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl hover:bg-primary/15 hover:text-primary dark:hover:bg-primary dark:hover:text-white transition-all shadow-sm"
                            >
                                {t('culto.detail.modify' as TranslationKey)}
                            </button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6 flex-1 flex flex-col overflow-visible">
                    <div className="flex-1 flex flex-col overflow-visible relative">
                        {/* Overlay de Carga */}
                        {isSaving && (
                            <div className="absolute inset-0 z-[120] bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                                <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin shadow-lg" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                                    {t('culto.detail.saving' as TranslationKey)}
                                </span>
                            </div>
                        )}

                        {/* Contenido (Selector o Tarjeta Vertical) — oculto en readOnly */}
                        {!readOnly && (
                            <div className="shrink-0 relative z-110">
                                <UserSelector
                                    selectedUserId={optimisticId}
                                    // @ts-ignore - Modificaremos UserSelector para pasar el objeto completo
                                    onSelect={handleUserSelectorSelect}
                                    disabled={disabled || isSaving}
                                    isEditing={isEditing}
                                    onEditChange={(val) => {
                                        if (!isSaving) setIsEditing(val)
                                    }}
                                    cultoDate={cultoDate}
                                    assignmentType={assignmentType}
                                    isFestivo={isFestivo}
                                />
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {displayUser && !isEditing ? (
                                <motion.div
                                    key={`assigned-${displayUser.id}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center text-center mt-2 relative z-10"
                                >
                                    {/* Avatar Vertical Grande */}
                                    <div className="relative group/avatar mb-4">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full transform group-hover/avatar:scale-125 transition-transform duration-500" />
                                        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-[2rem] border-4 border-white dark:border-slate-800 shadow-2xl relative overflow-hidden bg-slate-100 dark:bg-slate-800 transition-transform hover:scale-105 duration-300">
                                            {displayUser.avatar_url ? (
                                                <NextImage
                                                    src={displayUser.avatar_url}
                                                    alt={displayUser.nombre || ''}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                                                    {displayUser.nombre?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 whitespace-nowrap z-20">
                                            <CheckCircle className="w-3 h-3" />
                                            {t('culto.detail.assigned' as TranslationKey)}
                                        </div>
                                    </div>

                                    {/* Info Usuario */}
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight mb-1">
                                        {displayUser.nombre}
                                    </h3>
                                    <p className="text-sm font-bold text-primary uppercase tracking-wider mb-6">
                                        {displayUser.apellidos?.split(' ')[0]}
                                    </p>

                                    {/* Bloque de Lectura Bíblica Integrado (Con diseño mejorado) */}
                                    {label === t('culto.introduccion') && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="w-full text-left"
                                        >
                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-4" />
                                            <BibleReadingManager
                                                cultoId={cultoId}
                                                userId={displayUser.id || ''}
                                                config={{
                                                    tiene_lectura_introduccion: true,
                                                    tiene_lectura_finalizacion: false
                                                }}
                                                mode={readingMode}
                                                onDraftChange={onReadingDraftChange}
                                            />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : (!isEditing || readOnly) && !displayUser ? (
                                <motion.div
                                    key="unassigned"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 opacity-50 mt-4"
                                >
                                    <User className="w-8 h-8 text-slate-400" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                        {t('culto.detail.pendingAssign' as TranslationKey)}
                                    </p>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default function CultoDetailClient({ culto, readOnlyAssignments = false }: CultoDetailClientProps) {
    const router = useRouter()
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [isUpdating, setIsUpdating] = useState(false)
    const [pendingAssignment, setPendingAssignment] = useState<{ type: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios', userId: string } | null>(null)
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)
    const [instruccionesModalRol, setInstruccionesModalRol] = useState<'introduccion' | 'ensenanza' | 'testimonios' | 'finalizacion' | null>(null)
    const [temaDropdownOpen, setTemaDropdownOpen] = useState(false)
    const [temaTriggerRect, setTemaTriggerRect] = useState<DOMRect | null>(null)
    const [temaConfirmState, setTemaConfirmState] = useState<{ tipo: 'assign' | 'modify' | 'delete'; temaKey: string | null } | null>(null)
    const [temaMounted, setTemaMounted] = useState(false)
    const temaTriggerRef = useRef<HTMLButtonElement>(null)
    const [draftAssignments, setDraftAssignments] = useState({
        introduccion: culto.id_usuario_intro ?? null,
        ensenanza: culto.id_usuario_ensenanza ?? null,
        testimonios: culto.id_usuario_testimonios ?? null,
        finalizacion: culto.id_usuario_finalizacion ?? null,
    })
    const [draftObservaciones, setDraftObservaciones] = useState<string>((culto.meta_data as any)?.observaciones || '')
    const [draftTema, setDraftTema] = useState<string | null>((culto.meta_data as any)?.tema_introduccion_alabanza ?? null)
    const [draftProtocolo, setDraftProtocolo] = useState<{ oracion_inicio: boolean; congregacion_pie: boolean } | null>(
        (culto.meta_data as any)?.protocolo ?? null
    )
    const [draftProtocoloDefinido, setDraftProtocoloDefinido] = useState<boolean>((culto.meta_data as any)?.protocolo_definido ?? false)
    const [draftInicioAnticipado, setDraftInicioAnticipado] = useState<{ activo: boolean; minutos: number; observaciones?: string } | null>(
        (culto.meta_data as any)?.inicio_anticipado ?? null
    )
    const [draftInicioAnticipadoDefinido, setDraftInicioAnticipadoDefinido] = useState<boolean>((culto.meta_data as any)?.inicio_anticipado_definido ?? false)
    const [draftFestivo, setDraftFestivo] = useState<boolean>(!!culto.es_laborable_festivo)
    const [draftHoraInicio, setDraftHoraInicio] = useState<string>(culto.hora_inicio)
    const [isDirty, setIsDirty] = useState(false)
    const [draftLecturas, setDraftLecturas] = useState<import('@/types/database').LecturaBiblica[]>([])
    const [draftLecturasChanged, setDraftLecturasChanged] = useState(false)
    const [draftHimnosCoros, setDraftHimnosCoros] = useState<import('@/types/database').PlanHimnoCoro[]>(culto.plan_himnos_coros || [])
    const [draftHimnosChanged, setDraftHimnosChanged] = useState(false)
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
    const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null)
    const initialRef = useRef({
        assignments: {
            introduccion: culto.id_usuario_intro ?? null,
            ensenanza: culto.id_usuario_ensenanza ?? null,
            testimonios: culto.id_usuario_testimonios ?? null,
            finalizacion: culto.id_usuario_finalizacion ?? null,
        },
        observaciones: (culto.meta_data as any)?.observaciones || '',
        tema: (culto.meta_data as any)?.tema_introduccion_alabanza ?? null,
        protocolo: (culto.meta_data as any)?.protocolo ?? null,
        protocoloDefinido: (culto.meta_data as any)?.protocolo_definido ?? false,
        inicioAnticipado: (culto.meta_data as any)?.inicio_anticipado ?? null,
        inicioAnticipadoDefinido: (culto.meta_data as any)?.inicio_anticipado_definido ?? false,
        festivo: !!culto.es_laborable_festivo,
        hora: culto.hora_inicio,
    })
    const normalizePlan = (items: import('@/types/database').PlanHimnoCoro[] = []) => items.map((h, index) => ({
        tipo: h.tipo,
        item_id: h.item_id ?? (h.tipo === 'himno' ? h.himno?.id : h.coro?.id) ?? 0,
        orden: Number(h.orden ?? index + 1),
    }))
    const initialPlanSignatureRef = useRef(JSON.stringify(normalizePlan(culto.plan_himnos_coros || [])))

    useEffect(() => {
        setTemaMounted(true)
    }, [])

    useEffect(() => {
        const handler = (event: BeforeUnloadEvent) => {
            if (!isDirty) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty])

    useEffect(() => {
        const clickHandler = (event: MouseEvent) => {
            if (!isDirty) return
            const target = event.target as HTMLElement | null
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('#')) return
            event.preventDefault()
            event.stopPropagation()
            setPendingNavigationHref(href)
            setLeaveConfirmOpen(true)
        }
        document.addEventListener('click', clickHandler, true)
        return () => document.removeEventListener('click', clickHandler, true)
    }, [isDirty])

    useEffect(() => {
        if (!temaDropdownOpen) return

        const syncDropdownPosition = () => {
            const trigger = temaTriggerRef.current
            if (!trigger) {
                setTemaDropdownOpen(false)
                return
            }
            const rect = trigger.getBoundingClientRect()
            if (shouldCloseTemaDropdown(rect, window.innerHeight)) {
                setTemaDropdownOpen(false)
                return
            }
            setTemaTriggerRect(rect)
        }

        syncDropdownPosition()
        window.addEventListener('scroll', syncDropdownPosition, { passive: true, capture: true })
        window.addEventListener('resize', syncDropdownPosition)
        return () => {
            window.removeEventListener('scroll', syncDropdownPosition, true)
            window.removeEventListener('resize', syncDropdownPosition)
        }
    }, [temaDropdownOpen])

    const handleToggleFestivo = async () => {
        const [h, m] = draftHoraInicio.split(':').map(Number)
        const newH = draftFestivo ? (h + 1) % 24 : (h - 1 + 24) % 24
        const newHora = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        setDraftFestivo((v) => !v)
        setDraftHoraInicio(newHora)
        setIsDirty(true)
        toast.success(t('culto.detail.toast.pendingReminder' as TranslationKey), {
            icon: <Sparkles className="w-5 h-5 text-primary" />
        })
    }

    const handleConfirmAssignment = async () => {
        if (!pendingAssignment) return
        setIsConflictDialogOpen(false)
        await handleAssignment(pendingAssignment.type, pendingAssignment.userId, true)
        setPendingAssignment(null)
    }

    const handleAssignment = async (
        tipo: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios',
        selectedUserId: string | null,
        confirmed: boolean = true
    ) => {
        if (selectedUserId && !confirmed) {
            setPendingAssignment({ type: tipo, userId: selectedUserId })
            setIsConflictDialogOpen(true)
            return
        }

        setDraftAssignments((prev) => ({ ...prev, [tipo]: selectedUserId }))
        setIsDirty(true)
        toast.success(t('culto.detail.toast.pendingReminder' as TranslationKey), {
            icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
        })
    }

    const handleSaveDraft = async () => {
        setIsUpdating(true)
        try {
            const result = await saveCultoDraft({
                cultoId: culto.id,
                assignments: draftAssignments,
                observaciones: draftObservaciones,
                temaIntroduccionAlabanza: draftTema,
                protocolo: draftProtocolo,
                protocoloDefinido: draftProtocoloDefinido,
                inicioAnticipado: draftInicioAnticipado,
                inicioAnticipadoDefinido: draftInicioAnticipadoDefinido,
                esLaborableFestivo: draftFestivo,
                horaInicio: draftHoraInicio,
                himnosCoros: draftHimnosChanged
                    ? draftHimnosCoros.map((item, index) => ({
                        tipo: item.tipo,
                        item_id: item.item_id ?? (item.tipo === 'himno' ? item.himno?.id : item.coro?.id) ?? 0,
                        orden: index + 1,
                    }))
                    : undefined,
                lecturas: draftLecturasChanged
                    ? draftLecturas.map((l) => ({
                        tipo_lectura: l.tipo_lectura as 'introduccion' | 'finalizacion',
                        libro: l.libro,
                        capitulo_inicio: l.capitulo_inicio,
                        versiculo_inicio: l.versiculo_inicio,
                        capitulo_fin: l.capitulo_fin,
                        versiculo_fin: l.versiculo_fin,
                        id_usuario_lector: l.id_usuario_lector,
                        es_repetida: l.es_repetida ?? false,
                        lectura_original_id: l.lectura_original_id ?? null,
                    }))
                    : undefined,
            })
            if (!result.success) {
                toast.error(result.error || t('culto.detail.toast.saveFailedGeneric' as TranslationKey))
                return
            }
            initialRef.current = {
                assignments: { ...draftAssignments },
                observaciones: draftObservaciones,
                tema: draftTema,
                protocolo: draftProtocolo,
                protocoloDefinido: draftProtocoloDefinido,
                inicioAnticipado: draftInicioAnticipado,
                inicioAnticipadoDefinido: draftInicioAnticipadoDefinido,
                festivo: draftFestivo,
                hora: draftHoraInicio,
            }
            initialPlanSignatureRef.current = JSON.stringify(normalizePlan(draftHimnosCoros))
            setIsDirty(false)
            setDraftLecturasChanged(false)
            setDraftHimnosChanged(false)
            toast.success(t('culto.detail.toast.saved' as TranslationKey))
            if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
            } else {
                router.push('/dashboard')
            }
        } catch {
            toast.error(t('culto.detail.toast.saveError' as TranslationKey))
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDiscardDraft = () => {
        const initial = initialRef.current
        setDraftAssignments(initial.assignments)
        setDraftObservaciones(initial.observaciones)
        setDraftTema(initial.tema)
        setDraftProtocolo(initial.protocolo)
        setDraftProtocoloDefinido(initial.protocoloDefinido)
        setDraftInicioAnticipado(initial.inicioAnticipado)
        setDraftInicioAnticipadoDefinido(initial.inicioAnticipadoDefinido)
        setDraftFestivo(initial.festivo)
        setDraftHoraInicio(initial.hora)
        setDraftLecturas([])
        setDraftLecturasChanged(false)
        setDraftHimnosChanged(false)
        setDraftHimnosCoros(culto.plan_himnos_coros || [])
        setIsDirty(false)
        toast.success(t('culto.detail.toast.discarded' as TranslationKey))
    }

    const pendingCount = [
        JSON.stringify(draftAssignments) !== JSON.stringify(initialRef.current.assignments),
        draftObservaciones !== initialRef.current.observaciones,
        draftTema !== initialRef.current.tema,
        JSON.stringify(draftProtocolo) !== JSON.stringify(initialRef.current.protocolo),
        draftProtocoloDefinido !== initialRef.current.protocoloDefinido,
        JSON.stringify(draftInicioAnticipado) !== JSON.stringify(initialRef.current.inicioAnticipado),
        draftInicioAnticipadoDefinido !== initialRef.current.inicioAnticipadoDefinido,
        draftFestivo !== initialRef.current.festivo,
        draftHoraInicio !== initialRef.current.hora,
        draftLecturasChanged,
        draftHimnosChanged,
    ].filter(Boolean).length

    useEffect(() => {
        setIsDirty(pendingCount > 0)
    }, [pendingCount])

    const saveChangesLabels = useMemo(
        () => ({
            pendingBadge:
                pendingCount > 0
                    ? (t('profile.draftBar.withCount' as TranslationKey) as string).replace(
                          '{count}',
                          String(pendingCount)
                      )
                    : t('profile.draftBar.base' as TranslationKey),
            discard: t('profile.draftBar.discard' as TranslationKey),
            save: t('profile.draftBar.save' as TranslationKey),
            saving: t('profile.draftBar.saving' as TranslationKey),
        }),
        [pendingCount, t]
    )

    const tipoCulto = culto.tipo_culto?.nombre || 'Culto'
    const config = culto.tipo_culto || {}

    return (
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-3 md:space-y-6 lg:space-y-8 pb-16 md:pb-20 px-3 md:px-8 no-scrollbar w-full">
            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-6 w-full">
                <BackButton fallbackUrl="/dashboard/cultos" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-[2rem] md:rounded-[3rem] p-3 md:p-4 lg:p-6 xl:p-8 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/5 w-full"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
                            <div className="space-y-3 md:space-y-4">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div
                                        className="w-6 h-6 md:w-8 md:h-8 rounded-xl md:rounded-2xl shadow-2xl animate-bounce shrink-0"
                                        style={{ backgroundColor: config.color || '#4A90E2', boxShadow: `0 10px 25px -5px ${config.color || '#4A90E2'}40` }}
                                    />
                                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none truncate py-1">
                                        {tipoCulto}
                                    </h1>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 md:gap-10">
                                    <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md px-4 md:px-8 py-2.5 md:py-4 rounded-2xl md:rounded-3xl border border-white/20 shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/30">
                                        <Calendar className="w-6 h-6 text-primary" />
                                        <div className="flex flex-col">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">
                                                {t('culto.detail.meta.cultoDate' as TranslationKey)}
                                            </p>
                                            <span className="text-base md:text-xl font-black uppercase tracking-tight">
                                                {format(new Date(culto.fecha), 'PPPP', { locale })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md px-4 md:px-8 py-2.5 md:py-4 rounded-2xl md:rounded-3xl border border-white/20 shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/30 font-black">
                                        <Clock className="w-6 h-6 text-primary" />
                                        <div className="flex flex-col">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">
                                                {t('culto.detail.meta.startTime' as TranslationKey)}
                                            </p>
                                            <span className="text-base md:text-xl uppercase tracking-widest">
                                                {draftHoraInicio.slice(0, 5)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle Festivo Premium */}
                                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-4 leading-none">
                                            {t('culto.detail.meta.workdayStatus' as TranslationKey)}
                                        </p>
                                        <button
                                            onClick={readOnlyAssignments ? undefined : handleToggleFestivo}
                                            disabled={isUpdating || readOnlyAssignments}
                                            className={`flex items-center gap-3 px-4 md:px-8 py-2.5 md:py-4 rounded-2xl md:rounded-3xl border transition-all font-black group relative overflow-hidden h-full ${draftFestivo
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-xl shadow-amber-500/30 scale-105'
                                                : 'bg-white/40 dark:bg-black/20 backdrop-blur-md text-muted-foreground border-white/20 hover:border-amber-500/50 hover:bg-amber-50/10'
                                                }`}
                                        >
                                            <div className={`absolute inset-0 bg-linear-to-r from-white/20 to-transparent -translate-x-full transition-transform duration-1000 ${draftFestivo ? 'group-hover:translate-x-full' : ''}`} />
                                            <div className={`p-2 rounded-xl transition-colors ${draftFestivo ? 'bg-white/20' : 'bg-amber-500/10'}`}>
                                                <AlertCircle className={`w-6 h-6 ${draftFestivo ? 'text-white' : 'text-amber-500'}`} />
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className={`text-[10px] uppercase tracking-widest leading-none mb-1 ${draftFestivo ? 'text-white/80' : 'text-muted-foreground'}`}>
                                                    {draftFestivo
                                                        ? t('culto.detail.meta.specialDay' as TranslationKey)
                                                        : t('culto.detail.meta.workday' as TranslationKey)}
                                                </span>
                                                <span className="text-sm uppercase tracking-tight relative z-10 whitespace-nowrap">
                                                    {draftFestivo
                                                        ? t('culto.detail.meta.festivoApplied' as TranslationKey)
                                                        : t('culto.detail.meta.markFestivo' as TranslationKey)}
                                                </span>
                                            </div>
                                            {draftFestivo && (
                                                <motion.div
                                                    layoutId="festivo-sparkle"
                                                    className="ml-2"
                                                >
                                                    <Sparkles className="w-5 h-5 text-white/70 animate-pulse" />
                                                </motion.div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-inner">
                                <Sparkles className="w-12 h-12 text-primary opacity-20" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Observaciones (Universal - Para TODOS los tipos de culto) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <div className="glass rounded-3xl md:rounded-4xl p-3 md:p-6 border border-white/20 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col gap-4 relative z-10">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <span className="text-2xl">📝</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1 text-foreground/90">
                                    Observaciones
                                </h3>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                    Notas adicionales del culto
                                </p>
                            </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                            placeholder="Escribe aquí las observaciones del culto..."
                            value={draftObservaciones}
                            readOnly={readOnlyAssignments}
                            onChange={readOnlyAssignments ? undefined : (e) => {
                                setDraftObservaciones(e.target.value)
                                setIsDirty(true)
                            }}
                            className={`w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/50 resize-none placeholder:text-slate-400 ${readOnlyAssignments ? 'cursor-not-allowed opacity-60' : ''}`}
                            rows={2}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Tema Introducción Alabanza (solo cultos de Alabanza) - Desplegable con confirmar/eliminar/modificar */}
            {tipoCulto.toLowerCase().includes('alabanza') && temaMounted && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <div className="glass rounded-3xl md:rounded-4xl p-3 sm:p-4 md:p-6 border border-white/20 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col gap-3 sm:gap-6 relative z-10">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shrink-0">
                                    <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight leading-none mb-1 text-foreground/90">
                                        {t('alabanza.tema.title')}
                                    </h3>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                        {t('alabanza.tema.desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="relative">
                                <button
                                    ref={temaTriggerRef}
                                    data-testid="tema-introduccion-trigger"
                                    type="button"
                                    onClick={() => {
                                        if (readOnlyAssignments) return
                                        if (temaTriggerRef.current) setTemaTriggerRect(temaTriggerRef.current.getBoundingClientRect())
                                        setTemaDropdownOpen((o) => !o)
                                    }}
                                    disabled={readOnlyAssignments}
                                    className={`flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 transition-all touch-manipulation text-left ${draftTema
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        } ${readOnlyAssignments ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700'}`}
                                >
                                    <span className="text-sm font-bold truncate">
                                        {draftTema
                                            ? t(draftTema as TranslationKey)
                                            : t('alabanza.tema.sinAsignar')}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${temaDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {temaDropdownOpen && !readOnlyAssignments && temaTriggerRect && createPortal(
                                    <>
                                        <div className="fixed inset-0 z-[9998]" onClick={() => setTemaDropdownOpen(false)} />
                                        {(() => {
                                            const dropdownStyle = computeTemaDropdownStyle(temaTriggerRect)
                                            return (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            data-testid="tema-introduccion-dropdown"
                                            className="fixed z-[9999] mt-2 min-w-[200px] max-w-[min(400px,calc(100vw-2rem))] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                                            style={{
                                                top: dropdownStyle.top,
                                                left: dropdownStyle.left,
                                                width: dropdownStyle.width,
                                            }}
                                        >
                                            <div className="p-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
                                                {TEMAS_ALABANZA_KEYS.map((key) => {
                                                    const isSelected = draftTema === key
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => {
                                                                setTemaDropdownOpen(false)
                                                                const current = draftTema
                                                                setTemaConfirmState({
                                                                    tipo: current ? 'modify' : 'assign',
                                                                    temaKey: key,
                                                                })
                                                            }}
                                                            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-left text-sm font-bold transition-colors touch-manipulation ${isSelected
                                                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                        >
                                                            {isSelected && <CheckCircle className="w-4 h-4 shrink-0 text-blue-500" />}
                                                            <span className="line-clamp-2">{t(key)}</span>
                                                        </button>
                                                    )
                                                })}
                                                {draftTema && (
                                                    <>
                                                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1.5" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTemaDropdownOpen(false)
                                                                setTemaConfirmState({ tipo: 'delete', temaKey: null })
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors touch-manipulation"
                                                        >
                                                            <Trash2 className="w-4 h-4 shrink-0" />
                                                            {t('alabanza.tema.sinAsignar')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                            )
                                        })()}
                                    </>,
                                    document.body
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dialog confirmar / eliminar / modificar */}
                    <Dialog open={!!temaConfirmState} onOpenChange={(open) => !open && setTemaConfirmState(null)}>
                        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-900 dark:text-white font-black uppercase tracking-tight">
                                    {temaConfirmState?.tipo === 'delete' && t('alabanza.tema.confirmDelete')}
                                    {temaConfirmState?.tipo === 'assign' && t('alabanza.tema.confirmAssign')}
                                    {temaConfirmState?.tipo === 'modify' && t('alabanza.tema.confirmModify')}
                                </DialogTitle>
                                <DialogDescription className="text-slate-600 dark:text-slate-400">
                                    {temaConfirmState?.tipo === 'assign' && temaConfirmState?.temaKey && t(temaConfirmState.temaKey as TranslationKey)}
                                    {temaConfirmState?.tipo === 'modify' && temaConfirmState?.temaKey && t(temaConfirmState.temaKey as TranslationKey)}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <button
                                    type="button"
                                    onClick={() => setTemaConfirmState(null)}
                                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!temaConfirmState) return
                                        const newTema = temaConfirmState.tipo === 'delete' ? null : temaConfirmState.temaKey
                                        setDraftTema(newTema)
                                        setIsDirty(true)
                                        toast.success(t('culto.detail.toast.pendingReminder' as TranslationKey))
                                        setTemaConfirmState(null)
                                    }}
                                    className={`px-4 py-2.5 rounded-xl font-bold transition-colors ${temaConfirmState?.tipo === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {t('himnario.confirm')}
                                </button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </motion.div>
            )}

            {/* Protocol Configuration (Solo Estudio Bíblico, oculto para SONIDO) */}
            {!readOnlyAssignments && (tipoCulto.toLowerCase().includes('estudio') || tipoCulto.toLowerCase().includes('biblico')) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <div className="glass rounded-3xl md:rounded-4xl p-3 sm:p-4 md:p-6 border border-white/20 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col gap-3 sm:gap-6 relative z-10">
                            {/* Header + Toggle maestro (como Inicio anticipado) */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="p-2.5 sm:p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shrink-0">
                                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight leading-none mb-1 text-foreground/90">
                                            {t('culto.protocol.title')}
                                        </h3>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                            {t('culto.protocol.desc')}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/80 mt-1.5 sm:mt-2 opacity-90">
                                            {t('culto.protocol.helpDashboard')}
                                        </p>
                                    </div>
                                </div>

                                {/* Toggle maestro: Activado = interactuar con oración/congregación; Desactivado = Por definir */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const definido = draftProtocoloDefinido === true
                                        if (definido) {
                                            setDraftProtocolo(null)
                                            setDraftProtocoloDefinido(false)
                                            toast.success(t('culto.detail.toast.protocolUndefined' as TranslationKey))
                                        } else {
                                            setDraftProtocolo({
                                                oracion_inicio: true,
                                                congregacion_pie: false
                                            })
                                            setDraftProtocoloDefinido(true)
                                            toast.success(t('culto.detail.toast.protocolActivated' as TranslationKey))
                                        }
                                        setIsDirty(true)
                                    }}
                                    className={`flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 min-h-[44px] sm:min-h-0 rounded-2xl border-2 transition-all cursor-pointer touch-manipulation shrink-0 w-full sm:w-auto sm:min-w-[180px] ${draftProtocoloDefinido === true
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-tight">
                                        {draftProtocoloDefinido === true
                                            ? t('culto.protocol.activated')
                                            : t('culto.protocol.deactivated')}
                                    </span>
                                    <div className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full p-0.5 sm:p-1 transition-colors border shrink-0 ${draftProtocoloDefinido === true
                                        ? 'bg-indigo-500 border-indigo-600'
                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                        }`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${draftProtocoloDefinido === true ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            </div>

                            {/* Oración y Congregación: solo visibles e interactivos cuando protocolo está Activado */}
                            {draftProtocoloDefinido === true && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3 sm:space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                                        {/* Switch Oración */}
                                        {(() => {
                                            const oracionActual = draftProtocolo?.oracion_inicio ?? true
                                            const congregacionActual = draftProtocolo?.congregacion_pie ?? false
                                            const oracionActivo = oracionActual
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setDraftProtocolo({
                                                            oracion_inicio: !oracionActual,
                                                            congregacion_pie: congregacionActual
                                                        })
                                                        setIsDirty(true)
                                                        toast.success(
                                                            !oracionActual
                                                                ? t('culto.detail.toast.prayerOn' as TranslationKey)
                                                                : t('culto.detail.toast.prayerOff' as TranslationKey)
                                                        )
                                                    }}
                                                    className={`flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 min-h-[44px] rounded-2xl border-2 transition-all flex-1 min-w-0 cursor-pointer touch-manipulation ${oracionActivo
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none mb-0.5">{t('culto.protocol.prayer')}</span>
                                                        <span className={`text-xs font-black uppercase tracking-tight truncate ${oracionActivo ? '' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            {oracionActual ? t('culto.protocol.yesPray') : t('culto.protocol.noPray')}
                                                        </span>
                                                    </div>
                                                    <div className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full p-0.5 sm:p-1 transition-colors border shrink-0 ${oracionActivo
                                                        ? 'bg-emerald-500 border-emerald-600'
                                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                                        }`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${oracionActivo ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            )
                                        })()}

                                        {/* Switch Congregación */}
                                        {(() => {
                                            const oracionActual = draftProtocolo?.oracion_inicio ?? true
                                            const congregacionActual = draftProtocolo?.congregacion_pie ?? false
                                            const congregacionActivo = congregacionActual
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setDraftProtocolo({
                                                            oracion_inicio: oracionActual,
                                                            congregacion_pie: !congregacionActual
                                                        })
                                                        setIsDirty(true)
                                                        toast.success(
                                                            !congregacionActual
                                                                ? t('culto.detail.toast.congregationStanding' as TranslationKey)
                                                                : t('culto.detail.toast.congregationSeated' as TranslationKey)
                                                        )
                                                    }}
                                                    className={`flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 min-h-[44px] rounded-2xl border-2 transition-all flex-1 min-w-0 cursor-pointer touch-manipulation ${congregacionActivo
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
                                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                                                        }`}
                                                >
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none mb-0.5">{t('culto.protocol.congregation')}</span>
                                                        <span className={`text-xs font-black uppercase tracking-tight truncate ${congregacionActivo ? '' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            {congregacionActual ? t('culto.protocol.standing') : t('culto.protocol.seated')}
                                                        </span>
                                                    </div>
                                                    <div className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full p-0.5 sm:p-1 transition-colors border shrink-0 ${congregacionActivo
                                                        ? 'bg-blue-500 border-blue-600'
                                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                                        }`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${congregacionActivo ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                            )
                                        })()}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Inicio Anticipado (Solo Estudio Bíblico, oculto para SONIDO) */}
            {!readOnlyAssignments && (tipoCulto.toLowerCase().includes('estudio') || tipoCulto.toLowerCase().includes('biblico')) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <div className="glass rounded-4xl p-4 sm:p-5 md:p-6 border border-white/20 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col gap-4 sm:gap-6 relative z-10">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shrink-0">
                                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight leading-none mb-1 text-foreground/90">
                                            {t('culto.detail.inicioAnticipado.title' as TranslationKey)}
                                        </h3>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                            {t('culto.detail.inicioAnticipado.subtitle' as TranslationKey)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/80 mt-1.5 sm:mt-2 opacity-90">
                                            {t('culto.protocol.helpDashboard')}
                                        </p>
                                    </div>
                                </div>

                                {/* Toggle Switch */}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const current = draftInicioAnticipado?.activo ?? false
                                        setDraftInicioAnticipadoDefinido(true)
                                        setDraftInicioAnticipado({
                                            activo: !current,
                                            minutos: draftInicioAnticipado?.minutos ?? 5,
                                            observaciones: draftInicioAnticipado?.observaciones
                                        })
                                        setIsDirty(true)
                                        toast.success(
                                            !current
                                                ? t('culto.detail.toast.inicioAnticipadoOn' as TranslationKey)
                                                : t('culto.detail.toast.inicioAnticipadoOff' as TranslationKey)
                                        )
                                    }}
                                    className={`flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3 min-h-[44px] sm:min-h-0 rounded-2xl border-2 transition-all cursor-pointer touch-manipulation shrink-0 w-full sm:w-auto sm:min-w-[180px] ${(draftInicioAnticipado?.activo ?? false)
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-tight">
                                        {(draftInicioAnticipado?.activo ?? false)
                                            ? t('culto.detail.inicioAnticipado.activado' as TranslationKey)
                                            : t('culto.detail.inicioAnticipado.desactivado' as TranslationKey)}
                                    </span>
                                    <div className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full p-0.5 sm:p-1 transition-colors border shrink-0 ${(draftInicioAnticipado?.activo ?? false)
                                        ? 'bg-amber-500 border-amber-600'
                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                        }`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${(draftInicioAnticipado?.activo ?? false) ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            </div>

                            {/* Content - Only shown when active */}
                            {(draftInicioAnticipado?.activo ?? false) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-5"
                                >
                                    {/* Minute Buttons */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('culto.detail.inicioAnticipado.minutosAntes' as TranslationKey)}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {[5, 7, 10].map((mins) => (
                                                <button
                                                    key={mins}
                                                    type="button"
                                                    onClick={async () => {
                                                        setDraftInicioAnticipado({
                                                            activo: true,
                                                            minutos: mins,
                                                            observaciones: draftInicioAnticipado?.observaciones
                                                        })
                                                        setIsDirty(true)
                                                        toast.success(
                                                            t('culto.detail.toast.inicioMinutos' as TranslationKey).replace(
                                                                '{mins}',
                                                                String(mins)
                                                            )
                                                        )
                                                    }}
                                                    className={`min-h-[44px] px-5 sm:px-6 py-3 rounded-2xl font-black text-sm transition-all touch-manipulation ${(draftInicioAnticipado?.minutos ?? 5) === mins
                                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {mins} min
                                                </button>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground font-bold">
                                                    {t('culto.detail.inicioAnticipado.otro' as TranslationKey)}
                                                </span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={30}
                                                    defaultValue={
                                                        ![5, 7, 10].includes(draftInicioAnticipado?.minutos ?? 5)
                                                            ? draftInicioAnticipado?.minutos
                                                            : ''
                                                    }
                                                    placeholder={t('culto.detail.inicioAnticipado.placeholderMin' as TranslationKey)}
                                                    onBlur={async (e) => {
                                                        const val = parseInt(e.target.value)
                                                        if (val && val > 0 && val <= 30) {
                                                            setDraftInicioAnticipado({
                                                                activo: true,
                                                                minutos: val,
                                                                observaciones: draftInicioAnticipado?.observaciones
                                                            })
                                                            setIsDirty(true)
                                                            toast.success(
                                                                t('culto.detail.toast.inicioMinutos' as TranslationKey).replace(
                                                                    '{mins}',
                                                                    String(val)
                                                                )
                                                            )
                                                        }
                                                    }}
                                                    className="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Calculated Start Time */}
                                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 opacity-70">
                                                    {t('culto.detail.inicioAnticipado.horaReal' as TranslationKey)}
                                                </p>
                                                <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                                                    {(() => {
                                                        const [hours, minutes] = draftHoraInicio.split(':').map(Number)
                                                        const minsBefore = draftInicioAnticipado?.minutos ?? 5
                                                        let newMins = minutes - minsBefore
                                                        let newHours = hours
                                                        if (newMins < 0) {
                                                            newMins += 60
                                                            newHours -= 1
                                                        }
                                                        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
                                                    })()}
                                                    <span className="text-sm font-bold text-amber-600/60 ml-2">
                                                        ({draftInicioAnticipado?.minutos ?? 5} min antes de {draftHoraInicio.slice(0, 5)})
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Cuadrícula de Contenido Responsiva */}
            <div className="space-y-3 md:space-y-8 w-full">
                {/* Fila 1: Responsables (Diseño Inteligente: Se expanden para ocupar el espacio) */}
                <div className="flex flex-wrap gap-4 md:gap-6 w-full overflow-visible relative z-30">
                    {config.tiene_lectura_introduccion && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.introduccion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={draftAssignments.introduccion}
                                usuarioActual={culto.usuario_intro}
                                onSelect={(id, confirmed) => handleAssignment('introduccion', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="introduccion"
                                isFestivo={culto.es_laborable_festivo}
                                onVerInstrucciones={() => setInstruccionesModalRol('introduccion')}
                                readOnly={readOnlyAssignments}
                                readingMode="draft"
                                onReadingDraftChange={(items, dirty) => {
                                    setDraftLecturas(items)
                                    if (dirty) setDraftLecturasChanged(true)
                                }}
                            />
                        </div>
                    )}

                    {config.tiene_ensenanza && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.ensenanza')}
                                icon={<BookOpen className="w-5 h-5" />}
                                selectedUserId={draftAssignments.ensenanza}
                                usuarioActual={culto.usuario_ensenanza}
                                onSelect={(id, confirmed) => handleAssignment('ensenanza', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="ensenanza"
                                isFestivo={culto.es_laborable_festivo}
                                onVerInstrucciones={() => setInstruccionesModalRol('ensenanza')}
                                readOnly={readOnlyAssignments}
                            />
                        </div>
                    )}

                    {config.tiene_testimonios && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.testimonios')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={draftAssignments.testimonios}
                                usuarioActual={culto.usuario_testimonios}
                                onSelect={(id, confirmed) => handleAssignment('testimonios', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="testimonios"
                                isFestivo={culto.es_laborable_festivo}
                                onVerInstrucciones={() => setInstruccionesModalRol('testimonios')}
                                readOnly={readOnlyAssignments}
                            />
                        </div>
                    )}

                    {config.tiene_lectura_finalizacion && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.finalizacion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={draftAssignments.finalizacion}
                                usuarioActual={culto.usuario_finalizacion}
                                onSelect={(id, confirmed) => handleAssignment('finalizacion', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="finalizacion"
                                isFestivo={culto.es_laborable_festivo}
                                onVerInstrucciones={() => setInstruccionesModalRol('finalizacion')}
                                readOnly={readOnlyAssignments}
                            />
                        </div>
                    )}
                </div>

                {/* Conflict Confirmation Dialog Portal */}
                {isConflictDialogOpen && createPortal(
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-32 bg-amber-500/10" />
                                <div className="p-8 relative z-10 text-center">
                                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
                                        <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-500" />
                                    </div>

                                    <h3 className="text-2xl font-black uppercase tracking-tight mb-3">
                                        Usuario No Disponible
                                    </h3>

                                    <p className="text-muted-foreground font-medium leading-relaxed mb-8">
                                        Este hermano ha indicado que no está disponible para esta fecha o tipo de asignación. ¿Deseas asignarlo de todos modos?
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleConfirmAssignment}
                                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Asignar de todos modos
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsConflictDialogOpen(false)
                                                setPendingAssignment(null)
                                            }}
                                            className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground/70 hover:text-foreground rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}

                {/* Fila 2: Lecturas y Música */}
                <div className="grid gap-4 md:gap-6 lg:gap-8 lg:grid-cols-12 w-full items-start">
                    {/* Columna Derecha: Música (Bloque principal más grande y detallado) */}
                    {config.tiene_himnos_y_coros && (
                        <motion.div
                            id="himnos"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-12 w-full"
                        >
                            <Card className="glass rounded-[2.5rem] border border-white/20 shadow-2xl w-full">
                                <CardHeader className="p-4 md:p-6 lg:p-8 border-b border-white/10 bg-accent/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle icon={<Music className="w-6 h-6 text-primary" />} className="text-xl md:text-2xl font-black uppercase tracking-tighter">
                                            {t('dashboard.hymns')}
                                        </CardTitle>
                                        <div className="hidden sm:block bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                                            <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none">
                                                Máximo {LIMITES.MAX_HIMNOS_POR_CULTO} por categoría
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 md:p-5 lg:p-6">
                                    <HimnoCoroSelector
                                        cultoId={culto.id}
                                        cultoDate={culto.fecha}
                                        maxHimnos={5}
                                        maxCoros={5}
                                        tipoCulto={culto.tipo_culto?.nombre}
                                        mode="draft"
                                        onDraftChange={(items) => {
                                            setDraftHimnosCoros(items)
                                        }}
                                        onDraftDirty={() => setDraftHimnosChanged(true)}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>

            <SaveChangesBar
                isDirty={isDirty}
                isSaving={isUpdating}
                pendingCount={pendingCount}
                onSave={handleSaveDraft}
                onDiscard={handleDiscardDraft}
                labels={saveChangesLabels}
            />

            <InstruccionesCultoModal
                isOpen={!!instruccionesModalRol}
                onClose={() => setInstruccionesModalRol(null)}
                cultoTypeId={culto.tipo_culto_id}
                cultoTypeNombre={tipoCulto}
                rol={instruccionesModalRol ?? 'introduccion'}
            />

            <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white font-black uppercase tracking-tight">
                            {t('culto.detail.leaveTitle' as TranslationKey)}
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            {t('culto.detail.leaveDesc' as TranslationKey)}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <button
                            type="button"
                            onClick={() => {
                                setLeaveConfirmOpen(false)
                                setPendingNavigationHref(null)
                            }}
                            className="px-4 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {t('profile.leave.stay' as TranslationKey)}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const targetHref = pendingNavigationHref
                                setLeaveConfirmOpen(false)
                                setPendingNavigationHref(null)
                                setIsDirty(false)
                                if (targetHref) window.location.href = targetHref
                            }}
                            className="px-4 py-2.5 rounded-xl font-bold transition-colors bg-red-600 hover:bg-red-700 text-white"
                        >
                            {t('profile.leave.withoutSave' as TranslationKey)}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
