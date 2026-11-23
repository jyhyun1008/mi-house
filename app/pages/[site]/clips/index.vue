<script setup lang="ts">
import type { Clip } from '~/types/misskey'

const { site, api, ownerApi, path, isOwner } = useSite()
const toast = useToast()
const { items, loaded, error, load } = useAllOf<Clip>(untilId =>
  api<Clip[]>('users/clips', { userId: site.value!.owner.id, limit: 100, untilId }), 100, 300)
onMounted(load)

/** a board's categories: the #hashtags in its description */
const clipTags = (c: Clip) => hashtagsIn(c.description)
const { tags, active, filtered, to } = useTagFilter(items, clipTags)

const creating = ref(false)
const form = reactive({ name: '', description: '' })

async function create() {
  if (!form.name.trim()) return
  try {
    const clip = await ownerApi<Clip>('clips/create', { name: form.name.trim(), description: form.description || null, isPublic: true })
    creating.value = false
    form.name = form.description = ''
    toast.info('게시판(클립)을 만들었어요.')
    navigateTo(path(`clips/${clip.id}`))
  }
  catch (e) {
    toast.error(e)
  }
}
const dot = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, '') : '-')
const isNew = (c: Clip) => !!c.lastClippedAt && Date.now() - Date.parse(c.lastClippedAt) < 3 * 86_400_000
</script>

<template>
  <div class="bt">
    <div class="bt-head">
      <h1 class="bt-title">Scrap<small v-if="active">#{{ active }}</small></h1>
      <span class="bt-total">Total <b>{{ filtered.length }}</b></span>
    </div>
    <table v-if="filtered.length" class="bt-list">
      <thead><tr><th>Scrap</th><th class="cnt">글</th><th class="date hide-sm">Last</th></tr></thead>
      <tbody>
        <tr v-for="c in filtered" :key="c.id">
          <td class="subj">
            <NuxtLink :to="path(`clips/${c.id}`)"><b>{{ c.name }}</b></NuxtLink><span v-if="isNew(c)" class="bt-new">N</span>
            <small v-if="c.description" class="desc"><MfmText :text="c.description" plain /></small>
          </td>
          <td class="cnt">{{ c.notesCount ?? '-' }}</td>
          <td class="date hide-sm">{{ dot(c.lastClippedAt) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="bt-empty">{{ error || (!loaded ? 'Now Loading…' : active ? `#${active} 게시판이 없어요.` : '공개된 클립이 없어요.') }}</p>
    <div class="bt-foot">
      <NuxtLink v-if="active" class="bt-btn" :to="to(null)">목록</NuxtLink>
      <span v-else class="note">{{ isOwner ? '※ 비공개 클립은 홈페이지에 나오지 않아요. 설명에 #태그를 쓰면 카테고리가 돼요.' : '' }}</span>
      <button v-if="isOwner" class="bt-btn strong" @click="creating = true">새 게시판</button>
    </div>
    <TagSidebar :tags="tags" :active="active" :total="items.length" :to="to" />

    <Modal v-if="creating" title="새 게시판 (공개 클립)" @close="creating = false">
      <form @submit.prevent="create">
        <label class="mh-field"><span>이름</span><input v-model="form.name" class="mh-input" maxlength="100" required></label>
        <label class="mh-field"><span>설명</span><textarea v-model="form.description" class="mh-textarea" maxlength="2048" placeholder="#낙서 처럼 해시태그를 쓰면 카테고리로 모여요" /></label>
        <button class="mh-btn primary">만들기</button>
      </form>
    </Modal>
  </div>
</template>

<style scoped>
.desc {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--fg-muted);
  font-size: 11px;
}
.note {
  color: var(--fg-muted);
  font-size: 11px;
}
</style>
