'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ActivePrompt = 'install' | 'notification' | null

interface PromptsContextValue {
  activePrompt: ActivePrompt
  setActivePrompt: (value: ActivePrompt) => void
  /** Llamar cuando el prompt de instalación se cierra (para dar paso al de notificaciones) */
  onInstallPromptClosed: () => void
}

const PromptsContext = createContext<PromptsContextValue | null>(null)

export function PromptsProvider(props: Readonly<{ children: ReactNode }>) {
  const [activePrompt, setActivePromptState] = useState<ActivePrompt>(null)

  const setActivePrompt = useCallback((value: ActivePrompt) => {
    setActivePromptState(value)
  }, [])

  const onInstallPromptClosed = useCallback(() => {
    setActivePromptState(null)
  }, [])

  const value = useMemo(
    () => ({ activePrompt, setActivePrompt, onInstallPromptClosed }),
    [activePrompt, setActivePrompt, onInstallPromptClosed]
  )

  return (
    <PromptsContext.Provider value={value}>
      {props.children}
    </PromptsContext.Provider>
  )
}

export function usePrompts() {
  const ctx = useContext(PromptsContext)
  if (!ctx) return null
  return ctx
}
