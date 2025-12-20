'use client'

import { useState, useEffect } from 'react'
import { getMovimientos, MovimientoData } from './actions'
import { FileText, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditClientProps {
    initialData: MovimientoData[]
    initialTotal: number
    initialTipos: string[]
}

export default function AuditClient({ initialData, initialTotal, initialTipos }: AuditClientProps) {
    const [movimientos, setMovimientos] = useState<MovimientoData[]>(initialData)
    const [total, setTotal] = useState(initialTotal)
    const [tipos, setTipos] = useState<string[]>(initialTipos)
    const [page, setPage] = useState(1)
    const [tipoFilter, setTipoFilter] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    const limit = 20
    const totalPages = Math.ceil(total / limit)

    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            const result = await getMovimientos(page, limit, tipoFilter || undefined)
            if (result.success && result.data) {
                setMovimientos(result.data.data)
                setTotal(result.data.total)
            }
            setIsLoading(false)
        }
        loadData()
    }, [page, tipoFilter])

    function getTipoColor(tipo: string): string {
        switch (tipo) {
            case 'asignacion': return 'bg-blue-500/10 text-blue-600'
            case 'lectura': return 'bg-green-500/10 text-green-600'
            case 'himno': return 'bg-purple-500/10 text-purple-600'
            case 'coro': return 'bg-pink-500/10 text-pink-600'
            case 'culto': return 'bg-orange-500/10 text-orange-600'
            default: return 'bg-gray-500/10 text-gray-600'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass rounded-2xl p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Auditoría</h1>
                        <p className="text-muted-foreground text-sm">Historial de cambios y movimientos</p>
                    </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <select
                        className="p-2 bg-background border border-input rounded-lg outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                        value={tipoFilter}
                        onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
                        disabled={isLoading}
                    >
                        <option value="">Todos los tipos</option>
                        {tipos.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
                <span className="text-muted-foreground">Total de registros:</span>
                <span className="font-bold text-lg">{total}</span>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto pb-2">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20">
                                <th className="text-left p-4 font-medium text-muted-foreground w-40">Fecha/Hora</th>
                                <th className="text-left p-4 font-medium text-muted-foreground w-48">Usuario</th>
                                <th className="text-left p-4 font-medium text-muted-foreground w-32">Tipo</th>
                                <th className="text-left p-4 font-medium text-muted-foreground">Descripción</th>
                                <th className="text-left p-4 font-medium text-muted-foreground w-32">Culto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground animate-pulse">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        No hay registros de auditoría
                                    </td>
                                </tr>
                            ) : (
                                movimientos.map((m) => (
                                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">
                                                    {format(new Date(m.fecha_hora), "dd MMM yyyy HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {m.usuario ? (
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span>{m.usuario.nombre} {m.usuario.apellidos}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Sistema</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(m.tipo)}`}>
                                                {m.tipo}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                                            {m.descripcion || '-'}
                                        </td>
                                        <td className="p-4 text-sm">
                                            {m.culto ? format(new Date(m.culto.fecha), "dd/MM/yyyy") : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">
                            Página {page} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
