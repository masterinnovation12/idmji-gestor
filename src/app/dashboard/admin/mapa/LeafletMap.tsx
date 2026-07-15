'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMapInstance, LayerGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SedeMapa } from './actions'

interface Props {
    readonly sedes: SedeMapa[]
    readonly selectedId: string | null
    readonly onSelect: (id: string) => void
}

/**
 * Mapa Leaflet de sedes (solo cliente, cargado con next/dynamic ssr:false).
 * Los marcadores son divIcons con el color de estado (activa/inactiva);
 * el detalle se muestra en el panel lateral del padre vía onSelect.
 */
export default function LeafletMap({ sedes, selectedId, onSelect }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<LeafletMapInstance | null>(null)
    const markersRef = useRef<LayerGroup | null>(null)

    useEffect(() => {
        let cancelled = false

        async function init() {
            const L = (await import('leaflet')).default
            if (cancelled || !containerRef.current) return

            if (!mapRef.current) {
                mapRef.current = L.map(containerRef.current, {
                    center: [41.47, 2.12],
                    zoom: 10,
                    scrollWheelZoom: true,
                })
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap',
                }).addTo(mapRef.current)
            }

            markersRef.current?.remove()
            const group = L.layerGroup()
            const conCoords = sedes.filter(s => s.lat != null && s.lng != null)

            for (const sede of conCoords) {
                const isSelected = sede.id === selectedId
                const color = sede.activo ? '#059669' : '#71717a'
                const size = isSelected ? 22 : 16
                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
                        width:${size}px;height:${size}px;border-radius:9999px;
                        background:${color};
                        border:3px solid ${isSelected ? '#b8964a' : '#ffffff'};
                        box-shadow:0 2px 8px rgba(15,23,42,0.45);
                    "></div>`,
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                })
                const marker = L.marker([sede.lat!, sede.lng!], { icon, title: sede.nombre })
                marker.on('click', () => onSelect(sede.id))
                marker.bindTooltip(sede.nombre, { direction: 'top', offset: [0, -10] })
                group.addLayer(marker)
            }

            group.addTo(mapRef.current)
            markersRef.current = group

            if (conCoords.length > 0) {
                const bounds = L.latLngBounds(conCoords.map(s => [s.lat!, s.lng!] as [number, number]))
                mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
            }
        }

        void init()
        return () => {
            cancelled = true
        }
    }, [sedes, selectedId, onSelect])

    useEffect(() => () => {
        mapRef.current?.remove()
        mapRef.current = null
    }, [])

    return <div ref={containerRef} data-testid="mapa-canvas" className="w-full h-full min-h-[420px] rounded-3xl z-0" />
}
