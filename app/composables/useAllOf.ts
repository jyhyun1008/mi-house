/**
 * Read a whole cursor-paginated list (up to `max` items), so a board can count its
 * categories and number its rows. Re-runs when `key` changes.
 */
export function useAllOf<T extends { id: string }>(fetch: (untilId?: string) => Promise<T[]>, batch = 100, max = 500) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loaded = ref(false)
  const error = ref('')

  async function load() {
    loaded.value = false
    error.value = ''
    try {
      const all: T[] = []
      let untilId: string | undefined
      while (all.length < max) {
        const got = await fetch(untilId)
        all.push(...got)
        if (got.length < batch) break
        untilId = got.at(-1)!.id
      }
      items.value = all
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
    finally {
      loaded.value = true
    }
  }

  return { items, loaded, error, load }
}
