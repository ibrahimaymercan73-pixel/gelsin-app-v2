/**
 * Türkiye cep telefonu: E.164 benzeri 90 + 10 hane (örn. 905551234567)
 */

export function normalizeTrPhoneTo90(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) {
    const rest = digits.slice(2)
    if (rest.length === 10 && rest.startsWith('5')) return digits
    return null
  }
  if (digits.length === 11 && digits.startsWith('0') && digits[1] === '5') {
    return `90${digits.slice(1)}`
  }
  if (digits.length === 10 && digits.startsWith('5')) {
    return `90${digits}`
  }
  return null
}

/** profiles.phone ile eşleştirmek için olası kayıtlı biçimler */
export function phoneVariantsForDb(e16490: string): string[] {
  const d = e16490.replace(/\D/g, '')
  if (!d.startsWith('90') || d.length !== 12) return [e16490]
  const national = `0${d.slice(2)}`
  const plus = `+${d}`
  return Array.from(new Set([national, d, plus]))
}
