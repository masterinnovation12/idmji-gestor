/**
 * Genera splash-iphone.png: fondo blanco + logo centrado lo más grande posible.
 * Ejecutar: node scripts/generate-splash.js
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const PUBLIC = path.join(__dirname, '..', 'public')
const LOGO = path.join(PUBLIC, 'logo.jpg')
const OUTPUT = path.join(PUBLIC, 'splash', 'splash-iphone.png')

// Tamaño para iPhone Pro Max (1290x2796) - cubre la mayoría de dispositivos
const WIDTH = 1290
const HEIGHT = 2796
const BG_COLOR = '#ffffff'

async function main() {
  if (!fs.existsSync(LOGO)) {
    console.error('No se encuentra logo.jpg en public/')
    process.exit(1)
  }

  const logoMeta = await sharp(LOGO).metadata()
  const logoW = logoMeta.width || 1
  const logoH = logoMeta.height || 1

  // Logo ocupa ~70% del lado más corto (ancho) para máximo tamaño visible
  const maxLogoSize = Math.min(WIDTH * 0.7, HEIGHT * 0.5)
  const scale = maxLogoSize / Math.max(logoW, logoH)
  const newW = Math.round(logoW * scale)
  const newH = Math.round(logoH * scale)

  const logoResized = await sharp(LOGO)
    .resize(newW, newH, { fit: 'contain' })
    .toBuffer()

  const left = Math.round((WIDTH - newW) / 2)
  const top = Math.round((HEIGHT - newH) / 2)

  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: BG_COLOR,
    },
  })
    .composite([{ input: logoResized, left, top }])
    .png()
    .toFile(OUTPUT)

  console.log(`Splash generado: ${OUTPUT} (${WIDTH}x${HEIGHT}, logo ${newW}x${newH})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
