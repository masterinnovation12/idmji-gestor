/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExportLayout } from './ExportLayout'
import { ExportHeaderBlock } from './ExportHeaderBlock'
import {
    EXPORT_HEADER_CLUSTER_TEST_ID,
    EXPORT_HEADER_ROOT_TEST_ID,
    EXPORT_HEADER_TEXT_TEST_ID,
} from './exportHeaderLayout'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'
import type { OfrendaExportLabels } from './ofrendaLocale'

const labels: OfrendaExportLabels = {
    churchName: 'IDMJI Sabadell',
    titleDoc: 'Labor Ofrenda',
    rolFecha: 'Rol / Fecha',
    secuencia: 'Sacos',
    semanaIso: 'Semana ISO',
    realiza: 'Realiza',
    apoyo: 'Apoyo',
    vigilancia: 'Vigilancia',
    colaboradores: 'Colaboradores',
    colaborador1: 'Col. 1',
    colaborador2: 'Col. 2',
    colaborador3: 'Col. 3',
    jueves: 'Jueves',
    domingo: 'Domingo',
    manana: 'Mañana',
    tarde: 'Tarde',
    legendJueves: 'Jueves',
    legendDomManana: 'Dom. mañana',
    legendDomTarde: 'Dom. tarde',
    officialSite: 'idmji.org',
    footer: 'Generado por Gestor',
    sacosMeta: () => 'meta sacos',
}

const servicios: OfrServicio[] = [
    {
        id: 's1',
        plan_id: 'p1',
        fecha: '2026-05-07',
        dia_tipo: 'jueves',
        semana_iso: 19,
        secuencia_desde: 1,
        secuencia_hasta: 4,
        secuencia_texto: '01 al 04',
        posicion: 0,
    },
    {
        id: 's2',
        plan_id: 'p1',
        fecha: '2026-05-10',
        dia_tipo: 'domingo',
        semana_iso: 19,
        secuencia_desde: 5,
        secuencia_hasta: 8,
        secuencia_texto: '05 al 08',
        posicion: 1,
    },
    {
        id: 's3',
        plan_id: 'p1',
        fecha: '2026-05-10',
        dia_tipo: 'domingo_tarde',
        semana_iso: 19,
        secuencia_desde: 9,
        secuencia_hasta: 12,
        secuencia_texto: '09 al 12',
        posicion: 2,
    },
    {
        id: 's4',
        plan_id: 'p1',
        fecha: '2026-05-14',
        dia_tipo: 'jueves',
        semana_iso: 20,
        secuencia_desde: 1,
        secuencia_hasta: 4,
        secuencia_texto: '01 al 04',
        posicion: 3,
    },
]

const plan: PlanCompleto = {
    plan: {
        id: 'p1',
        mes: 5,
        anio: 2026,
        sacos_jueves: 4,
        sacos_domingo: 8,
        sacos_domingo_tarde: 4,
        secuencia_maximo: 20,
        secuencia_puntero: 1,
        secuencia_puntero_fin: 5,
        updated_at: '',
        created_at: '',
    },
    servicios,
    asignaciones: [],
    miembros: [],
}

const miembros: OfrMiembro[] = []

vi.mock('next/image', () => ({
    default: () => null,
}))

describe('ExportLayout export branding', () => {
    it('no muestra idmji.org en cabecera ni pie', () => {
        render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
            />,
        )
        expect(screen.queryByText('idmji.org')).not.toBeInTheDocument()
        expect(screen.queryByText(/CGMJCI/)).not.toBeInTheDocument()
        expect(screen.getByText(/Generado por Gestor/)).toBeInTheDocument()
    })

    it('título sin año duplicado', () => {
        render(
            <ExportHeaderBlock
                labels={labels}
                periodLabel="Mayo 2026"
            />,
        )
        expect(screen.getByRole('heading', { name: 'Labor Ofrenda' })).toBeInTheDocument()
        expect(screen.getByText('Mayo 2026')).toBeInTheDocument()
        expect(screen.queryByText(/2026 2026/)).not.toBeInTheDocument()
    })

    it('cabecera premium centrada (PNG)', () => {
        render(
            <ExportHeaderBlock
                labels={labels}
                periodLabel="Mayo 2026"
                periodSubtitle="Semana 1 de 4 · 7 – 10 may"
            />,
        )
        const root = screen.getByTestId(EXPORT_HEADER_ROOT_TEST_ID)
        const text = screen.getByTestId(EXPORT_HEADER_TEXT_TEST_ID)
        expect(root).toHaveStyle({ justifyContent: 'center' })
        expect(text).toHaveStyle({ alignItems: 'center', textAlign: 'center' })
        expect(screen.getByTestId(EXPORT_HEADER_CLUSTER_TEST_ID)).toBeInTheDocument()
    })

    it('solo colaboradores: sin G1, secuencia ni meta de sacos en pie', () => {
        const week = servicios.slice(0, 3)
        render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
                servicios={week}
                peopleScope="g2"
            />,
        )
        expect(screen.getByText('Col. 1')).toBeInTheDocument()
        expect(screen.queryByText(labels.realiza)).not.toBeInTheDocument()
        expect(screen.queryByText(labels.secuencia)).not.toBeInTheDocument()
        expect(screen.queryByText(/sacos\/semana/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/01 al 04/)).not.toBeInTheDocument()
    })

    it('completo: incluye G1 y secuencia', () => {
        render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
                peopleScope="all"
            />,
        )
        expect(screen.getByText(labels.realiza)).toBeInTheDocument()
        expect(screen.getByText(labels.secuencia)).toBeInTheDocument()
    })

    it('modo semanal: solo 3 columnas de servicio y subtítulo', () => {
        const week = servicios.slice(0, 3)
        render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
                servicios={week}
                periodSubtitle="Semana 1 de 2 · 7 – 10 may"
                exportScope="week"
            />,
        )
        expect(screen.getByText('Semana 1 de 2 · 7 – 10 may')).toBeInTheDocument()
        expect(screen.getAllByText('01 al 04')).toHaveLength(1)
        expect(screen.queryByText('idmji.org')).not.toBeInTheDocument()
        expect(screen.queryByText(/CGMJCI/)).not.toBeInTheDocument()
    })
})
