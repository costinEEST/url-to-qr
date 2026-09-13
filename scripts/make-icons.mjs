/**
 * Generates the extension icons.
 *
 * A dependency-free PNG encoder (zlib is in Node) keeps the promise that the
 * only runtime or build dependency in this repo is uqr.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../src/extension/public/icons')

/** 7×7 mark: three finder patterns, a little data, one signal-blue module. */
const MARK = [
  '###.###',
  '#.#.#.#',
  '###.###',
  '..#..#.',
  '###.*#*',
  '#.#..##',
  '###.#*#',
]

const INK = [0x00, 0x00, 0x00, 0xff]
const SIGNAL = [0x1f, 0x3f, 0xd8, 0xff]
const PLATE = [0xff, 0xff, 0xff, 0xff]

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** @param {Uint8Array} rgba RGBA pixels, row-major. */
function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size) {
  const pad = Math.max(1, Math.round(size / 16))
  const module = Math.floor((size - pad * 2) / 7)
  const offset = Math.round((size - module * 7) / 2)
  const radius = size / 5
  const pixels = new Uint8Array(size * size * 4)

  const put = (x, y, colour) => {
    const i = (y * size + x) * 4
    pixels.set(colour, i)
  }

  // Rounded white plate.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0)
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0)
      if (Math.hypot(dx, dy) <= radius) put(x, y, PLATE)
    }
  }

  // Modules.
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = MARK[row][col]
      if (cell === '.') continue
      const colour = cell === '*' ? SIGNAL : INK
      for (let y = 0; y < module; y++) {
        for (let x = 0; x < module; x++) {
          put(offset + col * module + x, offset + row * module + y, colour)
        }
      }
    }
  }

  return encodePng(size, size, pixels)
}

mkdirSync(outDir, { recursive: true })
for (const size of [16, 32, 48, 128]) {
  const file = resolve(outDir, `icon-${size}.png`)
  writeFileSync(file, drawIcon(size))
  console.log(`icons  ${size}×${size}  ${file.split('/').slice(-1)[0]}`)
}
