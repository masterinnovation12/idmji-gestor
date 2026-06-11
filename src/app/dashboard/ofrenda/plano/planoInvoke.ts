/**
 * Invoca server actions de forma segura (evita crash en dev/HMR:
 * "Router action dispatched before initialization").
 */

const ROUTER_INIT_RE = /router action dispatched before initialization/i

export function isPlanoRouterInitError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    return ROUTER_INIT_RE.test(msg)
}

/** Reintenta brevemente si el App Router aún no está listo (típico tras HMR). */
export async function invokePlanoAction<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastErr = err
            if (!isPlanoRouterInitError(err) || attempt >= maxAttempts - 1) {
                throw err
            }
            await new Promise(r => setTimeout(r, 40 * (attempt + 1)))
        }
    }
    throw lastErr
}
