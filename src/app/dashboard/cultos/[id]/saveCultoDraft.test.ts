import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
let lastLecturasInsert: Record<string, unknown>[] | null = null

/** Copia devuelta por `cultos.select...single` (mutable por test) */
const cultoSelectData = {
  meta_data: {},
  id_usuario_intro: 'andres-intro-uuid' as string | null,
  id_usuario_finalizacion: null as string | null,
  id_usuario_ensenanza: null as string | null,
  id_usuario_testimonios: null as string | null,
}

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        if (table === 'cultos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(async () => ({
                  data: { ...cultoSelectData },
                  error: null,
                })),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'lecturas_biblicas') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn((rows: Record<string, unknown>[]) => {
              lastLecturasInsert = rows
              return { error: null }
            }),
          }
        }
        return {}
      }),
    })
  ),
}))

const basePayload = {
  cultoId: 'culto-x',
  assignments: {} as Record<string, string | null>,
  observaciones: '',
  temaIntroduccionAlabanza: null as string | null,
  protocolo: null as { oracion_inicio: boolean; congregacion_pie: boolean } | null,
  protocoloDefinido: false,
  inicioAnticipado: null as { activo: boolean; minutos: number; observaciones?: string } | null,
  inicioAnticipadoDefinido: false,
  esLaborableFestivo: false,
  horaInicio: '19:00',
}

describe('saveCultoDraft — lecturas e id_usuario_lector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastLecturasInsert = null
    cultoSelectData.id_usuario_intro = 'andres-intro-uuid'
    cultoSelectData.id_usuario_finalizacion = null
  })

  it('corrige id_usuario_lector al intro efectivo del culto al persistir borrador', async () => {
    const { saveCultoDraft } = await import('./actions')
    const result = await saveCultoDraft({
      ...basePayload,
      lecturas: [
        {
          tipo_lectura: 'introduccion' as const,
          libro: 'Salmos',
          capitulo_inicio: 23,
          versiculo_inicio: 1,
          capitulo_fin: 23,
          versiculo_fin: 6,
          id_usuario_lector: 'registrador-mal-uuid',
        },
      ],
    })
    expect(result).toEqual({ success: true })
    expect(lastLecturasInsert).toHaveLength(1)
    expect(lastLecturasInsert![0].id_usuario_lector).toBe('andres-intro-uuid')
  })

  it('si en el mismo guardado se asigna un nuevo intro, las lecturas usan ese id', async () => {
    cultoSelectData.id_usuario_intro = 'intro-anterior'
    const nuevoIntro = 'nuevo-intro-uuid'
    const { saveCultoDraft } = await import('./actions')
    await saveCultoDraft({
      ...basePayload,
      assignments: { introduccion: nuevoIntro },
      lecturas: [
        {
          tipo_lectura: 'introduccion',
          libro: 'Proverbios',
          capitulo_inicio: 3,
          versiculo_inicio: 5,
          capitulo_fin: 3,
          versiculo_fin: 6,
          id_usuario_lector: 'registrador-uuid',
        },
      ],
    })
    expect(lastLecturasInsert![0].id_usuario_lector).toBe(nuevoIntro)
  })

  it('lectura de finalización usa id_usuario_finalizacion tras merge', async () => {
    cultoSelectData.id_usuario_intro = 'intro-a'
    cultoSelectData.id_usuario_finalizacion = 'final-b'
    const { saveCultoDraft } = await import('./actions')
    await saveCultoDraft({
      ...basePayload,
      lecturas: [
        {
          tipo_lectura: 'finalizacion',
          libro: 'Juan',
          capitulo_inicio: 3,
          versiculo_inicio: 16,
          capitulo_fin: 3,
          versiculo_fin: 16,
          id_usuario_lector: 'registrador',
        },
      ],
    })
    expect(lastLecturasInsert![0].id_usuario_lector).toBe('final-b')
  })
})
