/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CultoInstruccionesIconBtn } from './CultoInstruccionesIconBtn'

describe('CultoInstruccionesIconBtn', () => {
  it('renderiza botón accesible con testid por rol', () => {
    render(<CultoInstruccionesIconBtn rol="introduccion" onOpen={vi.fn()} />)
    const btn = screen.getByTestId('ver-instrucciones-icon-introduccion')
    expect(btn).toHaveAttribute('aria-label', 'Ver instrucciones')
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
