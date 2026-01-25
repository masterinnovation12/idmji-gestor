import { Profile } from '@/types/database'
import Image from 'next/image'

export function UserAvatar({ usuario, size = 'md' }: { usuario: Partial<Profile> | null | undefined, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    if (!usuario) return null

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-base',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-20 h-20 text-xl'
    }

    const initials = `${usuario.nombre?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()

    return (
        <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden shadow-sm ring-2 ring-white/20 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold`}>
            {usuario.avatar_url ? (
                <Image
                    src={usuario.avatar_url}
                    alt={initials}
                    fill
                    className="object-cover"
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    )
}
