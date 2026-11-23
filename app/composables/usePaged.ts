/** Cursor (untilId) pagination over a Misskey list endpoint. */
export function usePaged<T extends { id: string }>(fetch: (untilId?: string) => Promise<T[]>, size = 20) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const done = ref(false)
  const error = ref('')

  async function more() {
    if (loading.value || done.value) return
    loading.value = true
    error.value = ''
    try {
      const batch = await fetch(items.value.at(-1)?.id)
      const seen = new Set(items.value.map(i => i.id))
      items.value.push(...batch.filter(i => !seen.has(i.id)))
      if (batch.length < size) done.value = true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      done.value = true
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    items.value = []
    done.value = false
    return more()
  }

  return { items, loading, done, error, more, reset }
}
