<script setup lang="ts">
import type { Page } from '~/types/misskey'

const route = useRoute()
const { site, api, path, isOwner } = useSite()
const { items, loaded, error, load } = useAllOf<Page>(untilId =>
  api<Page[]>('users/pages', { userId: site.value!.owner.id, limit: 100, untilId }))
onMounted(load)

const pages = computed(() => items.value.filter(p => p.name !== CONFIG_PAGE_NAME))
const { tags, active, filtered, to } = useTagFilter(pages, pageTags)

const PER = 20
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER)))
const page = computed(() => Math.min(pageCount.value, Math.max(1, Number(route.query.page) || 1)))
const shown = computed(() => filtered.value.slice((page.value - 1) * PER, page.value * PER))

const dot = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, '')
const isNew = (p: Page) => Date.now() - Date.parse(p.createdAt) < 3 * 86_400_000
</script>

<template>
  <div class="bt">
    <div class="bt-head">
      <h1 class="bt-title">Text<small v-if="active">#{{ active }}</small></h1>
      <span class="bt-total">Total <b>{{ filtered.length }}</b> · Page <b>{{ page }}</b>/{{ pageCount }}</span>
    </div>
    <table v-if="shown.length" class="bt-list">
      <thead>
        <tr><th class="num hide-sm">No.</th><th>Title</th><th class="date">Date</th><th class="cnt hide-sm">♡</th></tr>
      </thead>
      <tbody>
        <tr v-for="(p, i) in shown" :key="p.id">
          <td class="num hide-sm">{{ filtered.length - (page - 1) * PER - i }}</td>
          <td class="subj">
            <NuxtLink :to="path(`pages/${encodeURIComponent(p.name)}`)">{{ p.title || p.name }}</NuxtLink><span v-if="isNew(p)" class="bt-new">N</span>
            <small v-if="p.summary" class="sum">{{ p.summary }}</small>
          </td>
          <td class="date">{{ dot(p.createdAt) }}</td>
          <td class="cnt hide-sm">{{ p.likedCount }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="bt-empty">{{ error || (!loaded ? 'Now Loading…' : active ? `#${active} 글이 없어요.` : '아직 글이 없어요.') }}</p>
    <div class="bt-foot">
      <NuxtLink v-if="active" class="bt-btn" :to="to(null)">목록</NuxtLink>
      <span v-else />
      <NuxtLink v-if="isOwner" class="bt-btn strong" :to="path('admin/page/new')">글쓰기</NuxtLink>
    </div>
    <BtPaging :page="page" :pages="pageCount" />
    <TagSidebar :tags="tags" :active="active" :total="pages.length" :to="to" />
  </div>
</template>

<style scoped>
.sum {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--fg-muted);
  font-size: 11px;
}
</style>
