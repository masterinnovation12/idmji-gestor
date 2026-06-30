import { describe, it, expect } from 'vitest'
import { getStaticI18n } from './staticI18n'

describe('getStaticI18n', () => {
    it('traduce claves sin I18nProvider (skeletons / SSR)', () => {
        const { t } = getStaticI18n()
        expect(t('common.loading')).toBe('Cargando...')
        expect(t('ofrenda.plano.loading')).toBeTruthy()
    })

    it('devuelve la clave si no existe traducción', () => {
        const { t } = getStaticI18n()
        // @ts-expect-error clave inventada
        expect(t('clave.inexistente.xyz')).toBe('clave.inexistente.xyz')
    })
})
