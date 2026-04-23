type ReadingLike = {
    id?: string
}

export function upsertReadingPreserveOrder<T extends ReadingLike>(list: T[], reading: T): T[] {
    if (!reading?.id) return [...list, reading]
    const idx = list.findIndex((item) => item.id === reading.id)
    if (idx === -1) return [...list, reading]
    const next = [...list]
    next[idx] = reading
    return next
}

