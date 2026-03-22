/**
 * Supabase milestones.photos: JSONB dizi, bazen JSON string veya tek URL string olabilir.
 */
export function milestonePhotoUrlsFromRaw(photos: unknown): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) {
    return photos.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  }
  if (typeof photos === 'string') {
    const s = photos.trim()
    if (!s) return []
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        const j = JSON.parse(s) as unknown
        if (Array.isArray(j)) {
          return j.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        }
      } catch {
        return []
      }
    }
    // Tek URL string
    return [s]
  }
  return []
}
