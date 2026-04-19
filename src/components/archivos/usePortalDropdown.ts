'use client'

import { useState, useRef, useEffect } from 'react'

export type PortalRect = { top: number; left: number; minWidth: number }

/**
 * Hook compartido para abrir dropdowns posicionados via portal.
 */
export function usePortalDropdown() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<PortalRect | null>(null)

  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setRect({ top: r.bottom + 6, left: r.left, minWidth: Math.max(r.width, 200) })
    } else {
      setRect(null)
    }
  }, [open])

  return { open, setOpen, triggerRef, rect }
}
