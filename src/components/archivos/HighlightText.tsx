'use client'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resalta las coincidencias de `query` en `text` con un background amarillo.
 */
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text || '—'}</>
  const pattern = escapeRegex(query.trim())
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200/90 dark:bg-yellow-500/30 text-foreground rounded-[3px] px-0.5 not-italic font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
