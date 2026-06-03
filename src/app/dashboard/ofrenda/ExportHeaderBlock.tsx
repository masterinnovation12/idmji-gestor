import type { OfrendaExportLabels } from './ofrendaLocale'
import { IDMJI_BRAND } from './exportBrand'
import { buildExportLegend } from './exportHeaderShared'
import {
    EXPORT_HEADER_CLUSTER_TEST_ID,
    EXPORT_HEADER_ROOT_TEST_ID,
    EXPORT_HEADER_TEXT_TEST_ID,
} from './exportHeaderLayout'

export interface ExportHeaderBlockProps {
    labels: OfrendaExportLabels
    /** Ej. «Mayo 2026» (sin duplicar año). */
    periodLabel: string
    /** Semanal: «Semana 1 de 4 · 7 – 10 may». */
    periodSubtitle?: string
}

/**
 * Cabecera premium centrada (captura PNG). PDF replica en drawExportPdfHeader.
 */
export function ExportHeaderBlock({
    labels,
    periodLabel,
    periodSubtitle,
}: Readonly<ExportHeaderBlockProps>) {
    const legend = buildExportLegend(labels)
    const hasWeekBadge = Boolean(periodSubtitle)

    return (
        <div
            data-testid={EXPORT_HEADER_ROOT_TEST_ID}
            style={{
                position: 'relative',
                background: IDMJI_BRAND.headerGradient,
                padding: hasWeekBadge ? '28px 32px 24px' : '28px 32px 26px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        >
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 55%)',
                    pointerEvents: 'none',
                }}
            />

            <div
                data-testid={EXPORT_HEADER_CLUSTER_TEST_ID}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 24,
                    maxWidth: '100%',
                }}
            >
                <div
                    style={{
                        width: 92,
                        height: 92,
                        flexShrink: 0,
                        borderRadius: 14,
                        padding: 3,
                        background: IDMJI_BRAND.goldGradient,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.12)',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 11,
                            backgroundColor: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.jpg"
                            alt="IDMJI"
                            style={{ width: 80, height: 80, objectFit: 'contain' }}
                        />
                    </div>
                </div>

                <div
                    data-testid={EXPORT_HEADER_TEXT_TEST_ID}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: '#E8D9A8',
                            marginBottom: 10,
                            lineHeight: 1.35,
                            maxWidth: 520,
                        }}
                    >
                        {labels.churchName}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '6px 14px',
                        }}
                    >
                        <h1
                            style={{
                                margin: 0,
                                fontSize: 32,
                                fontWeight: 800,
                                letterSpacing: '-0.03em',
                                color: IDMJI_BRAND.textOnNavy,
                                lineHeight: 1.1,
                            }}
                        >
                            {labels.titleDoc}
                        </h1>
                        <span
                            style={{
                                fontSize: 22,
                                fontWeight: 600,
                                color: IDMJI_BRAND.goldLight,
                                letterSpacing: '-0.01em',
                                paddingLeft: 14,
                                borderLeft: `2px solid rgba(212, 184, 106, 0.65)`,
                                lineHeight: 1.2,
                            }}
                        >
                            {periodLabel}
                        </span>
                    </div>

                    {periodSubtitle ? (
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 12,
                                padding: '6px 14px',
                                borderRadius: 999,
                                background: 'rgba(255,255,255,0.11)',
                                border: '1px solid rgba(255,255,255,0.22)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.96)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {periodSubtitle}
                        </div>
                    ) : null}

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 10,
                            marginTop: hasWeekBadge ? 14 : 16,
                        }}
                    >
                        {legend.map(({ color, label }) => (
                            <div
                                key={label}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '5px 12px 5px 8px',
                                    borderRadius: 8,
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                }}
                            >
                                <div
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 4,
                                        backgroundColor: color,
                                        border: '1.5px solid rgba(255,255,255,0.45)',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                        flexShrink: 0,
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: 'rgba(255,255,255,0.92)',
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
