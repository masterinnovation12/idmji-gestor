'use client'

import { useState } from 'react'
import { getUsers, updateUser, UserData } from './actions'
import { Users, Search, Shield, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

interface UsersClientProps {
    initialUsers: UserData[]
    counts: { total: number, pulpito: number, admins: number }
}

export default function UsersClient({ initialUsers, counts }: UsersClientProps) {
    const [users, setUsers] = useState<UserData[]>(initialUsers)
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState<string | null>(null)

    const filteredUsers = users.filter(u => {
        const fullName = `${u.nombre} ${u.apellidos}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase())
    })

    async function handleRolChange(userId: string, newRol: string) {
        setIsLoading(userId)
        const result = await updateUser(userId, { rol: newRol })

        if (result.success) {
            setUsers(users.map(u => u.id === userId ? { ...u, rol: newRol } : u))
            toast.success('Rol actualizado')
        } else {
            toast.error(result.error || 'Error al actualizar')
        }
        setIsLoading(null)
    }

    async function handlePulpitoChange(userId: string, newPulpito: boolean) {
        setIsLoading(userId)
        const result = await updateUser(userId, { pulpito: newPulpito })

        if (result.success) {
            setUsers(users.map(u => u.id === userId ? { ...u, pulpito: newPulpito } : u))
            toast.success(newPulpito ? 'Añadido al púlpito' : 'Quitado del púlpito')
        } else {
            toast.error(result.error || 'Error al actualizar')
        }
        setIsLoading(null)
    }

    function getRolColor(rol: string): string {
        switch (rol) {
            case 'ADMIN': return 'bg-red-500/10 text-red-600'
            case 'EDITOR': return 'bg-blue-500/10 text-blue-600'
            default: return 'bg-gray-500/10 text-gray-600'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass rounded-2xl p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                        <p className="text-muted-foreground text-sm">Administra roles y permisos</p>
                    </div>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        className="w-full pl-9 pr-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{counts.total}</p>
                    <p className="text-muted-foreground text-sm">Total</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{counts.pulpito}</p>
                    <p className="text-muted-foreground text-sm">Púlpito</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{counts.admins}</p>
                    <p className="text-muted-foreground text-sm">Admins</p>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto pb-2">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20">
                                <th className="text-left p-4 font-medium text-muted-foreground w-1/3">Usuario</th>
                                <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                                <th className="text-center p-4 font-medium text-muted-foreground w-32">Rol</th>
                                <th className="text-center p-4 font-medium text-muted-foreground w-24">Púlpito</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {user.nombre?.[0]}{user.apellidos?.[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{user.nombre} {user.apellidos}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {user.email || '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <select
                                                value={user.rol}
                                                onChange={(e) => handleRolChange(user.id, e.target.value)}
                                                disabled={isLoading === user.id}
                                                className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer outline-none ${getRolColor(user.rol)}`}
                                            >
                                                <option value="MIEMBRO">MIEMBRO</option>
                                                <option value="EDITOR">EDITOR</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handlePulpitoChange(user.id, !user.pulpito)}
                                                disabled={isLoading === user.id}
                                                className={`p-2 rounded-full transition-colors ${user.pulpito
                                                    ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                                                    }`}
                                            >
                                                <UserCheck className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Note */}
            <div className="glass rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Nota:</p>
                    <p>Para crear nuevos usuarios, accede al Dashboard de Supabase. Los usuarios no pueden registrarse por sí mismos.</p>
                </div>
            </div>
        </div>
    )
}
