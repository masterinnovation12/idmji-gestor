import { describe, expect, it } from 'vitest'
import { reconcileOptimisticUser, resolveDisplayUser } from './assignmentDisplayUser'

describe('resolveDisplayUser', () => {
    it('devuelve null cuando no hay id optimista', () => {
        expect(resolveDisplayUser(null, { id: 'a' }, { id: 'a' })).toBeNull()
    })

    it('prioriza usuario optimista si coincide con id', () => {
        const optimistic = { id: 'hugo', nombre: 'Hugo' }
        const server = { id: 'jeffrey', nombre: 'Jeffrey' }
        expect(resolveDisplayUser('hugo', optimistic, server)).toEqual(optimistic)
    })

    it('usa usuario de servidor solo si coincide con id', () => {
        const server = { id: 'hugo', nombre: 'Hugo' }
        expect(resolveDisplayUser('hugo', null, server)).toEqual(server)
    })

    it('evita mostrar usuario anterior cuando id cambia y perfil no coincide', () => {
        const oldServerUser = { id: 'jeffrey', nombre: 'Jeffrey' }
        expect(resolveDisplayUser('hugo', null, oldServerUser)).toBeNull()
    })
})

describe('reconcileOptimisticUser', () => {
    it('limpia usuario cuando selectedId es null', () => {
        expect(reconcileOptimisticUser(null, { id: 'jeffrey' }, { id: 'jeffrey' })).toBeNull()
    })

    it('mantiene optimista actual si coincide con selectedId', () => {
        const optimistic = { id: 'hugo', nombre: 'Hugo' }
        const server = { id: 'jeffrey', nombre: 'Jeffrey' }
        expect(reconcileOptimisticUser('hugo', optimistic, server)).toEqual(optimistic)
    })

    it('usa servidor cuando coincide y no hay optimista válido', () => {
        const server = { id: 'hugo', nombre: 'Hugo' }
        expect(reconcileOptimisticUser('hugo', null, server)).toEqual(server)
    })
})

