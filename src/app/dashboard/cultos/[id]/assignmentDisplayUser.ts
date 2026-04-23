import type { Profile } from '@/types/database'

type PartialProfile = Partial<Profile> | null | undefined

export function reconcileOptimisticUser(
    nextSelectedId: string | null,
    currentOptimisticUser: PartialProfile,
    serverUser: PartialProfile
): Partial<Profile> | null {
    if (!nextSelectedId) return null
    if (currentOptimisticUser?.id === nextSelectedId) return currentOptimisticUser
    if (serverUser?.id === nextSelectedId) return serverUser
    return null
}

export function resolveDisplayUser(
    optimisticId: string | null,
    optimisticUser: PartialProfile,
    serverUser: PartialProfile
): Partial<Profile> | null {
    if (!optimisticId) return null
    if (optimisticUser?.id === optimisticId) return optimisticUser
    if (serverUser?.id === optimisticId) return serverUser
    return null
}

