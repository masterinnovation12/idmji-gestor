/**
 * Catálogo de hermanos con púlpito para el UserSelector.
 * Una sola carga por sede; el filtrado al escribir es 100 % local.
 */

'use client'

import { useEffect, useState } from 'react'
import { searchProfiles } from '@/app/dashboard/cultos/[id]/actions'
import type { Profile } from '@/types/database'

/** Mismo nombre que ACTIVE_SEDE_COOKIE; no importar activeSede.ts (es server-only). */
const SEDE_COOKIE = 'idmji-sede-activa'
const TTL_MS = 5 * 60 * 1000

type CatalogEntry = {
    profiles: Profile[]
    loadedAt: number
    loaded: boolean
    inflight: Promise<Profile[]> | null
}

const cache = new Map<string, CatalogEntry>()

function sedeKey(): string {
    if (typeof document === 'undefined') return ''
    const match = new RegExp(`(?:^|; )${SEDE_COOKIE}=([^;]*)`).exec(document.cookie)
    return match ? decodeURIComponent(match[1]) : ''
}

export function resetPulpitoCatalog(): void {
    cache.clear()
}

/** Última lista conocida de la sede activa (aunque esté caducada). */
export function peekPulpitoCatalog(): Profile[] | null {
    const entry = cache.get(sedeKey())
    if (!entry?.loaded) return null
    return entry.profiles
}

export function loadPulpitoCatalog(force = false): Promise<Profile[]> {
    const key = sedeKey()
    const entry = cache.get(key)
    const fresh = Boolean(entry?.loaded && Date.now() - entry.loadedAt <= TTL_MS)

    if (!force && fresh && entry) return Promise.resolve(entry.profiles)
    if (entry?.inflight) return entry.inflight

    const inflight = searchProfiles()
        .then(({ data }) => {
            const profiles = (data as Profile[] | null) ?? []
            cache.set(key, {
                profiles,
                loadedAt: Date.now(),
                loaded: true,
                inflight: null,
            })
            return profiles
        })
        .catch((error: unknown) => {
            const current = cache.get(key)
            if (current) current.inflight = null
            throw error
        })

    cache.set(key, {
        profiles: entry?.profiles ?? [],
        loadedAt: entry?.loadedAt ?? 0,
        loaded: entry?.loaded ?? false,
        inflight,
    })

    return inflight
}

export function usePulpitoCatalog() {
    const [profiles, setProfiles] = useState<Profile[]>(() => peekPulpitoCatalog() ?? [])
    const [isLoading, setIsLoading] = useState(() => peekPulpitoCatalog() === null)

    useEffect(() => {
        let cancelled = false
        const cached = peekPulpitoCatalog()
        if (cached) {
            setProfiles(cached)
            setIsLoading(false)
        } else {
            setIsLoading(true)
        }

        loadPulpitoCatalog()
            .then((data) => {
                if (!cancelled) {
                    setProfiles(data)
                    setIsLoading(false)
                }
            })
            .catch(() => {
                if (!cancelled) setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [])

    return { profiles, isLoading }
}
