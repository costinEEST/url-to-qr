/**
 * Everything that turns a string into pixels.
 *
 * The SVG is built with `createElementNS`, never `innerHTML`. Sites that set
 * `require-trusted-types-for 'script'` (Google, GitHub, many banks) throw on
 * HTML-injection sinks, and the bookmarklet has to survive on those pages.
 */
import { encode, renderSVG, type QrCodeGenerateResult } from 'uqr'

export type Ecc = 'L' | 'M' | 'Q' | 'H'

export const ECC_LEVELS: readonly Ecc[] = ['L', 'M', 'Q', 'H']

/**
 * Quiet zone in modules. The spec asks for 4; anything less gets flaky when a
 * phone camera has to separate the code from whatever is behind the window.
 */
export const QUIET_ZONE = 4

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface QrOptions {
  ecc?: Ecc
  /** Colour of the dark modules. Keep it dark: contrast is what scanners read. */
  dark?: string
  light?: string
}

export class QrTooLongError extends Error {
  override name = 'QrTooLongError'
}

/** Encode, converting uqr's capacity failure into something we can show. */
export function encodeLink(value: string, ecc: Ecc = 'M'): QrCodeGenerateResult {
  try {
    return encode(value, { ecc, border: QUIET_ZONE, boostEcc: false })
  } catch (cause) {
    throw new QrTooLongError('Data does not fit in a QR code', { cause })
  }
}

/**
 * One `<path>` for every dark module, as `M x y h1 v1 h-1 z` sub-paths.
 * Runs of adjacent modules are merged horizontally, which roughly halves the
 * path data compared to emitting a rect per module.
 */
export function matrixToPath(data: readonly (readonly boolean[])[]): string {
  const parts: string[] = []
  for (let y = 0; y < data.length; y++) {
    const row = data[y]!
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      let run = 1
      while (row[x + run]) run++
      parts.push(`M${x} ${y}h${run}v1h-${run}z`)
      x += run
    }
  }
  return parts.join('')
}

/** Build a standalone, scalable QR element. No innerHTML anywhere. */
export function createQrSvg(result: QrCodeGenerateResult, options: QrOptions = {}): SVGSVGElement {
  const { dark = '#000000', light = '#ffffff' } = options
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('viewBox', `0 0 ${result.size} ${result.size}`)
  svg.setAttribute('shape-rendering', 'crispEdges')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('role', 'img')

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('width', String(result.size))
  background.setAttribute('height', String(result.size))
  background.setAttribute('fill', light)
  svg.append(background)

  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('fill', dark)
  path.setAttribute('d', matrixToPath(result.data))
  svg.append(path)

  return svg
}

/** Serialisable SVG, for the download button. */
export function toSvgString(value: string, ecc: Ecc = 'M'): string {
  return renderSVG(value, { ecc, border: QUIET_ZONE, boostEcc: false, pixelSize: 8 })
}

/**
 * Rasterise to PNG. Drawn straight from the matrix rather than by loading the
 * SVG into an `<img>`, which would need a blob URL and trip `img-src` policies.
 */
export async function toPngBlob(
  result: QrCodeGenerateResult,
  targetPx = 1024,
  options: QrOptions = {},
): Promise<Blob> {
  const { dark = '#000000', light = '#ffffff' } = options
  const scale = Math.max(1, Math.round(targetPx / result.size))
  const side = result.size * scale
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser')

  ctx.fillStyle = light
  ctx.fillRect(0, 0, side, side)
  ctx.fillStyle = dark
  for (let y = 0; y < result.data.length; y++) {
    const row = result.data[y]!
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      let run = 1
      while (row[x + run]) run++
      ctx.fillRect(x * scale, y * scale, run * scale, scale)
      x += run
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
      'image/png',
    )
  })
}

/** A filename that says what it is without leaking the whole URL. */
export function suggestFilename(value: string, extension: string): string {
  let stem = 'qr-code'
  try {
    const { hostname, pathname } = new URL(value)
    const slug = `${hostname}${pathname}`.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
    if (slug) stem = slug.slice(0, 48)
  } catch {
    /* plain text: keep the default */
  }
  return `${stem}.${extension}`
}
