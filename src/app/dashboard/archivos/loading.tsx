/**
 * Loading skeleton para /dashboard/archivos.
 * Refleja la estructura real de la página: tabs + barra de búsqueda + tabla/cards.
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function ArchivosLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 pb-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-[140px]" />
          <Skeleton className="h-3 w-[220px]" />
        </div>
      </div>

      {/* Tabs grid 2x2 mobile / row desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-[44px] rounded-xl sm:w-[130px]" />
        ))}
      </div>

      {/* Search bar */}
      <Skeleton className="h-[46px] w-full rounded-xl" />

      {/* Filter + Sort row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-[40px] w-[100px] rounded-xl" />
        <Skeleton className="h-[40px] w-[110px] rounded-xl" />
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden sm:block rounded-2xl border border-border/50 overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-3.5 bg-muted/30 border-b border-border/60">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 rounded" />
          ))}
        </div>
        {/* Data rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border/20">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1 rounded" />
            ))}
          </div>
        ))}
        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border/30">
          <Skeleton className="h-3 w-[100px] rounded" />
        </div>
      </div>

      {/* Mobile cards skeleton */}
      <div className="sm:hidden rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <Skeleton className="w-[52px] h-[40px] rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
