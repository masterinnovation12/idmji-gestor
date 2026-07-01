import { describe, it, expect } from 'vitest'
import { translations } from './translations'
import type { TranslationKey } from './types'

/**
 * QA de qualitat del català (ca-ES).
 *
 * Context: un parlant nadiu va detectar "Alabança" (castellanisme) on hauria de dir
 * "Lloança". Aquests tests blinden la qualitat del català perquè no tornin a colar-se
 * castellanismes ni cadenes sense traduir.
 *
 * Normativa aplicada (DIEC2 / IEC):
 *  - "alabar/alabança" són castellanismes → verb "lloar", nom "lloança".
 *  - "coro/coros" → "cor/cors".
 *  - "ofrenda" → "ofrena"; "ofrendario" → "ofrenador".
 *  - El català no fa servir "ñ" (usa "ny") ni terminacions "-ción/-ciones" (usa "-ció/-cions").
 */

const ca = translations['ca-ES'] as Record<TranslationKey, string>
const es = translations['es-ES'] as Record<TranslationKey, string>

describe('qualitat català — sense castellanismes', () => {
    const markers: Array<{ label: string; re: RegExp }> = [
        { label: 'ñ (el català usa "ny")', re: /ñ/ },
        { label: 'alabanza/alabança (→ lloança)', re: /alaban[zç]a/i },
        { label: 'coro/coros (→ cor/cors)', re: /\bcoros?\b/i },
        { label: 'ofrenda (→ ofrena)', re: /\bofrenda\b/i },
        { label: 'ofrendario (→ ofrenador)', re: /ofrendario/i },
        { label: '-ción (→ -ció)', re: /ción/i },
        { label: '-ciones (→ -cions)', re: /ciones/i },
    ]

    for (const { label, re } of markers) {
        it(`cap valor ca-ES conté castellanisme: ${label}`, () => {
            const hits = (Object.keys(ca) as TranslationKey[])
                .filter((k) => re.test(ca[k]))
                .map((k) => `${k} = "${ca[k]}"`)
            expect(hits, `Castellanisme «${label}» a:\n${hits.join('\n')}`).toEqual([])
        })
    }
})

describe('qualitat català — termes de domini correctes', () => {
    const expected: Array<[TranslationKey, string]> = [
        ['culto.alabanza', 'Lloança'],
        ['calendar.typeAlabanza', 'Lloança'],
        ['calendar.legend.alabanza', 'Lloança'],
        ['temasAlabanza.title', 'Temes Lloança'],
        ['nav.temasAlabanza', 'Temes Lloança'],
        ['dashboard.himnario.timeAlabanza', 'Himnari Lloança'],
        ['culto.ensenanza', 'Ensenyament'],
        ['culto.estudio', 'Estudi Bíblic'],
        ['culto.testimonios', 'Testimonis'],
        ['dashboard.greeting.brother', 'Germà'],
        ['nav.himnario', 'Himnari'],
        ['himnario.tabsCoros', 'Cors'],
        ['audit.type.chorus', 'Cor'],
        ['dashboard.ofrenda', 'Labors'],
        ['nav.ofrenda', 'Labors'],
        ['ofrenda.plano.rol.ofrendario', 'Ofrenador'],
    ]

    for (const [key, value] of expected) {
        it(`${key} === "${value}"`, () => {
            expect(ca[key]).toBe(value)
        })
    }
})

describe('qualitat català — guarda de cadenes sense traduir', () => {
    /**
     * Claus on ca-ES === es-ES de forma LEGÍTIMA: cognats idèntics ("Error", "Editar"),
     * abreviatures ("Intro", "Test"), marques ("WhatsApp", "Google Calendar"), símbols
     * ("—", "Nº", "2D") i noms propis. Si afegeixes una clau nova on el català coincideix
     * amb el castellà de manera intencionada, afegeix-la aquí; si no, tradueix-la.
     */
    const ALLOWED_IDENTICAL = new Set<string>([
        'admin.stats.finalShort', 'admin.stats.introShort', 'admin.stats.testimoniesShort',
        'archivos.filter.label', 'archivos.sort.colAsc', 'archivos.sort.colDesc', 'archivos.sort.sortLabel',
        'audit.export', 'audit.system', 'audit.type.reading',
        'calendar.generate', 'calendar.prev', 'calendar.prevMonth', 'calendar.reading', 'calendar.responsible',
        'calendar.today', 'calendar.viewLabel', 'calendar.viewMonth', 'calendar.viewMonthDesc',
        'common.appName', 'common.delete', 'common.edit', 'common.error',
        'common.previous', 'common.confirm', 'common.apply', 'common.prevShort', 'common.total',
        'common.language.ariaSelectCa', 'common.language.nameCa',
        'bibleManager.repeated', // "Repetida" — vàlid en ambdues llengües
        'culto.detail.inicioAnticipado.placeholderMin', 'culto.protocol.noPray', 'culto.protocol.yesPray',
        'cultos.role.final', 'cultos.role.intro',
        'dashboard.calendarExport.apple', 'dashboard.calendarExport.google', 'dashboard.calendarExport.outlook',
        'dashboard.himnario.editReading', // "Editar lectura" — vàlid en ambdues llengües
        'dashboard.himnario.reading', 'dashboard.himnario.registered', 'dashboard.no', 'dashboard.welcome.mobile', 'dashboard.yes',
        'festivos.type.local', 'festivos.type.nacional',
        'hermanos.filterAdmin', 'hermanos.filterEditor',
        'himnario.calculator', 'himnario.confirm', 'himnario.tableNumber',
        'instrucciones.of',
        'lecturas.chapterHistoryCancel', 'lecturas.chapterHistoryContinue', 'lecturas.deleteTitle',
        'lecturas.detailsEliminar', 'lecturas.detailsLector', 'lecturas.export', 'lecturas.exportCSV',
        'lecturas.exportExcel', 'lecturas.exportPDF', 'lecturas.filtersLector', 'lecturas.groupByLector',
        'lecturas.groupByMonth', 'lecturas.previous', 'lecturas.share', 'lecturas.shareUrl', 'lecturas.view',
        'nav.historial',
        'notifications.activate', 'notifications.deactivate', 'notifications.prompt.activate',
        'ofrenda.deletePlan.yes', 'ofrenda.export.badge.vector', 'ofrenda.export.badge.whatsapp',
        'ofrenda.export.officialSite', 'ofrenda.export.previewOpen', 'ofrenda.export.share.btn',
        'ofrenda.feedback.error', 'ofrenda.month.10', 'ofrenda.month.4', 'ofrenda.month.prev',
        'ofrenda.people.deleteYes', 'ofrenda.people.importModal.importBtn', 'ofrenda.people.importShort',
        'ofrenda.people.legend.total', 'ofrenda.plano.blockEdit.save', 'ofrenda.plano.confirm',
        'ofrenda.roles.realiza', // "Coordinador" — vàlid idèntic en ambdues llengües
        'ofrenda.plano.exportPng', 'ofrenda.plano.tabla.rol', 'ofrenda.plano.vista2d', 'ofrenda.plano.vista3d',
        'ofrenda.plano.personas.filters.results', 'ofrenda.plano.personas.export.btn',
        'ofrenda.plano.personas.export.colName',
        'ofrenda.planoGenerate.weekPicker.iso',
        'ofrenda.regenerate', 'ofrenda.tabs.export', 'ofrenda.week.short',
        'profile.draftBar.discard', 'profile.language',
        'pwa.iosStep2', 'pwa.share',
        'temasAlabanza.filtersTema', 'temasAlabanza.noLectura', 'temasAlabanza.previous', 'temasAlabanza.statsTotal',
        'temasAlabanza.tableLectura', 'temasAlabanza.tableTema',
        'users.admins', 'users.form.email', 'users.form.emailDomain', 'users.form.role', 'users.form.selectRole',
    ])

    it('no hi ha cadenes ca-ES sense traduir fora de l\'allowlist', () => {
        const untranslated = (Object.keys(ca) as TranslationKey[])
            .filter((k) => ca[k] === es[k] && !ALLOWED_IDENTICAL.has(k))
            .map((k) => `${k} = "${ca[k]}"`)
        expect(
            untranslated,
            `Aquestes claus tenen el mateix valor en ca i es. Tradueix-les al català o, si és un cognat/marca legítim, afegeix-les a ALLOWED_IDENTICAL:\n${untranslated.join('\n')}`,
        ).toEqual([])
    })

    it('l\'allowlist no té entrades obsoletes (totes segueixen sent idèntiques)', () => {
        const stale = [...ALLOWED_IDENTICAL].filter((k) => ca[k as TranslationKey] !== es[k as TranslationKey])
        expect(stale, `Treu de ALLOWED_IDENTICAL (ja no són idèntiques):\n${stale.join('\n')}`).toEqual([])
    })
})
