/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormattedNote } from './FormattedNote'

describe('FormattedNote', () => {
  it('renderiza **texto** como negrita (<strong>)', () => {
    const { container } = render(<FormattedNote text="Hola **mundo** final" />)
    const strong = container.querySelector('strong')
    expect(strong).not.toBeNull()
    expect(strong?.textContent).toBe('mundo')
  })

  it('preserva saltos de línea con whitespace-pre-line', () => {
    const { container } = render(<FormattedNote text={'linea 1\nlinea 2'} />)
    const p = container.querySelector('p')
    expect(p?.className).toContain('whitespace-pre-line')
    expect(p?.textContent).toBe('linea 1\nlinea 2')
  })

  it('soporta varias negritas en líneas distintas', () => {
    const { container } = render(
      <FormattedNote text={'**uno** normal\notra **dos**'} />
    )
    const strongs = container.querySelectorAll('strong')
    expect(strongs).toHaveLength(2)
    expect(strongs[0].textContent).toBe('uno')
    expect(strongs[1].textContent).toBe('dos')
  })

  it('no interpreta HTML (seguro frente a XSS)', () => {
    const { container } = render(
      <FormattedNote text={'<img src=x onerror=alert(1)>'} />
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })

  it('texto sin formato se renderiza tal cual', () => {
    render(<FormattedNote text="Solo texto plano" />)
    expect(screen.getByText('Solo texto plano')).toBeInTheDocument()
  })

  it('aplica la className recibida', () => {
    const { container } = render(
      <FormattedNote text="x" className="text-amber-800" />
    )
    expect(container.querySelector('p')?.className).toContain('text-amber-800')
  })
})
