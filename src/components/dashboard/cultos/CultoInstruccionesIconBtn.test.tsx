/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CultoInstruccionesIconBtn } from './CultoInstruccionesIconBtn'
import { translations } from '@/lib/i18n/translations'
import type { TranslationKey } from '@/lib/i18n/types'

const tEs = (k: string) => translations['es-ES'][k as TranslationKey] ?? k

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: tEs }),
}))

describe('CultoInstruccionesIconBtn', () => {
  it('renderiza botón accesible con testid por rol', () => {
    render(<CultoInstruccionesIconBtn rol="introduccion" onOpen={vi.fn()} />)
    const btn = screen.getByTestId('ver-instrucciones-icon-introduccion')
    // aria-label vía i18n (català: "Veure instruccions")
    expect(btn).toHaveAttribute('aria-label', translations['es-ES']['culto.instrucciones.ver'])
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('invoca onOpen con el rol al pulsar', () => {
    const onOpen = vi.fn()
    render(<CultoInstruccionesIconBtn rol="finalizacion" onOpen={onOpen} />)
    fireEvent.click(screen.getByTestId('ver-instrucciones-icon-finalizacion'))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(onOpen).toHaveBeenCalledWith('finalizacion')
  })
})
