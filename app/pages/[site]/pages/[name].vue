<script setup lang="ts">
import type { Page } from '~/types/misskey'

const route = useRoute()
const { site, api, ownerApi, path, isOwner } = useSite()
const toast = useToast()
const page = ref<Page | null>(null)
const error = ref('')

watchEffect(async () => {
  const name = String(route.params.name)
  page.value = null
  error.value = ''
  try {
    page.value = await api<Page>('pages/show', { username: site.value!.username, name })
  }
  catch (e) {
    error.value = e instanceof MisskeyApiError && e.code === 'NO_SUCH_PAGE' ? '없는 페이지예요.' : (e instanceof Error ? e.message : String(e))
  }
})

const tagsOfPage = computed(() => (page.value ? pageTags(page.value) : []))
const content = computed(() => (page.value ? splitPageContent(page.value.content) : null))
useHead({ title: () => (page.value ? `${page.value.title} - ${site.value!.config.title}` : site.value!.config.title) })

function onLike(liked: boolean, count: number) {
  if (page.value) Object.assign(page.value, { isLiked: liked, likedCount: count })
}

async function del() {
  if (!page.value || !confirm(`"${page.value.title}"을(를) 지울까요?`)) return
  try {
    await ownerApi('pages/delete', { pageId: page.value.id })
    toast.info('지웠어요.')
    navigateTo(path('pages'))
  }
  catch (e) {
    toast.error(e)
  }
}
</script>

<template>
  <div>
    <p v-if="error" class="mh-empty">{{ error }}</p>
    <article v-else-if="page && content" class="mh-box reader" :class="{ serif: page.font === 'serif', center: page.alignCenter }">
      <img v-if="page.eyeCatchingImage" class="eye" :src="page.eyeCatchingImage.url" alt="">
      <h1 class="mh-page-title">{{ page.title }}</h1>
      <p v-if="page.summary" class="mh-muted summary">{{ page.summary }}</p>
      <PageProperties v-if="content.properties" :properties="content.properties" />
      <PageBlocks :blocks="content.blocks" :files="page.attachedFiles" />
      <div v-if="tagsOfPage.length" class="bt-tags">
        <span class="mh-muted">분류 :</span>
        <NuxtLink v-for="t in tagsOfPage" :key="t" :to="{ path: path('pages'), query: { tag: t } }">#{{ t }}</NuxtLink>
      </div>
      <div class="mh-row meta">
        <span class="mh-muted">{{ formatDate(page.createdAt) }}<template v-if="page.updatedAt !== page.createdAt"> (수정 {{ formatDate(page.updatedAt) }})</template></span>
        <LikeButton kind="page" :id="page!.id" :liked="page!.isLiked" :count="page!.likedCount" :href="`https://${site!.host}/@${site!.username}/pages/${encodeURIComponent(page!.name)}`" @change="onLike" />
        <span class="mh-spacer" />
        <template v-if="isOwner">
          <NuxtLink class="mh-btn small" :to="path(`admin/page/${page!.id}`)">수정</NuxtLink>
          <button class="mh-btn small danger" @click="del">삭제</button>
        </template>
      </div>
    </article>
    <p v-else class="mh-empty">…</p>
  </div>
</template>

<style scoped>
.reader.serif {
  font-family: 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', '바탕', serif;
}
.reader.center :deep(.blocks) {
  text-align: center;
}
.eye {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  margin-bottom: 14px;
}
.summary {
  margin: -8px 0 14px;
}
.meta {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
</style>
