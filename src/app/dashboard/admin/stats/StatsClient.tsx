'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    UserStats,
    getParticipationStats,
    getBibleReadingStats,
    getStatsSummary,
    ReadingStats,
    StatsSummary
} from './actions'
import { Card } from '@/components/ui/Card'
import { BarChart, Search, ArrowUpDown, BookOpen, PieChart as PieChartIcon, Calendar, Users, Mic2 } from 'lucide-react'
import NextImage from 'next/image'
import {
    BarChart as ReBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'

interface StatsClientProps {
    readonly initialStats: UserStats[]
    readonly initialSummary: StatsSummary
    readonly initialBibleStats: { topReadings: ReadingStats[]; readingsByType: ReadingStats[]; totalLecturas?: number }
    readonly cultoTypes: readonly { id: string; nombre: string }[]
    readonly currentYear: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function StatsClient({
    initialStats,
    initialSummary,
    initialBibleStats,
    cultoTypes,
    currentYear
}: StatsClientProps) {
    const { t } = useI18n()
    const [stats, setStats] = useState<UserStats[]>(initialStats)
    const [summary, setSummary] = useState<StatsSummary>(initialSummary)
    const [readingStats, setReadingStats] = useState(initialBibleStats)
    const [year, setYear] = useState(currentYear)
    const [bibleYear, setBibleYear] = useState<number | 'all'>(currentYear)
    const [tipoCultoId, setTipoCultoId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'pulpit' | 'bible'>('pulpit')
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof UserStats['stats'] | 'total' | 'nombre'; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' })

    const loadData = useCallback(async () => {
        setIsLoading(true)
        const [statsRes, summaryRes, bibleRes] = await Promise.all([
            getParticipationStats(year, tipoCultoId || undefined),
            getStatsSummary(year, tipoCultoId || undefined),
            getBibleReadingStats(bibleYear === 'all' ? undefined : bibleYear, tipoCultoId || undefined)
        ])
        if (statsRes.success && statsRes.data) setStats(statsRes.data)
        if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data)
        if (bibleRes.success && bibleRes.data) setReadingStats(bibleRes.data)
        setIsLoading(false)
    }, [year, bibleYear, tipoCultoId])

    useEffect(() => {
        loadData()
    }, [loadData])

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

    const handleYearChange = (newYear: string) => {
        setYear(Number.parseInt(newYear, 10))
    }

    const handleBibleYearChange = (newYear: string) => {
        setBibleYear(newYear === 'all' ? 'all' : Number.parseInt(newYear, 10))
    }

    const handleTipoChange = (id: string) => {
        setTipoCultoId(id === '' ? null : id)
    }

    const handleSort = (key: keyof UserStats['stats'] | 'total' | 'nombre') => {
        let direction: 'asc' | 'desc' = 'desc'
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc'
        setSortConfig({ key, direction })
    }

    const sortedStats = [...stats].sort((a, b) => {
        if (sortConfig.key === 'nombre') {
            const nameA = `${a.user.nombre} ${a.user.apellidos}`.toLowerCase()
            const nameB = `${b.user.nombre} ${b.user.apellidos}`.toLowerCase()
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        }
        const key = sortConfig.key
        const valA = key === 'total' ? a.total : a.stats[key]
        const valB = key === 'total' ? b.total : b.stats[key]
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })

    const filteredStats = sortedStats.filter(stat => {
        const fullName = `${stat.user.nombre} ${stat.user.apellidos}`.toLowerCase()
        const matchesSearch = fullName.includes(searchTerm.toLowerCase())
        return matchesSearch
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <BackButton fallbackUrl="/dashboard/admin" />
            </div>

            {/* Tabs - contraste garantizado: activo = fondo oscuro + texto claro */}
            <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('pulpit')}
                    className={activeTab === 'pulpit'
                        ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground shadow-md transition-colors'
                        : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-foreground hover:bg-muted/50 transition-colors'}
                >
                    <BarChart className="w-4 h-4 shrink-0" />
                    <span>{t('admin.stats.tabPulpit')}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('bible')}
                    className={activeTab === 'bible'
                        ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-primary text-primary-foreground shadow-md transition-colors'
                        : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-foreground hover:bg-muted/50 transition-colors'}
                >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{t('admin.stats.tabBible')}</span>
                </button>
            </div>

            {activeTab === 'pulpit' ? (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4 sm:p-6 glass">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl shrink-0">
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.stats.kpiCultos')}</p>
                                    <p className="text-xl sm:text-2xl font-bold">{summary.totalCultos}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4 sm:p-6 glass">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 bg-emerald-500/10 rounded-xl shrink-0">
                                    <Mic2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.stats.kpiParticipaciones')}</p>
                                    <p className="text-xl sm:text-2xl font-bold">{summary.totalParticipaciones}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4 sm:p-6 glass sm:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl shrink-0">
                                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-muted-foreground">{t('admin.stats.kpiHermanosActivos')}</p>
                                    <p className="text-xl sm:text-2xl font-bold">{summary.hermanosActivos}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Header / Filters */}
                    <div className="glass rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl shrink-0">
                                    <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-bold">{t('admin.stats.title')}</h1>
                                    <p className="text-muted-foreground text-sm">{t('admin.stats.subtitle')}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                                <div className="relative flex-1 sm:min-w-[180px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={t('admin.stats.searchPlaceholder')}
                                        className="w-full pl-9 pr-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="p-2 bg-background border border-input rounded-lg outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                                    value={year}
                                    onChange={(e) => handleYearChange(e.target.value)}
                                    disabled={isLoading}
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                {cultoTypes.length > 0 && (
                                    <select
                                        className="p-2 bg-background border border-input rounded-lg outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                                        value={tipoCultoId ?? ''}
                                        onChange={(e) => handleTipoChange(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">{t('admin.stats.filterTipoAll')}</option>
                                        {cultoTypes.map(tc => (
                                            <option key={tc.id} value={tc.id}>{tc.nombre}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table (desktop) / Cards (mobile) */}
                    <div className="glass rounded-2xl overflow-hidden">
                        {/* Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border/50 bg-muted/20">
                                        <th className="text-left p-4 font-medium text-muted-foreground min-w-[150px] cursor-pointer hover:bg-muted/30 transition-colors sticky left-0 bg-background/80 backdrop-blur-sm" onClick={() => handleSort('nombre')}>
                                            <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">Hermano <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('total')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">Total <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-green-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('introduccion')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">{t('admin.stats.intro')} <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-blue-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('finalizacion')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">{t('admin.stats.final')} <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-purple-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('ensenanza')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">{t('admin.stats.teaching')} <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-orange-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('testimonios')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">{t('admin.stats.testimonies')} <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {isLoading && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                                                {t('admin.stats.loading')}
                                            </td>
                                        </tr>
                                    )}
                                    {!isLoading && filteredStats.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                {t('admin.stats.noResults')}
                                            </td>
                                        </tr>
                                    )}
                                    {!isLoading && filteredStats.length > 0 && filteredStats.map((stat, i) => (
                                            <tr key={stat.userId} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {stat.user.avatar_url ? (
                                                            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                                                                <NextImage
                                                                    src={stat.user.avatar_url}
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                                {stat.user.nombre?.[0]}{stat.user.apellidos?.[0]}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-foreground">{stat.user.nombre} {stat.user.apellidos}</p>
                                                            <p className="text-xs text-muted-foreground">{i + 1}{t('admin.stats.ranking')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-bold text-lg">{stat.total}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.introduccion > 0 ? stat.stats.introduccion : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.finalizacion > 0 ? stat.stats.finalizacion : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.ensenanza > 0 ? stat.stats.ensenanza : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.testimonios > 0 ? stat.stats.testimonios : '-'}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden p-4 space-y-4">
                            {isLoading && (
                                <div className="p-8 text-center text-muted-foreground animate-pulse">{t('admin.stats.loading')}</div>
                            )}
                            {!isLoading && filteredStats.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">{t('admin.stats.noResults')}</div>
                            )}
                            {!isLoading && filteredStats.length > 0 && filteredStats.map((stat, i) => (
                                    <Card key={stat.userId} className="p-4">
                                        <div className="flex items-center gap-3">
                                            {stat.user.avatar_url ? (
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                                                    <NextImage src={stat.user.avatar_url} alt="" fill className="object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                                                    {stat.user.nombre?.[0]}{stat.user.apellidos?.[0]}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate">{stat.user.nombre} {stat.user.apellidos}</p>
                                                <p className="text-xs text-muted-foreground">{i + 1}{t('admin.stats.ranking')}</p>
                                            </div>
                                            <p className="text-xl font-bold text-primary shrink-0">{stat.total}</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/30">
                                            <div className="text-center min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={t('admin.stats.intro')}>{t('admin.stats.introShort')}</p>
                                                <p className="font-medium">{stat.stats.introduccion > 0 ? stat.stats.introduccion : '-'}</p>
                                            </div>
                                            <div className="text-center min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={t('admin.stats.final')}>{t('admin.stats.finalShort')}</p>
                                                <p className="font-medium">{stat.stats.finalizacion > 0 ? stat.stats.finalizacion : '-'}</p>
                                            </div>
                                            <div className="text-center min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={t('admin.stats.teaching')}>{t('admin.stats.teachingShort')}</p>
                                                <p className="font-medium">{stat.stats.ensenanza > 0 ? stat.stats.ensenanza : '-'}</p>
                                            </div>
                                            <div className="text-center min-w-0">
                                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={t('admin.stats.testimonies')}>{t('admin.stats.testimoniesShort')}</p>
                                                <p className="font-medium">{stat.stats.testimonios > 0 ? stat.stats.testimonios : '-'}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Filtros Biblia - arriba */}
                    <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('admin.stats.filterYear')}:</span>
                            <select
                                className="p-2 bg-background border border-input rounded-lg outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                                value={bibleYear}
                                onChange={(e) => handleBibleYearChange(e.target.value)}
                                disabled={isLoading}
                            >
                                <option value="all">{t('admin.stats.filterAllYears')}</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        {cultoTypes.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{t('admin.stats.filterTipoCulto')}:</span>
                                <select
                                    className="p-2 bg-background border border-input rounded-lg outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                                    value={tipoCultoId ?? ''}
                                    onChange={(e) => handleTipoChange(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="">{t('admin.stats.filterTipoAll')}</option>
                                    {cultoTypes.map(tc => (
                                        <option key={tc.id} value={tc.id}>{tc.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {!isLoading && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{t('admin.stats.totalLecturas')}:</span>
                                <span className="font-bold text-primary">{readingStats?.totalLecturas ?? 0}</span>
                            </div>
                        )}
                    </div>

                    {/* Biblical Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Citas más leídas */}
                        <Card className="p-4 sm:p-6 glass min-w-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                    <BarChart className="w-5 h-5 text-blue-500" />
                                </div>
                                <h3 className="font-bold text-lg">{t('admin.stats.topReadings')}</h3>
                            </div>
                            {(readingStats?.topReadings?.length ?? 0) > 0 ? (
                                <>
                                    {/* Móvil: lista compacta (evita Recharts en móvil) */}
                                    <div className="md:hidden space-y-2">
                                        {readingStats?.topReadings?.slice(0, 5).map((r, i) => (
                                            <div key={`${r.label}-${r.count}`} className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-lg">
                                                <span className="text-sm font-medium truncate flex-1 min-w-0">{r.label}</span>
                                                <span className="text-sm font-bold text-primary shrink-0 ml-2">{r.count} {t('admin.stats.veces')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop: gráfico */}
                                    <div className="hidden md:block w-full h-[280px] min-h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={readingStats?.topReadings || []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={70} />
                                                <YAxis />
                                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4 min-h-[120px]">
                                    <BookOpen className="w-12 h-12 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">{t('admin.stats.emptyChartTop')}</p>
                                    <p className="text-xs text-muted-foreground/80">{t('admin.stats.noReadingsForYear')}</p>
                                </div>
                            )}
                        </Card>

                        {/* Lecturas por tipo */}
                        <Card className="p-4 sm:p-6 glass min-w-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                                    <PieChartIcon className="w-5 h-5 text-purple-500" />
                                </div>
                                <h3 className="font-bold text-lg">{t('admin.stats.readingsByType')}</h3>
                            </div>
                            {(readingStats?.readingsByType?.length ?? 0) > 0 ? (
                                <>
                                    {/* Móvil: badges compactos */}
                                    <div className="md:hidden flex flex-wrap gap-2">
                                        {readingStats?.readingsByType?.map((r, idx) => (
                                            <div key={`${r.label}-${r.count}`} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-background/50 border border-border/30">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span className="text-sm font-medium">{r.label}</span>
                                                <span className="text-sm font-bold text-primary">{r.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop: gráfico circular */}
                                    <div className="hidden md:block w-full h-[280px] min-h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={readingStats?.readingsByType || []} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="label" label>
                                                    {(readingStats?.readingsByType || []).map((entry, idx) => (
                                                        <Cell key={`cell-${entry.label}-${entry.count}`} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4 min-h-[120px]">
                                    <PieChartIcon className="w-12 h-12 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">{t('admin.stats.emptyChartType')}</p>
                                    <p className="text-xs text-muted-foreground/80">{t('admin.stats.noReadingsForYear')}</p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Table / List */}
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-muted/20">
                            <h3 className="font-bold">{t('admin.stats.readingRanking')}</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {(readingStats?.topReadings || []).map((reading, rankIndex) => (
                                <div key={`${reading.label}-${reading.count}`} className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                            {rankIndex + 1}
                                        </div>
                                        <span className="font-medium truncate">{reading.label}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold shrink-0">
                                        {reading.count} {t('admin.stats.veces')}
                                    </span>
                                </div>
                            ))}
                            {(!readingStats?.topReadings || readingStats.topReadings.length === 0) && (
                                <p className="text-center text-muted-foreground py-8">{t('admin.stats.noReadings')}</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
