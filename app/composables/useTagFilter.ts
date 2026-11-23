export interface TagCount {
  tag: string
  count: number
}

/**
 * Hashtags used as categories: counts over the loaded items and a `?tag=` filter
 * (kept in the address so a category can be linked to).
 */
export function useTagFilter<T>(items: Ref<T[]>, tagsOf: (item: T) => string[]) {
  const route = useRoute()
  const active = computed(() => (typeof route.query.tag === 'string' && route.query.tag ? route.query.tag : null))

  const tags = computed<TagCount[]>(() => {
    const map = new Map<string, TagCount>()
    for (const item of items.value) {
      for (const t of new Set(tagsOf(item).map(x => x.toLowerCase()))) {
        const hit = map.get(t)
        if (hit) hit.count++
        else map.set(t, { tag: tagsOf(item).find(x => x.toLowerCase() === t) ?? t, count: 1 })
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  })

  const filtered = computed(() => {
    const t = active.value?.toLowerCase()
    return t ? items.value.filter(i => tagsOf(i).some(x => x.toLowerCase() === t)) : items.value
  })

  /** Route location for a category (null = all); resets paging */
  function to(tag: string | null) {
    const query = { ...route.query }
    delete query.page
    if (tag) query.tag = tag
    else delete query.tag
    return { path: route.path, query }
  }

  return { tags, active, filtered, to }
}
