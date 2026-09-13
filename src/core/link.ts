/**
 * Link handling: what the user typed -> what actually gets encoded.
 *
 * The panel encodes *anything* (a QR code is happy with plain text), but it
 * tells the user what it decided to do, so a typo never silently becomes a
 * QR code for the wrong thing.
 */

export type LinkKind =
  /** Nothing to encode yet. */
  | 'empty'
  /** Parsed as an absolute URL exactly as typed. */
  | 'url'
  /** Looked like a bare host, so `https://` was added. */
  | 'coerced'
  /** Not a URL. Encoded as plain text. */
  | 'text'

export interface ResolvedLink {
  /** The string that will be encoded. */
  value: string
  kind: LinkKind
  /** Tracking params removed from `value`, in the order they were found. */
  removed: string[]
}

/** Looks like `example.com`, `localhost:5173/x`, an IPv4 address, or `[::1]`. */
const BARE_NAMED_HOST = /^(?:localhost|(?:[\w-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#]|$)/i
const BARE_IPV4 = /^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#]|$)/
const BARE_IPV6 = /^\[[0-9a-f:.]+\](?::\d+)?(?:[/?#]|$)/i

/**
 * Query keys that only exist to track the person who follows the link.
 * Dropping them makes the URL shorter, which makes the QR code sparser and
 * quicker to scan.
 */
const TRACKING_KEYS: readonly (string | RegExp)[] = [
  /^utm_/i,
  /^pk_/i, // Matomo
  /^mc_/i, // Mailchimp
  /^ref_/i,
  '_hsenc',
  '_hsmi',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'msclkid',
  'twclid',
  'igshid',
  'ttclid',
  'yclid',
  'mkt_tok',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'wickedid',
  's_kwcid',
  'si', // YouTube share id
  'ref_src',
  'ref_url',
  'spm',
  'scm',
]

export function isTrackingKey(key: string): boolean {
  return TRACKING_KEYS.some((rule) =>
    typeof rule === 'string' ? rule.toLowerCase() === key.toLowerCase() : rule.test(key),
  )
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/i

function isBareHost(raw: string): boolean {
  if (BARE_NAMED_HOST.test(raw) || BARE_IPV6.test(raw)) return true
  const ipv4 = BARE_IPV4.exec(raw)?.[1]
  return ipv4 !== undefined && ipv4.split('.').every((part) => Number(part) <= 255)
}

function isIpAddress(raw: string): boolean {
  return BARE_IPV4.test(raw) || BARE_IPV6.test(raw)
}

interface Parsed {
  url: URL
  kind: Exclude<LinkKind, 'empty' | 'text'>
  /** The string to encode when nothing needed rewriting. */
  literal: string
}

function parse(raw: string): Parsed | null {
  // Bare hosts are checked first: `localhost:5173/x` and `example.com:8080/x`
  // both parse as URLs with a nonsense scheme otherwise.
  if (isBareHost(raw)) {
    // A dev server is almost never on https, and a phone would show a
    // certificate warning if we guessed wrong.
    const scheme = LOOPBACK.test(raw) || isIpAddress(raw) ? 'http' : 'https'
    try {
      const literal = `${scheme}://${raw}`
      return { url: new URL(literal), kind: 'coerced', literal }
    } catch {
      return null
    }
  }
  try {
    const url = new URL(raw)
    // `C:\path` parses as a URL with protocol `c:` — not something to encode as a link.
    if (url.protocol.length <= 2) return null
    return { url, kind: 'url', literal: raw }
  } catch {
    return null
  }
}

/** True for addresses that only resolve on the machine you are sitting at. */
export function isLoopback(value: string): boolean {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  } catch {
    return false
  }
}

/**
 * Resolve raw input into the exact string to encode.
 *
 * @param raw  Whatever is in the text field.
 * @param clean  Strip tracking parameters from URLs.
 */
export function resolveLink(raw: string, clean = false): ResolvedLink {
  const trimmed = raw.trim()
  if (!trimmed) return { value: '', kind: 'empty', removed: [] }

  const parsed = parse(trimmed)
  if (!parsed) return { value: trimmed, kind: 'text', removed: [] }

  const { url, kind, literal } = parsed
  const removed: string[] = []

  if (clean && url.searchParams.size > 0) {
    for (const key of new Set(url.searchParams.keys())) {
      if (isTrackingKey(key)) {
        url.searchParams.delete(key)
        removed.push(key)
      }
    }
    if (url.searchParams.size === 0) url.search = ''
  }

  // `URL.href` re-encodes and appends a trailing `/` to bare origins. Keep the
  // literal string when nothing was rewritten, so what they see is what they
  // get — and so the encoded data stays as short as possible.
  const value = removed.length === 0 ? literal : url.href
  return { value, kind, removed }
}

/** Pages with no shareable address (browser UI, local files, extension pages). */
export function isInternalPage(url: string | undefined): boolean {
  if (!url) return false
  return /^(chrome|edge|about|moz-extension|chrome-extension|safari-web-extension|view-source|devtools|file):/i.test(
    url,
  )
}
