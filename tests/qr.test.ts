import { describe, expect, it } from 'vitest'
import {
  QUIET_ZONE,
  QrTooLongError,
  createQrSvg,
  encodeLink,
  matrixToPath,
  suggestFilename,
  toSvgString,
} from '../src/core/qr'

describe('encodeLink', () => {
  it('includes the quiet zone on both sides', () => {
    const result = encodeLink('https://example.com')
    const quietRows = [...result.data.slice(0, QUIET_ZONE), ...result.data.slice(-QUIET_ZONE)]
    expect(quietRows.every((row) => row.every((module) => module === false))).toBe(true)
    expect(
      result.data.every(
        (row) =>
          row.slice(0, QUIET_ZONE).every((module) => module === false) &&
          row.slice(-QUIET_ZONE).every((module) => module === false),
      ),
    ).toBe(true)
  })

  it('honours the selected correction level instead of silently boosting it', () => {
    const value = 'https://example.com'
    expect(encodeLink(value, 'L').data).not.toEqual(encodeLink(value, 'M').data)
  })

  it('produces a larger version for more data', () => {
    const small = encodeLink('https://a.co')
    const large = encodeLink(`https://a.co/${'x'.repeat(400)}`)
    expect(large.version).toBeGreaterThan(small.version)
  })

  it('raises a typed error when the data cannot fit', () => {
    expect(() => encodeLink('x'.repeat(5000), 'H')).toThrow(QrTooLongError)
  })
})

describe('matrixToPath', () => {
  it('merges horizontal runs into one sub-path', () => {
    expect(matrixToPath([[true, true, true]])).toBe('M0 0h3v1h-3z')
  })

  it('splits on gaps', () => {
    expect(matrixToPath([[true, false, true]])).toBe('M0 0h1v1h-1zM2 0h1v1h-1z')
  })

  it('returns nothing for an empty matrix', () => {
    expect(matrixToPath([[false, false]])).toBe('')
  })
})

describe('createQrSvg', () => {
  it('builds a square svg with a white plate and one path', () => {
    const result = encodeLink('https://example.com')
    const svg = createQrSvg(result)
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${result.size} ${result.size}`)
    expect(svg.querySelectorAll('rect')).toHaveLength(1)
    expect(svg.querySelector('path')?.getAttribute('d')).toContain('M')
  })

  it('never touches innerHTML, so Trusted Types pages stay happy', () => {
    // A structural assertion: every child came from createElementNS.
    const svg = createQrSvg(encodeLink('https://example.com'))
    for (const child of svg.children) {
      expect(child.namespaceURI).toBe('http://www.w3.org/2000/svg')
    }
  })
})

describe('toSvgString', () => {
  it('serialises something a file manager will preview', () => {
    const svg = toSvgString('https://example.com')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('</svg>')
  })
})

describe('suggestFilename', () => {
  it('names the file after the host and path', () => {
    expect(suggestFilename('https://example.com/blog/post', 'png')).toBe(
      'example.com-blog-post.png',
    )
  })

  it('falls back for plain text', () => {
    expect(suggestFilename('some note', 'svg')).toBe('qr-code.svg')
  })

  it('stays a sane length', () => {
    const name = suggestFilename(`https://example.com/${'a'.repeat(200)}`, 'png')
    expect(name.length).toBeLessThanOrEqual(52)
  })
})
