'use client'

import { ChevronRight } from 'lucide-react'
import type { SheetSourceId } from '@/lib/csv-sheets'
import type { DateColResult } from '@/app/dashboard/archivos/archivos-helpers'
import { pickPrimaryColumn } from '@/app/dashboard/archivos/archivos-helpers'
import { getDateDisplay, DATE_COL_KEYS, prettyKey } from '@/app/dashboard/archivos/archivos-data'
import { HighlightText } from './HighlightText'

type RowCardProps = Readonly<{
  row: Record<string, string>
  columns: readonly string[]
  dateInfo: DateColResult
  tabId: SheetSourceId
  accentBg: string
  accentText: string
  onClick: () => void
  searchQuery?: string
}>

/**
 * Card para vista mobile: muestra badge de fecha, título principal
 * y hasta 3 campos secundarios.
 */
export function RowCard({
  row,
  columns,
  dateInfo,
  tabId,
  accentBg,
  accentText,
  onClick,
  searchQuery = '',
}: RowCardProps) {
  const dateVal = getDateDisplay(row, dateInfo)
  const dateCols = DATE_COL_KEYS(dateInfo)
  const primaryCol = pickPrimaryColumn(columns, dateCols, tabId)
  const restCols = columns.filter((c) => !dateCols.includes(c) && c !== primaryCol)

  const primaryVal = primaryCol ? row[primaryCol] : ''
  const dateParts = dateVal?.split('/') ?? []
  const hasSlashDate = dateParts.length >= 3

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="archivo-card"
      aria-label={primaryVal ? `Ver detalle: ${String(primaryVal).slice(0, 50)}` : 'Ver detalle del registro'}
      className="w-full text-left p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors group touch-manipulation"
    >
      <div className="flex items-start gap-3">
        {/* Date badge */}
        {dateVal && (
          <div className={`shrink-0 rounded-xl ${accentBg} px-2.5 py-1.5 text-center min-w-[52px]`}>
            {hasSlashDate ? (
              <>
                <div className={`text-xs font-bold ${accentText} leading-tight`}>
                  {dateParts.slice(0, 2).join('/')}
                </div>
                <div className={`text-[10px] ${accentText} opacity-70`}>{dateParts[2]}</div>
              </>
            ) : (
              <div className={`text-xs font-bold ${accentText} leading-tight`}>{dateVal}</div>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {primaryCol && (
            <div className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
              <HighlightText text={row[primaryCol] || '—'} query={searchQuery} />
            </div>
          )}
          {restCols.slice(0, 3).map((col) => (
            row[col] ? (
              <div key={col} className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{prettyKey(col)}:</span>{' '}
                <HighlightText text={row[col]} query={searchQuery} />
              </div>
            ) : null
          ))}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
      </div>
    </button>
  )
}
