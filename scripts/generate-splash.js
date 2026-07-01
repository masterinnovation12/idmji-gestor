/**
 * Genera los assets de arranque PWA:
 *  - public/splash/splash-iphone.png : fondo blanco + logo dentro de un marco
 *    dorado (mismo estilo que el badge del logo en los PNG exportados).
 *  - public/icons/icon-{152,167,180}x{...}.png : apple-touch-icons que faltaban.
 *
 * Ejecutar: node scripts/generate-splash.js
 *
 * IMPORTANTE: la geometría del badge está duplicada de src/app/splashLayout.ts
 * (computeSplashBadgeLayout). Mantener ambas en sync — pwa-config.test.ts
 * muestrea el PNG y falla si divergen.
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const PUBLIC = path.join(__dirname, '..', 'public')
const LOGO = path.join(PUBLIC, 'logo.jpg')
const OUTPUT = path.join(PUBLIC, 'splash', 'splash-iphone.png')

const WIDTH = 1290
const HEIGHT = 2796
const BG_COLOR = '#ffffff'

const GOLD = {
    deep: '#b68f2f',
    light: '#d4b86a',
    shine: '#e3cc92',
}

// Mantener en sync con computeSplashBadgeLayout() de src/app/splashLayout.ts
function computeSplashBadgeLayout(width, height) {
    const shortSide = Math.min(width, height)
    const size = Math.round(Math.min(shortSide * 0.46, height * 0.28))
    const rim = Math.max(6, Math.round(size * 0.035))
    const radius = Math.round(size * 0.16)
    const innerRadius = Math.max(0, radius - rim)
    const innerPad = rim + Math.round(size * 0.06)
    const logoSize = size - innerPad * 2
    const left = Math.round((width - size) / 2)
    const top = Math.round((height - size) / 2)
    return {
        size,
        left,
        top,
        rim,
        radius,
        innerRadius,
        innerPad,
        logo: { left: left + innerPad, top: top + innerPad, size: logoSize },
    }
}

function badgeSvg(layout) {
    const { size, rim, radius, innerRadius } = layout
    const inner = size - rim * 2
    return Buffer.from(
        `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GOLD.deep}"/>
      <stop offset="42%" stop-color="${GOLD.shine}"/>
      <stop offset="58%" stop-color="${GOLD.light}"/>
      <stop offset="100%" stop-color="${GOLD.deep}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#gold)"/>
  <rect x="${rim}" y="${rim}" width="${inner}" height="${inner}" rx="${innerRadius}" ry="${innerRadius}" fill="#ffffff"/>
</svg>`,
    )
}

async function generateSplash() {
    const layout = computeSplashBadgeLayout(WIDTH, HEIGHT)

    const logoResized = await sharp(LOGO)
        .resize(layout.logo.size, layout.logo.size, {
            fit: 'contain',
            background: BG_COLOR,
        })
        .toBuffer()

    const badge = await sharp(badgeSvg(layout)).png().toBuffer()

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })

    await sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG_COLOR },
    })
        .composite([
            { input: badge, left: layout.left, top: layout.top },
            { input: logoResized, left: layout.logo.left, top: layout.logo.top },
        ])
        .png()
        .toFile(OUTPUT)

    console.log(
        `Splash: ${OUTPUT} (${WIDTH}x${HEIGHT}, badge ${layout.size}px rim ${layout.rim}px @ ${layout.left},${layout.top})`,
    )
}

/** Apple-touch-icons que referencia layout.tsx: logo sobre fondo blanco. */
async function generateAppleIcons() {
    const sizes = [152, 167, 180]
    for (const s of sizes) {
        const out = path.join(PUBLIC, 'icons', `icon-${s}x${s}.png`)
        const pad = Math.round(s * 0.1)
        const logo = await sharp(LOGO)
            .resize(s - pad * 2, s - pad * 2, { fit: 'contain', background: BG_COLOR })
            .toBuffer()
        await sharp({
            create: { width: s, height: s, channels: 4, background: BG_COLOR },
        })
            .composite([{ input: logo, left: pad, top: pad }])
            .png()
            .toFile(out)
        console.log(`Icono Apple: ${out} (${s}x${s})`)
    }
}

async function main() {
    if (!fs.existsSync(LOGO)) {
        console.error('No se encuentra logo.jpg en public/')
        process.exit(1)
    }
    await generateSplash()
    await generateAppleIcons()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
