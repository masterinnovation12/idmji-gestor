'use client'

export default function HistorialLayout({ children }: { children: React.ReactNode }) {
    // Las pestañas Lecturas/Temas Alabanza ahora se renderizan DENTRO de cada
    // sub-página (debajo de su PageHero) mediante <HistorialTabs />.
    return <div className="ofrenda-liquid-scope space-y-4 sm:space-y-6">{children}</div>
}
