import type { SheetSourceId } from '@/lib/csv-sheets'

/** Configuración visual de cada pestaña. */
export type TabConfig = {
  id: SheetSourceId
  labelKey: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  activeBg: string
}
