<script setup lang="ts">
import type { Clip, Note } from '~/types/misskey'

const route = useRoute()
const { site, api, ownerApi, path, isOwner, current } = useSite()
const toast = useToast()
const clipId = computed(() => String(route.params.id))
const clip = ref<Clip | null>(null)
const error = ref('')

const menuView = computed(() => site.value!.config.menu.find(m => m.type === 'clip' && m.clipId === clipId.value)?.view)
const view = ref<'board' | 'scrap'>('board')
watch(menuView, v => (view.value = v ?? 'board'), { immediate: true })

const { items, loading, done, more, reset } = usePaged<Note>(untilId =>
  api<Note[]>('clips/notes', { clipId: clipId.value, limit: 20, untilId }), 20)

watch(clipId, async () => {
  clip.value = null
  error.value = ''
  try {
    clip.value = await api<Clip>('clips/show', { clipId: clipId.value })
    await reset()
  }
  catch (e) {
    error.value = e instanceof MisskeyApiError && e.code === 'NO_SUCH_CLIP' ? '없거나 비공개인 게시판이에요.' : (e instanceof Error ? e.message : String(e))
  }
}, { immediate: true })

/** a note's categories: Misskey's own tags, or the #hashtags in its text (renotes: the original's) */
function noteTags(n: Note): string[] {
  const t = n.renote && !n.text ? n.renote : n
  return t.tags?.length ? t.tags : hashtagsIn(t.text)
}
const { tags, active, filtered, to } = useTagFilter(items, noteTags)

const opened = ref<Note | null>(null)
const firstImage = (n: Note) => (n.renote && !n.text ? n.renote : n).files.find(f => f.type.startsWith('image/'))
const textOf = (n: Note) => (n.renote && !n.text ? n.renote : n).text ?? ''

// --- owner tools ---
const editing = ref(false)
const form = reactive({ name: '', description: '', isPublic: true })
function openEdit() {
  Object.assign(form, { name: clip.value!.name, description: clip.value!.description ?? '', isPublic: clip.value!.isPublic })
  editing.value = true
}
async function save() {
  try {
    clip.value = await ownerApi<Clip>('clips/update', { clipId: clipId.value, name: form.name, description: form.description || null, isPublic: form.isPublic })
    editing.value = false
  }
  catch (e) {
    toast.error(e)
  }
}
async function del() {
  if (!confirm(`"${clip.value!.name}" 게시판(클립)을 지울까요? 노트 자체는 지워지지 않아요.`)) return
  try {
    await ownerApi('clips/delete', { clipId: clipId.value })
    navigateTo(path('clips'))
  }
  catch (e) {
    toast.error(e)
  }
}
async function removeNote(n: Note) {
  try {
    await ownerApi('clips/remove-note', { clipId: clipId.value, noteId: n.id })
    items.value = items.value.filter(x => x.id !== n.id)
  }
  catch (e) {
    toast.error(e)
  }
}

const addUrl = ref('')
/** Add a note by URL; notes from other servers are fetched in via ap/show first. */
async function addNote() {
  const raw = addUrl.value.trim()
  if (!raw) return
  try {
    let noteId = new RegExp(`^https://${site.value!.host.replace(/[.]/g, '\\.')}/notes/([a-zA-Z0-9]+)`).exec(raw)?.[1]
    if (!noteId) {
      const res = await ownerApi<{ type: string, object: Note }>('ap/show', { uri: raw })
      if (res.type !== 'Note') throw new Error('노트 주소가 아니에요.')
      noteId = res.object.id
    }
    await ownerApi('clips/add-note', { clipId: clipId.value, noteId })
    addUrl.value = ''
    toast.info('추가했어요.')
    await reset()
  }
  catch (e) {
    toast.error(e)
  }
}

// Visitors on the same server can bookmark the board
async function favorite() {
  try {
    const fav = !clip.value!.isFavorited
    await api(fav ? 'clips/favorite' : 'clips/unfavorite', { clipId: clipId.value })
    clip.value!.isFavorited = fav
    clip.value!.favoritedCount = (clip.value!.favoritedCount ?? 0) + (fav ? 1 : -1)
  }
  catch (e) {
    toast.error(e)
  }
}
</script>

<template>
  <div class="bt">
    <p class="crumb"><NuxtLink :to="path('clips')">≪ Board</NuxtLink></p>
    <p v-if="error" class="bt-empty">{{ error }}</p>
    <div v-else-if="clip" class="bt-layout">
     <div>
      <div class="bt-head">
        <h1 class="bt-title grow">{{ clip.name }}<small v-if="active">#{{ active }}</small></h1>
        <span class="bt-total">Total <b>{{ filtered.length }}</b><template v-if="!done">+</template></span>
        <button v-if="current?.host === site!.host && !isOwner" class="bt-btn" @click="favorite">{{ clip.isFavorited ? '★' : '☆' }} {{ clip.favoritedCount ?? 0 }}</button>
        <div class="mh-tabs-mini">
          <button class="bt-btn" :class="{ strong: view === 'board' }" @click="view = 'board'">List</button>
          <button class="bt-btn" :class="{ strong: view === 'scrap' }" @click="view = 'scrap'">Scrap</button>
        </div>
      </div>
      <p v-if="clip.description" class="desc"><MfmText :text="clip.description" /></p>

      <div v-if="isOwner" class="mh-box owner">
        <form class="mh-row" @submit.prevent="addNote">
          <input v-model="addUrl" class="mh-input grow" placeholder="노트 주소 붙여넣기 (다른 서버 노트도 OK)">
          <button class="mh-btn small primary">추가</button>
        </form>
        <div class="mh-row tools">
          <span class="mh-muted">{{ clip.isPublic ? '공개 클립' : '비공개 클립 (방문자에게 안 보여요)' }}</span>
          <span class="mh-spacer" />
          <button class="mh-btn small" @click="openEdit">수정</button>
          <button class="mh-btn small danger" @click="del">삭제</button>
        </div>
      </div>

      <div v-if="view === 'board'" class="mh-list board-list">
        <div v-for="n in filtered" :key="n.id">
          <NoteCard :note="n" :removable="isOwner" reactable @remove="removeNote(n)" />
        </div>
      </div>
      <div v-else class="mh-grid scrap">
        <button v-for="n in filtered" :key="n.id" class="mh-card" @click="opened = n">
          <div v-if="firstImage(n)" class="mh-thumb" :class="{ nsfw: firstImage(n)!.isSensitive }">
            <img :src="firstImage(n)!.thumbnailUrl ?? firstImage(n)!.url" alt="" loading="lazy">
          </div>
          <div v-else class="mh-thumb textcard"><span>{{ textOf(n).slice(0, 80) }}</span></div>
        </button>
      </div>
      <p v-if="done && !filtered.length" class="bt-empty">{{ active ? `#${active} 글이 없어요.` : '아직 아무것도 없어요.' }}</p>
      <div v-if="!done" class="mh-more"><button class="bt-btn" :disabled="loading" @click="more">{{ loading ? '…' : '더 불러오기' }}</button></div>
     </div>
      <TagSidebar :tags="tags" :active="active" :total="items.length" :to="to" :note="done ? undefined : '불러온 글 기준이에요.'" />

      <Modal v-if="opened" @close="opened = null">
        <NoteCard :note="opened" reactable />
      </Modal>
      <Modal v-if="editing" title="게시판 수정" @close="editing = false">
        <form @submit.prevent="save">
          <label class="mh-field"><span>이름</span><input v-model="form.name" class="mh-input" maxlength="100" required></label>
          <label class="mh-field"><span>설명</span><textarea v-model="form.description" class="mh-textarea" maxlength="2048" /></label>
          <label class="mh-check"><input v-model="form.isPublic" type="checkbox"> 공개 (홈페이지에 보이려면 필요해요)</label>
          <p><button class="mh-btn primary">저장</button></p>
        </form>
      </Modal>
    </div>
    <p v-else class="bt-empty">Now Loading…</p>
  </div>
</template>

<style scoped>
.crumb {
  margin: 0 0 8px;
}
.grow {
  flex: 1;
  min-width: 0;
}
.mh-tabs-mini {
  display: flex;
  gap: 2px;
}
.desc {
  margin: 0 0 12px;
  padding: 8px 10px;
  border: 1px solid var(--bt-line);
  background: var(--bt-bar);
}
.board-list {
  border-top: 2px solid var(--bt-head);
}
.board-list > * {
  padding: 12px 6px;
  border-bottom: 1px solid var(--bt-line);
}
.scrap {
  padding-top: 10px;
  border-top: 2px solid var(--bt-head);
}
.owner {
  margin-bottom: 14px;
}
.tools {
  margin-top: 8px;
}
.scrap .mh-card {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.textcard {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  font-size: 0.9em;
  text-align: left;
  overflow: hidden;
}
</style>
