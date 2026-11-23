<script setup lang="ts">
import type { GalleryPost } from '~/types/misskey'

const route = useRoute()
const { path, isOwner } = useSite()
const { items, loaded, load } = useGalleryPosts()
const error = ref('')
onMounted(() => load().catch(e => (error.value = e instanceof Error ? e.message : String(e))))

const { tags, active, filtered, to } = useTagFilter(items, galleryTags)

// --- search (제목 / 내용), kept in ?q= & ?f= ---
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const field = ref<'subject' | 'content'>(route.query.f === 'content' ? 'content' : 'subject')
const draft = ref(q.value)
function search() {
  const query: Record<string, unknown> = { ...route.query, q: draft.value.trim() || undefined, f: field.value === 'content' ? 'content' : undefined }
  delete query.page
  navigateTo({ path: route.path, query: query as Record<string, string> })
}
const matched = computed(() => {
  const k = q.value.toLowerCase()
  if (!k) return filtered.value
  return filtered.value.filter(p => (route.query.f === 'content' ? (p.description ?? '') : p.title).toLowerCase().includes(k))
})

// --- feed (cards one after another, default) or thumbnail grid; kept in ?view= ---
const view = computed<'feed' | 'grid'>(() => (route.query.view === 'grid' ? 'grid' : 'feed'))
function viewTo(v: 'feed' | 'grid') {
  const query: Record<string, string> = { ...(route.query as Record<string, string>) }
  delete query.page
  if (v === 'grid') query.view = 'grid'
  else delete query.view
  return { path: route.path, query }
}

// --- pages: 8 cards, or 16 thumbnails (4 × 4) ---
const PER_FEED = 8
const PER_GRID = 16
const PER = computed(() => (view.value === 'grid' ? PER_GRID : PER_FEED))
const pages = computed(() => Math.max(1, Math.ceil(matched.value.length / PER.value)))
const page = computed(() => Math.min(pages.value, Math.max(1, Number(route.query.page) || 1)))
const shown = computed(() => matched.value.slice((page.value - 1) * PER.value, page.value * PER.value))
/** board number of a post on this page, counting from the oldest */
const numberOf = (i: number) => matched.value.length - ((page.value - 1) * PER.value + i)

async function onDeleted() {
  await load(true).catch(() => {})
}

const isNew = (p: GalleryPost) => Date.now() - Date.parse(p.createdAt) < 3 * 86_400_000
const ymd = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
/** keep the category / search when opening a post, so 목록 comes back to the same list */
const postTo = (p: GalleryPost) => ({ path: path(`gallery/${p.id}`), query: route.query })
</script>

<template>
  <div class="bt">
    <div class="bt-layout">
      <div>
        <div class="bt-head">
          <h1 class="bt-title">Gallery<small v-if="active">#{{ active }}</small></h1>
          <span class="bt-total">Total <b>{{ matched.length }}</b> · Page <b>{{ page }}</b>/{{ pages }}</span>
        </div>
        <div class="views">
          <NuxtLink class="bt-btn" :class="{ strong: view === 'feed' }" :to="viewTo('feed')">피드</NuxtLink>
          <NuxtLink class="bt-btn" :class="{ strong: view === 'grid' }" :to="viewTo('grid')">썸네일</NuxtLink>
        </div>

        <div v-if="shown.length && view === 'feed'" class="feed">
          <GalleryCard v-for="(g, i) in shown" :key="g.id" :post="g" :number="numberOf(i)" @deleted="onDeleted" />
        </div>
        <div v-else-if="shown.length" class="bt-gallery">
          <NuxtLink v-for="g in shown" :key="g.id" class="bt-cell" :to="postTo(g)">
            <span class="bt-thumb" :class="{ nsfw: g.isSensitive }">
              <img v-if="g.files[0]" :src="g.files[0].thumbnailUrl ?? g.files[0].url" :alt="g.title" loading="lazy">
              <span v-else class="bt-noimg">{{ g.isSensitive ? '로그인 후 볼 수 있어요' : 'NO IMAGE' }}</span>
              <span v-if="g.files.length > 1" class="bt-badge">+{{ g.files.length - 1 }}</span>
              <span v-else-if="g.isSensitive" class="bt-badge">R</span>
            </span>
            <span class="bt-subj">{{ g.title }}<span v-if="isNew(g)" class="bt-new">N</span></span>
            <span class="bt-info">{{ ymd(g.createdAt) }} · ♡ {{ g.likedCount }}</span>
          </NuxtLink>
        </div>
        <p v-else class="bt-empty">{{ error || (!loaded ? 'Now Loading…' : q || active ? '찾는 그림이 없어요.' : '아직 갤러리가 비어 있어요.') }}</p>

        <div class="bt-foot">
          <NuxtLink v-if="active || q" class="bt-btn" :to="{ path: route.path }">목록</NuxtLink>
          <span v-else />
          <NuxtLink v-if="isOwner" class="bt-btn strong" :to="path('admin/gallery/new')">글쓰기</NuxtLink>
        </div>
        <BtPaging :page="page" :pages="pages" />
        <form class="bt-search" @submit.prevent="search">
          <select v-model="field" aria-label="검색 범위">
            <option value="subject">제목</option>
            <option value="content">내용</option>
          </select>
          <input v-model="draft" type="search" aria-label="검색어">
          <button class="bt-btn">검색</button>
        </form>
      </div>

      <TagSidebar :tags="tags" :active="active" :total="items.length" :to="to" />
    </div>
  </div>
</template>

<style scoped>
.views {
  display: flex;
  justify-content: flex-end;
  gap: 3px;
  margin: -2px 0 8px;
}
.feed {
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding-top: 8px;
}
</style>
