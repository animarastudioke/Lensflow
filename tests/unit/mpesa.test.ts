import { describe, expect, it } from 'vitest'
import { normalizeKenyanPhone } from '@/lib/payments/mpesa'

describe('normalizeKenyanPhone', () => {
  it('normalizes local 07XX/01XX format', () => {
    expect(normalizeKenyanPhone('0712345678')).toBe('254712345678')
    expect(normalizeKenyanPhone('0112345678')).toBe('254112345678')
  })

  it('normalizes already-international formats', () => {
    expect(normalizeKenyanPhone('254712345678')).toBe('254712345678')
    expect(normalizeKenyanPhone('+254712345678')).toBe('254712345678')
  })

  it('normalizes bare 9-digit subscriber numbers', () => {
    expect(normalizeKenyanPhone('712345678')).toBe('254712345678')
    expect(normalizeKenyanPhone('112345678')).toBe('254112345678')
  })

  it('strips formatting characters (spaces, dashes)', () => {
    expect(normalizeKenyanPhone('0712 345 678')).toBe('254712345678')
    expect(normalizeKenyanPhone('0712-345-678')).toBe('254712345678')
  })

  it('rejects numbers that are the wrong length or not Kenyan mobile prefixes', () => {
    expect(normalizeKenyanPhone('12345')).toBeNull()
    expect(normalizeKenyanPhone('254212345678')).toBeNull() // landline prefix, not 7xx/1xx
    expect(normalizeKenyanPhone('44712345678')).toBeNull() // UK country code, not 254
    expect(normalizeKenyanPhone('')).toBeNull()
  })
})
