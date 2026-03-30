import { describe, it, expect } from 'vitest'
import { formatHoraNotificacion } from './format-hora-notificacion'

describe('formatHoraNotificacion', () => {
    it('hora en punto sin ceros extra (formato BD con segundos)', () => {
        expect(formatHoraNotificacion('19:00:00')).toBe('19 h')
        expect(formatHoraNotificacion('09:00:00')).toBe('9 h')
    })

    it('acepta HH:mm sin segundos', () => {
        expect(formatHoraNotificacion('19:00')).toBe('19 h')
        expect(formatHoraNotificacion('9:00')).toBe('9 h')
    })

    it('con minutos muestra H:MM h', () => {
        expect(formatHoraNotificacion('09:30:00')).toBe('9:30 h')
        expect(formatHoraNotificacion('19:05:00')).toBe('19:05 h')
        expect(formatHoraNotificacion('10:15')).toBe('10:15 h')
    })

    it('vacío o inválido', () => {
        expect(formatHoraNotificacion(null)).toBe('—')
        expect(formatHoraNotificacion('')).toBe('—')
        expect(formatHoraNotificacion('   ')).toBe('—')
        expect(formatHoraNotificacion('xx')).toBe('—')
    })
})
