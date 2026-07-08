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
import { EXPORT_WEEK_LAYOUT_WIDTH_PX } from './exportLayoutMetrics'
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
    primeraVez: 'Colaborador 1a vez',
    segundaTerceraVez: 'Colaborador 2a y 3a vez',
    imposicionManos: 'Imposicion de manos',
    jueves: 'Jueves',
    domingo: 'Domingo',
    manana: 'Manana',
    tarde: 'Tarde',
    legendJueves: 'Jueves',
    legendDomManana: 'Dom. manana',
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

const miembros: OfrMiembro[] = [
    {
        id: 'u1',
        nombre: 'Ana Puig',
        grupo: 1,
        activo: true,
        orden: 1,
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        fijo_dia_tipo: null,
        fijo_rol: null,
        profile_id: null,
        created_at: '',
    },
    {
        id: 'u2',
        nombre: 'Marc Vidal de la Fuente',
        grupo: 1,
        activo: true,
        orden: 2,
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        fijo_dia_tipo: null,
        fijo_rol: null,
        profile_id: null,
        created_at: '',
    },
    {
        id: 'u3',
        nombre: 'Noelia Roca',
        grupo: 2,
        activo: true,
        orden: 3,
        puede_jueves: true,
        puede_domingo_manana: true,
        puede_domingo_tarde: true,
        fijo_dia_tipo: null,
        fijo_rol: null,
        profile_id: null,
        created_at: '',
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
    asignaciones: [
        { id: 'a1', servicio_id: 's1', rol: 'realiza', miembro_id: 'u1', es_override: false },
        { id: 'a2', servicio_id: 's1', rol: 'apoyo', miembro_id: 'u2', es_override: false },
        { id: 'a3', servicio_id: 's2', rol: 'colaborador_1', miembro_id: 'u3', es_override: false },
    ],
    miembros,
}

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

    it('titulo sin anio duplicado', () => {
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
                periodSubtitle="Semana 1 de 4 - 7 a 10 may"
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

    it('modo semanal: misma tabla que el mensual en formato vertical compacto', () => {
        const week = servicios.slice(0, 3)
        const { container } = render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
                servicios={week}
                periodSubtitle="Semana 1 de 2 - 7 a 10 may"
                exportScope="week"
            />,
        )
        expect(container.firstElementChild).toHaveStyle({
            width: `${EXPORT_WEEK_LAYOUT_WIDTH_PX}px`,
            minWidth: `${EXPORT_WEEK_LAYOUT_WIDTH_PX}px`,
        })
        expect(screen.getByText('Semana 1 de 2 - 7 a 10 may')).toBeInTheDocument()
        // Sin píldora de sección: el título del documento ya indica el alcance
        expect(screen.queryByText('Labores generales')).not.toBeInTheDocument()
        // Mismo diseño de tabla que el export mensual, compactado
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText(labels.rolFecha)).toBeInTheDocument()
        expect(screen.getAllByText('01 al 04')).toHaveLength(1)
        expect(screen.getAllByText('Jueves').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('07-may')).toBeInTheDocument()
        expect(screen.getByText('Ana Puig')).toBeInTheDocument()
        expect(screen.queryByText('idmji.org')).not.toBeInTheDocument()
        expect(screen.queryByText(/CGMJCI/)).not.toBeInTheDocument()
    })

    it('modo mensual conserva tabla horizontal', () => {
        render(
            <ExportLayout
                plan={plan}
                miembros={miembros}
                mesTitulo="Mayo"
                anio={2026}
                labels={labels}
                exportScope="month"
            />,
        )
        expect(screen.getByRole('table')).toBeInTheDocument()
        expect(screen.getByText(labels.rolFecha)).toBeInTheDocument()
    })

    it('formatea el pie con locale catalan cuando se indica', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-07-07T10:00:00'))
        try {
            render(
                <ExportLayout
                    plan={plan}
                    miembros={miembros}
                    mesTitulo="Juliol"
                    anio={2026}
                    labels={labels}
                    locale="ca-ES"
                    exportScope="week"
                    servicios={servicios.slice(0, 1)}
                />,
            )
            expect(screen.getAllByText(/juliol/i).length).toBeGreaterThanOrEqual(1)
        } finally {
            vi.useRealTimers()
        }
    })
})
