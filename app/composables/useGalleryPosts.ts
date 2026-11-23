import type { GalleryPost } from '~/types/misskey'

const BATCH = 100
const MAX_BATCHES = 10

/**
 * Every gallery post of the site (up to 1000), so the board can number its pages,
 * count categories and link to the previous / next post. Cached per site.
 */
export function useGalleryPosts() {
  const { site, api } = useSite()
  const state = useState<{ key: string, items: GalleryPost[], loaded: boolean } | null>('gallery-posts', () => null)
  let pending: Promise<void> | null = null

  async function load(force = false) {
    const key = site.value!.key
    if (!force && state.value?.key === key && state.value.loaded) return
    if (pending) return pending
    pending = (async () => {
      const items: GalleryPost[] = []
      let untilId: string | undefined
      for (let i = 0; i < MAX_BATCHES; i++) {
        const batch = await api<GalleryPost[]>('users/gallery/posts', { userId: site.value!.owner.id, limit: BATCH, untilId })
        items.push(...batch)
        if (batch.length < BATCH) break
        untilId = batch.at(-1)!.id
      }
      state.value = { key, items, loaded: true }
    })().finally(() => (pending = null))
    return pending
  }

  const items = computed(() => (state.value?.key === site.value?.key ? state.value!.items : []))
  const loaded = computed(() => state.value?.key === site.value?.key && !!state.value?.loaded)

  return { items, loaded, load }
}

/** Categories of a gallery post: its tags, or the #hashtags in its description. */
export function galleryTags(p: GalleryPost): string[] {
  return p.tags?.length ? p.tags : hashtagsIn(p.description)
}
