/**
 * Genera los assets de arranque e instalación PWA (todos con el badge dorado):
 *  - public/splash/splash-iphone.png : fondo navy + logo dentro de un marco
 *    dorado (mismo estilo que el badge del logo en los PNG exportados).
 *  - public/icons/icon-{152,167,180}x{...}.png : apple-touch-icons full-bleed
 *    (marco dorado hasta el borde; iOS redondea las esquinas por su cuenta).
 *  - public/icons/icon-{192,512}x{...}.png : iconos "any" del manifest, badge
 *    redondeado con transparencia fuera (el splash de Android los pinta
 *    flotando sobre background_color navy).
 *  - public/icons/icon-maskable-512x512.png : fondo navy full-bleed + badge
 *    centrado dentro de la zona segura.
 *
 * Ejecutar: node scripts/generate-splash.js
 *
 * IMPORTANTE: la geometría del badge está duplicada de src/app/splashLayout.ts
 * (computeSplashBadgeLayout) y los colores de SPLASH_BG/SPLASH_GOLD. Mantener
 * en sync — pwa-config.test.ts muestrea los PNG y falla si divergen.
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const PUBLIC = path.join(__dirname, '..', 'public')
const LOGO = path.join(PUBLIC, 'logo.jpg')
const SPLASH_OUTPUT = path.join(PUBLIC, 'splash', 'splash-iphone.png')

const WIDTH = 1290
const HEIGHT = 2796

/** Navy institucional (= manifest background_color y splash in-app). */
const BG_COLOR = '#1f2e85'
/** Interior del badge (aro entre marco dorado y logo). */
const INNER_COLOR = '#ffffff'

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

/** SVG del marco dorado con interior blanco. radius=0 → full-bleed (iOS). */
function badgeSvg({ size, rim, radius, innerRadius }) {
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
  <rect x="${rim}" y="${rim}" width="${inner}" height="${inner}" rx="${innerRadius}" ry="${innerRadius}" fill="${INNER_COLOR}"/>
</svg>`,
    )
}

/** Compone un badge dorado (marco + interior + logo) como PNG con alpha. */
async function renderBadgePng({ size, rim, radius }) {
    const innerRadius = Math.max(0, radius - rim)
    const innerPad = rim + Math.round(size * 0.06)
    const logoSize = size - innerPad * 2
    const badge = await sharp(badgeSvg({ size, rim, radius, innerRadius })).png().toBuffer()
    const logo = await sharp(LOGO)
        .resize(logoSize, logoSize, { fit: 'contain', background: INNER_COLOR })
        .toBuffer()
    return sharp(badge)
        .composite([{ input: logo, left: innerPad, top: innerPad }])
        .png()
        .toBuffer()
}

async function generateSplash() {
    const layout = computeSplashBadgeLayout(WIDTH, HEIGHT)

    const logoResized = await sharp(LOGO)
        .resize(layout.logo.size, layout.logo.size, {
            fit: 'contain',
            background: INNER_COLOR,
        })
        .toBuffer()

    const badge = await sharp(badgeSvg(layout)).png().toBuffer()

    fs.mkdirSync(path.dirname(SPLASH_OUTPUT), { recursive: true })

    await sharp({
        create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG_COLOR },
    })
        .composite([
            { input: badge, left: layout.left, top: layout.top },
            { input: logoResized, left: layout.logo.left, top: layout.logo.top },
        ])
        .png()
        .toFile(SPLASH_OUTPUT)

    console.log(
        `Splash: ${SPLASH_OUTPUT} (${WIDTH}x${HEIGHT}, badge ${layout.size}px rim ${layout.rim}px @ ${layout.left},${layout.top})`,
    )
}

/**
 * Apple-touch-icons (152/167/180): marco dorado full-bleed, sin transparencia
 * (iOS aplica su propia máscara de esquinas; el dorado llega hasta el borde).
 */
async function generateAppleIcons() {
    for (const s of [152, 167, 180]) {
        const out = path.join(PUBLIC, 'icons', `icon-${s}x${s}.png`)
        const rim = Math.max(4, Math.round(s * 0.05))
        const png = await renderBadgePng({ size: s, rim, radius: 0 })
        await sharp(png).png().toFile(out)
        console.log(`Icono Apple: ${out} (${s}x${s})`)
    }
}

/**
 * Iconos "any" del manifest (192/512): badge dorado redondeado con
 * transparencia fuera. El splash de Android los muestra flotando sobre el
 * background_color navy → misma imagen que el splash in-app.
 */
async function generateManifestIcons() {
    for (const s of [192, 512]) {
        const out = path.join(PUBLIC, 'icons', `icon-${s}x${s}.png`)
        const rim = Math.max(5, Math.round(s * 0.035))
        const radius = Math.round(s * 0.16)
        const png = await renderBadgePng({ size: s, rim, radius })
        await sharp(png).png().toFile(out)
        console.log(`Icono manifest: ${out} (${s}x${s})`)
    }
}

/**
 * Icono maskable (512): navy full-bleed + badge centrado dentro de la zona
 * segura (círculo de diámetro 80% → badge al 58% del lado).
 */
async function generateMaskableIcon() {
    const s = 512
    const out = path.join(PUBLIC, 'icons', `icon-maskable-${s}x${s}.png`)
    const badgeSize = Math.round(s * 0.58)
    const rim = Math.max(5, Math.round(badgeSize * 0.035))
    const radius = Math.round(badgeSize * 0.16)
    const badge = await renderBadgePng({ size: badgeSize, rim, radius })
    const offset = Math.round((s - badgeSize) / 2)
    await sharp({
        create: { width: s, height: s, channels: 4, background: BG_COLOR },
    })
        .composite([{ input: badge, left: offset, top: offset }])
        .png()
        .toFile(out)
    console.log(`Icono maskable: ${out} (${s}x${s})`)
}

async function main() {
    if (!fs.existsSync(LOGO)) {
        console.error('No se encuentra logo.jpg en public/')
        process.exit(1)
    }
    await generateSplash()
    await generateAppleIcons()
    await generateManifestIcons()
    await generateMaskableIcon()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
