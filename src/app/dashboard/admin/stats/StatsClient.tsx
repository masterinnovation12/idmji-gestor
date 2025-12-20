'use client'

import { useState, useEffect } from 'react'
import { UserStats, getParticipationStats, getBibleReadingStats, ReadingStats } from './actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BarChart, Search, ArrowUpDown, BookOpen, PieChart as PieChartIcon } from 'lucide-react'
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

interface StatsClientProps {
    initialStats: UserStats[]
    currentYear: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function StatsClient({ initialStats, currentYear }: StatsClientProps) {
    const [stats, setStats] = useState<UserStats[]>(initialStats)
    const [readingStats, setReadingStats] = useState<{ topReadings: ReadingStats[], readingsByType: ReadingStats[] } | null>(null)
    const [year, setYear] = useState(currentYear)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'pulpit' | 'bible'>('pulpit')
    const [searchTerm, setSearchTerm] = useState('')
    const [sortConfig, setSortConfig] = useState<{ key: keyof UserStats['stats'] | 'total' | 'nombre'; direction: 'asc' | 'desc' }>({ key: 'total', direction: 'desc' })

    useEffect(() => {
        const loadBibleStats = async () => {
            const result = await getBibleReadingStats()
            if (result.success && result.data) {
                setReadingStats(result.data)
            }
        }
        loadBibleStats()
    }, [])

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i) // 2 years back, 2 years forward

    const handleYearChange = async (newYear: string) => {
        const y = parseInt(newYear)
        setYear(y)
        setIsLoading(true)
        const result = await getParticipationStats(y)
        if (result.success && result.data) {
            setStats(result.data)
        }
        setIsLoading(false)
    }

    const handleSort = (key: keyof UserStats['stats'] | 'total' | 'nombre') => {
        let direction: 'asc' | 'desc' = 'desc'
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc'
        }
        setSortConfig({ key, direction })
    }

    const sortedStats = [...stats].sort((a, b) => {
        if (sortConfig.key === 'nombre') {
            const nameA = `${a.user.nombre} ${a.user.apellidos}`.toLowerCase()
            const nameB = `${b.user.nombre} ${b.user.apellidos}`.toLowerCase()
            return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        }

        const valA = sortConfig.key === 'total' ? a.total : a.stats[sortConfig.key as keyof typeof a.stats]
        const valB = sortConfig.key === 'total' ? b.total : b.stats[sortConfig.key as keyof typeof b.stats]

        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })

    const filteredStats = sortedStats.filter(stat => {
        const fullName = `${stat.user.nombre} ${stat.user.apellidos}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase())
    })

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-muted/30 rounded-xl w-fit">
                <Button
                    variant={activeTab === 'pulpit' ? 'primary' : 'ghost'}
                    onClick={() => setActiveTab('pulpit')}
                    className="rounded-lg"
                >
                    <BarChart className="w-4 h-4 mr-2" />
                    Púlpito
                </Button>
                <Button
                    variant={activeTab === 'bible' ? 'primary' : 'ghost'}
                    onClick={() => setActiveTab('bible')}
                    className="rounded-lg"
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Biblia
                </Button>
            </div>

            {activeTab === 'pulpit' ? (
                <>
                    {/* Header / Filters */}
                    <div className="glass rounded-2xl p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <BarChart className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Estadísticas de Participación</h1>
                                <p className="text-muted-foreground text-sm">Rotación de hermanos en púlpito</p>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar hermano..."
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
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
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
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">Intro <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-blue-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('finalizacion')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm">Final <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-purple-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('ensenanza')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm"><span className="hidden sm:inline">Enseñ</span><span className="sm:hidden">Ens</span> <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                        <th className="text-center p-4 font-medium text-orange-600/80 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSort('testimonios')}>
                                            <div className="flex items-center justify-center gap-1 text-xs md:text-sm"><span className="hidden sm:inline">Testimonios</span><span className="sm:hidden">Test</span> <ArrowUpDown className="w-3 h-3" /></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">
                                                Cargando datos...
                                            </td>
                                        </tr>
                                    ) : filteredStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No se encontraron registros
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStats.map((stat, i) => (
                                            <tr key={stat.userId} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {stat.user.avatar_url ? (
                                                            <img src={stat.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                                {stat.user.nombre?.[0]}{stat.user.apellidos?.[0]}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-foreground">{stat.user.nombre} {stat.user.apellidos}</p>
                                                            <p className="text-xs text-muted-foreground">{i + 1}º en ranking</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-bold text-lg">{stat.total}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.introduccion > 0 ? stat.stats.introduccion : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.finalizacion > 0 ? stat.stats.finalizacion : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.ensenanza > 0 ? stat.stats.ensenanza : '-'}</td>
                                                <td className="p-4 text-center text-muted-foreground">{stat.stats.testimonios > 0 ? stat.stats.testimonios : '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Biblical Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Most Read Bar Chart */}
                        <Card className="p-6 glass">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <BarChart className="w-5 h-5 text-blue-500" />
                                </div>
                                <h3 className="font-bold text-lg">Citas más leídas</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReBarChart data={readingStats?.topReadings || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10 }}
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            height={70}
                                        />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </ReBarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Types Pie Chart */}
                        <Card className="p-6 glass">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <PieChartIcon className="w-5 h-5 text-purple-500" />
                                </div>
                                <h3 className="font-bold text-lg">Lecturas por tipo</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={readingStats?.readingsByType || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="count"
                                            nameKey="label"
                                            label
                                        >
                                            {(readingStats?.readingsByType || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Simple List (Table) for Mobile or simple view */}
                    <div className="glass rounded-2xl overflow-hidden mt-6">
                        <div className="p-4 border-b border-border/50 bg-muted/20">
                            <h3 className="font-bold">Ranking de Lecturas</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {(readingStats?.topReadings || []).map((reading, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {i + 1}
                                        </div>
                                        <span className="font-medium">{reading.label}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold">
                                        {reading.count} veces
                                    </span>
                                </div>
                            ))}
                            {(!readingStats?.topReadings || readingStats.topReadings.length === 0) && (
                                <p className="text-center text-muted-foreground py-8">No hay datos de lectura registrados aún.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
