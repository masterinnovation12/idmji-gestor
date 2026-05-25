/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BinarySegmentedControl } from './BinarySegmentedControl'

describe('BinarySegmentedControl', () => {
  it('renderiza ambas opciones y marca la seleccionada con aria-checked', () => {
    render(
      <BinarySegmentedControl
        label="Oración"
        value={false}
        options={[
          { value: true, label: 'Sí' },
          { value: false, label: 'No' },
        ]}
        onChange={() => {}}
      />
    )
    expect(screen.getByRole('radiogroup', { name: 'Oración' })).toBeInTheDocument()
    const yes = screen.getByRole('radio', { name: 'Sí' })
    const no = screen.getByRole('radio', { name: 'No' })
    expect(yes).toHaveAttribute('aria-checked', 'false')
    expect(no).toHaveAttribute('aria-checked', 'true')
  })

  it('llama onChange al elegir la otra opción', () => {
    const onChange = vi.fn()
    render(
      <BinarySegmentedControl
        label="Congregación"
        value={false}
        options={[
          { value: true, label: 'De pie' },
          { value: false, label: 'Sentados' },
        ]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'De pie' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
