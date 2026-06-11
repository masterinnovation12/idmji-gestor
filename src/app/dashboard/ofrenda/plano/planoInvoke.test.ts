import { describe, it, expect, vi } from 'vitest'
import { invokePlanoAction, isPlanoRouterInitError } from './planoInvoke'

describe('planoInvoke', () => {
    it('detecta error de router no inicializado', () => {
        expect(isPlanoRouterInitError(new Error('Router action dispatched before initialization.'))).toBe(true)
    })

    it('reintenta si el router aún no está listo', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('Router action dispatched before initialization.'))
            .mockResolvedValueOnce({ ok: true })

        const res = await invokePlanoAction(fn, 3)
        expect(res).toEqual({ ok: true })
        expect(fn).toHaveBeenCalledTimes(2)
    })
})
