#!/usr/bin/env node
/**
 * Detector de texto hardcodeado sin traducir.
 *
 * Escanea los .tsx de src/ y falla (exit 1) si encuentra texto visible para el usuario
 * que NO pasa por i18n:
 *   - aria-label / placeholder / title / alt con cadena literal
 *   - texto JSX visible que parece castellano (acentos/¿¡ o palabras función)
 *
 * Excepciones:
 *   - archivos *.test.tsx / *.spec.tsx
 *   - rutas en ALLOWLIST_FILES (p. ej. Server Components que no pueden usar useI18n)
 *   - líneas con el comentario  // i18n-ignore
 *
 * Uso:  node scripts/check-i18n-hardcoded.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

// Server Components / casos aceptados donde i18n cliente no aplica.
const ALLOWLIST_FILES = new Set([
    'src/app/dashboard/page.tsx', // fallback de error server-side (ver CLAUDE.md)
])

const ATTR_RE = /\b(?:aria-label|placeholder|title|alt)\s*=\s*"([^"]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^"]*)"/g
const JSX_TEXT_RE = />\s*([^<>{}\n]*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^<>{}\n]*?)\s*</g
const SPANISH_HINT = /[áéíóúñ¿¡]|(?:^|\s)(?:de|del|la|el|los|las|un|una|para|por|con|sin|según|cada|tu|aquí|este|esta|hay|sí|añadir|guardar|eliminar|buscar|cargando|fecha|hermano|culto|lectura)(?:\s|$)/i

function walk(dir) {
    const out = []
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        const st = statSync(p)
        if (st.isDirectory()) out.push(...walk(p))
        else if (name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(name)) out.push(p)
    }
    return out
}

const findings = []

for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    if (ALLOWLIST_FILES.has(rel)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)

    lines.forEach((line, i) => {
        if (line.includes('i18n-ignore')) return

        for (const m of line.matchAll(ATTR_RE)) {
            const text = m[1].trim()
            if (text.includes('IDMJI')) continue // marca; idéntica en ambos idiomas
            findings.push({ rel, line: i + 1, kind: 'attr', text })
        }
        for (const m of line.matchAll(JSX_TEXT_RE)) {
            const text = m[1].trim()
            if (text.length < 3) continue
            if (!SPANISH_HINT.test(text)) continue // solo lo que parece castellano
            if (/^[A-Z0-9 ./_-]+$/.test(text)) continue // siglas/constantes ASCII mayúsculas
            findings.push({ rel, line: i + 1, kind: 'text', text })
        }
    })
}

if (findings.length === 0) {
    console.log('✅ Sin texto hardcodeado: todo el texto visible pasa por i18n.')
    process.exit(0)
}

console.error(`❌ ${findings.length} cadena(s) hardcodeada(s) sin traducir (usa t('clave') + claves ES/CA):\n`)
for (const f of findings) {
    console.error(`  ${f.rel}:${f.line}  [${f.kind}]  ${JSON.stringify(f.text)}`)
}
console.error('\nVer la regla i18n en CLAUDE.md. Si es una excepción legítima, añade el comentario // i18n-ignore en la línea.')
process.exit(1)
