/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
    measureExportNodeDimensions,
    releaseCaptureOverflow,
} from './exportCapture'
import { EXPORT_LAYOUT_MIN_PX } from './exportLayoutMetrics'

describe('exportCapture', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('measureExportNodeDimensions incluye altura explícita de hijos', () => {
        const root = document.createElement('div')
        root.style.width = '400px'
        root.style.height = '200px'
        root.style.overflow = 'hidden'

        const tall = document.createElement('div')
        tall.style.height = '900px'
        root.appendChild(tall)
        document.body.appendChild(root)

        const { height, width } = measureExportNodeDimensions(root, EXPORT_LAYOUT_MIN_PX)
        expect(width).toBeGreaterThanOrEqual(EXPORT_LAYOUT_MIN_PX)
        expect(height).toBeGreaterThanOrEqual(900)
    })

    it('releaseCaptureOverflow desbloquea ancestros hidden y restaura', () => {
        const outer = document.createElement('div')
        outer.style.overflow = 'hidden'
        const inner = document.createElement('div')
        outer.appendChild(inner)
        document.body.appendChild(outer)

        const restore = releaseCaptureOverflow(inner)
        expect(getComputedStyle(outer).overflow).toBe('visible')
        restore()
        expect(outer.style.overflow).toBe('hidden')
    })
})
