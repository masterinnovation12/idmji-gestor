/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssignmentPill } from './AssignmentPill'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

describe('AssignmentPill', () => {
  it('shows temaIntroduccionAlabanza when prop is passed', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        temaIntroduccionAlabanza="alabanza.tema.prepararnos"
      />
    )
    expect(screen.getByText('alabanza.tema.prepararnos')).toBeInTheDocument()
  })

  it('does not render tema block when temaIntroduccionAlabanza is null', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
        temaIntroduccionAlabanza={null}
      />
    )
    expect(screen.queryByText('alabanza.tema.prepararnos')).not.toBeInTheDocument()
  })

  it('does not render tema block when temaIntroduccionAlabanza is undefined', () => {
    render(
      <AssignmentPill
        label="Intro"
        usuario={{ nombre: 'Juan', apellidos: 'García' }}
      />
    )
    expect(screen.queryByText('alabanza.tema.prepararnos')).not.toBeInTheDocument()
  })
})
