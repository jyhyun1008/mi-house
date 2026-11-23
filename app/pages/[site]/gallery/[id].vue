<script setup lang="ts">
import type { GalleryPost } from '~/types/misskey'

/** One gallery post on its own page (from a copied link or the thumbnail grid). */
const route = useRoute()
const { api, path } = useSite()
const { items, load } = useGalleryPosts()
const post = ref<GalleryPost | null>(null)
const error = ref('')

watchEffect(async () => {
  post.value = null
  error.value = ''
  try {
    post.value = await api<GalleryPost>('gallery/posts/show', { postId: String(route.params.id) })
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
onMounted(() => load().catch(() => {}))

// prev / next inside the same category, newest first
const list = computed(() => {
  const t = typeof route.query.tag === 'string' ? route.query.tag.toLowerCase() : null
  return t ? items.value.filter(p => galleryTags(p).some(x => x.toLowerCase() === t)) : items.value
})
const index = computed(() => list.value.findIndex(p => p.id === route.params.id))
const number = computed(() => (index.value >= 0 ? list.value.length - index.value : null))
const newer = computed(() => (index.value > 0 ? list.value[index.value - 1] : null))
const older = computed(() => (index.value >= 0 ? list.value[index.value + 1] ?? null : null))
const listTo = computed(() => ({ path: path('gallery'), query: route.query }))
const postTo = (p: GalleryPost) => ({ path: path(`gallery/${p.id}`), query: route.query })

async function onDeleted() {
  await load(true).catch(() => {})
  navigateTo(listTo.value)
}
</script>

<template>
  <div class="bt">
    <p v-if="error" class="bt-empty">{{ error }}</p>
    <template v-else-if="post">
      <GalleryCard :post="post" :number="number" :close-to="listTo" @deleted="onDeleted" />
      <nav class="bt-btns nav">
        <NuxtLink class="bt-btn" :to="listTo">목록</NuxtLink>
        <span class="mh-spacer" />
        <NuxtLink v-if="newer" class="bt-btn" :to="postTo(newer)" :title="newer.title">◀ 다음 그림</NuxtLink>
        <NuxtLink v-if="older" class="bt-btn" :to="postTo(older)" :title="older.title">이전 그림 ▶</NuxtLink>
      </nav>
    </template>
    <p v-else class="bt-empty">Now Loading…</p>
  </div>
</template>

<style scoped>
.nav {
  margin: 14px 6px 0 12px;
}
</style>
