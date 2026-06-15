import React from 'react'

interface FormattedNoteProps {
    /** Texto plano con soporte de **negrita** y saltos de línea. */
    text: string
    className?: string
}

/**
 * Renderiza una nota de texto plano respetando los saltos de línea y
 * convirtiendo **dobles asteriscos** en negrita.
 *
 * No interpreta HTML: el texto se inserta como nodos de texto de React,
 * por lo que es seguro frente a inyección (XSS).
 */
export function FormattedNote({ text, className = '' }: Readonly<FormattedNoteProps>) {
    const parts = text.split(/(\*\*.+?\*\*)/g)
    return (
        <p className={`whitespace-pre-line wrap-break-word ${className}`}>
            {parts.map((part, i) =>
                part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i} className="font-black">{part.slice(2, -2)}</strong>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                )
            )}
        </p>
    )
}
