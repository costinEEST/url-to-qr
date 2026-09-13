import { describe, expect, it } from 'vitest'
import { isInternalPage, isLoopback, isTrackingKey, resolveLink } from '../src/core/link'

describe('resolveLink', () => {
  it('reports an empty field', () => {
    expect(resolveLink('   ')).toEqual({ value: '', kind: 'empty', removed: [] })
  })

  it('keeps an absolute URL byte for byte', () => {
    const raw = 'https://example.com/a/b?q=1#frag'
    expect(resolveLink(raw)).toMatchObject({ value: raw, kind: 'url' })
  })

  it('adds https to a bare host', () => {
    expect(resolveLink('example.com/pricing')).toMatchObject({
      value: 'https://example.com/pricing',
      kind: 'coerced',
    })
  })

  it('accepts localhost with a port, over http', () => {
    expect(resolveLink('localhost:5173/#/x')).toMatchObject({
      kind: 'coerced',
      value: 'http://localhost:5173/#/x',
    })
  })

  it('adds http to bare IPv4 and bracketed IPv6 addresses', () => {
    expect(resolveLink('192.168.1.20:5173/app')).toMatchObject({
      kind: 'coerced',
      value: 'http://192.168.1.20:5173/app',
    })
    expect(resolveLink('[2001:db8::1]:8080/app')).toMatchObject({
      kind: 'coerced',
      value: 'http://[2001:db8::1]:8080/app',
    })
  })

  it('does not accept invalid IPv4 addresses as hosts', () => {
    expect(resolveLink('999.168.1.20/path')).toMatchObject({ kind: 'text' })
  })

  it('does not read a host:port as a custom scheme', () => {
    expect(resolveLink('example.com:8080/x')).toMatchObject({
      kind: 'coerced',
      value: 'https://example.com:8080/x',
    })
  })

  it('leaves a bare origin without a trailing slash', () => {
    expect(resolveLink('example.com').value).toBe('https://example.com')
  })

  it('keeps non-http schemes that a phone can act on', () => {
    expect(resolveLink('mailto:hi@example.com')).toMatchObject({ kind: 'url' })
    expect(resolveLink('tel:+40721000000')).toMatchObject({ kind: 'url' })
    expect(resolveLink('WIFI:T:WPA;S:home;P:secret;;')).toMatchObject({ kind: 'url' })
  })

  it('falls back to plain text', () => {
    expect(resolveLink('hello there')).toMatchObject({ value: 'hello there', kind: 'text' })
  })

  it('does not treat a windows path as a link', () => {
    expect(resolveLink('C:\\Users\\costi\\notes.txt')).toMatchObject({ kind: 'text' })
  })

  it('leaves URLs alone unless cleaning is asked for', () => {
    const raw = 'https://example.com/?utm_source=x&id=7'
    expect(resolveLink(raw).value).toBe(raw)
    expect(resolveLink(raw).removed).toEqual([])
  })

  it('strips tracking parameters and keeps the rest', () => {
    const result = resolveLink(
      'https://example.com/post?utm_source=news&utm_medium=email&id=7&fbclid=abc',
      true,
    )
    expect(result.value).toBe('https://example.com/post?id=7')
    expect(result.removed).toEqual(['utm_source', 'utm_medium', 'fbclid'])
  })

  it('reports a repeated tracking key once while removing every value', () => {
    const result = resolveLink('https://example.com/?utm_source=a&utm_source=b&id=7', true)
    expect(result.value).toBe('https://example.com/?id=7')
    expect(result.removed).toEqual(['utm_source'])
  })

  it('drops the question mark when nothing survives cleaning', () => {
    expect(resolveLink('https://example.com/x?gclid=1', true).value).toBe('https://example.com/x')
  })

  it('never mangles text when cleaning is on', () => {
    expect(resolveLink('just words', true)).toMatchObject({ kind: 'text', removed: [] })
  })
})

describe('isTrackingKey', () => {
  it.each(['utm_campaign', 'UTM_Source', 'fbclid', 'mc_cid', 'mkt_tok'])('flags %s', (key) => {
    expect(isTrackingKey(key)).toBe(true)
  })

  it.each(['id', 'page', 'q', 'utmost'])('keeps %s', (key) => {
    expect(isTrackingKey(key)).toBe(false)
  })
})

describe('isLoopback', () => {
  it('flags addresses only the local machine can open', () => {
    expect(isLoopback('http://localhost:5173')).toBe(true)
    expect(isLoopback('http://127.0.0.1:8080/x')).toBe(true)
    expect(isLoopback('http://192.168.1.20:5173')).toBe(false)
    expect(isLoopback('not a url')).toBe(false)
  })
})

describe('isInternalPage', () => {
  it.each(['chrome://extensions', 'about:blank', 'edge://settings', 'file:///tmp/a.pdf'])(
    'rejects %s',
    (url) => expect(isInternalPage(url)).toBe(true),
  )

  it('accepts a real page', () => {
    expect(isInternalPage('https://example.com')).toBe(false)
    expect(isInternalPage(undefined)).toBe(false)
  })
})
