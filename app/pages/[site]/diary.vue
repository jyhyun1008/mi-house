<script setup lang="ts">
import type { Note } from '~/types/misskey'

const { site, api, ownerApi, isOwner } = useSite()
const toast = useToast()
const tag = computed(() => site.value!.config.diaryTag.toLowerCase())

const { items, loading, done, error, more, reset } = usePaged<Note>(untilId =>
  api<Note[]>('users/notes', { userId: site.value!.owner.id, limit: 30, untilId, withReplies: false, withRenotes: false, withChannelNotes: false }), 30)
onMounted(more)

const entries = computed(() => items.value.filter(n => n.visibility !== 'specified' && (!tag.value || n.tags?.some(t => t.toLowerCase() === tag.value))))
// hashtags as categories (the diary tag itself is every entry's, so it's left out)
const noteTags = (n: Note) => (n.tags?.length ? n.tags : hashtagsIn(n.text)).filter(t => t.toLowerCase() !== tag.value)
const { tags, active, filtered, to } = useTagFilter(entries, noteTags)

/** With a category picked, keep reading older notes until a page's worth turns up (or 600 notes). */
const SCAN_LIMIT = 600
watch([active, () => items.value.length, loading], () => {
  if (active.value && filtered.value.length < 10 && !done.value && !loading.value && items.value.length < SCAN_LIMIT) more()
})

const day = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
function newDay(i: number) {
  return i === 0 || new Date(filtered.value[i - 1]!.createdAt).toDateString() !== new Date(filtered.value[i]!.createdAt).toDateString()
}

const text = ref('')
const posting = ref(false)
async function post() {
  if (!text.value.trim()) return
  posting.value = true
  try {
    const body = tag.value && !new RegExp(`#${tag.value}(?![\\p{L}\\p{N}_])`, 'iu').test(text.value) ? `${text.value}\n#${site.value!.config.diaryTag}` : text.value
    await ownerApi('notes/create', { text: body, visibility: 'public' })
    text.value = ''
    await reset()
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    posting.value = false
  }
}
</script>

<template>
  <div class="bt">
    <div class="bt-layout">
      <div>
        <div class="bt-head">
          <h1 class="bt-title">Diary<small v-if="active">#{{ active }}</small></h1>
          <span class="bt-total">Total <b>{{ filtered.length }}</b><template v-if="!done">+</template></span>
        </div>
        <form v-if="isOwner" class="write" @submit.prevent="post">
          <textarea v-model="text" class="mh-textarea" :placeholder="tag ? `오늘의 일기 (#${site!.config.diaryTag} 가 자동으로 붙어요. #태그를 더 달면 카테고리가 돼요)` : '오늘의 일기 (#태그를 달면 카테고리가 돼요)'" />
          <div class="mh-row"><span class="mh-spacer" /><button class="bt-btn strong" :disabled="posting">쓰기</button></div>
        </form>
        <div class="entries">
          <div v-for="(n, i) in filtered" :key="n.id" class="entry">
            <h2 v-if="newDay(i)" class="day">{{ day(n.createdAt) }}</h2>
            <NoteCard :note="n" hide-author reactable />
          </div>
        </div>
        <p v-if="error" class="bt-empty">{{ error }}</p>
        <p v-else-if="done && !filtered.length" class="bt-empty">{{ active ? `#${active} 일기가 없어요.` : '아직 일기가 없어요.' }}</p>
        <p v-else-if="loading && !filtered.length" class="bt-empty">Now Loading…</p>
        <div v-if="!done" class="mh-more"><button class="bt-btn" :disabled="loading" @click="more">{{ loading ? '…' : '지난 일기 더 보기' }}</button></div>
      </div>
      <TagSidebar :tags="tags" :active="active" :total="entries.length" :to="to" :note="done ? undefined : '불러온 일기 기준이에요.'" />
    </div>
  </div>
</template>

<style scoped>
.write {
  margin-bottom: 12px;
  padding: 8px;
  border: 1px solid var(--bt-line);
  background: var(--bt-bar);
}
.write .mh-row {
  margin-top: 6px;
}
.entries {
  border-top: 2px solid var(--bt-head);
}
.entry {
  padding: 10px 6px 12px;
  border-bottom: 1px solid var(--bt-line);
}
.day {
  margin: 0 0 8px;
  padding: 2px 8px;
  display: inline-block;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--bt-head);
  font-family: Tahoma, Verdana, var(--font);
  font-size: 11px;
  font-weight: 700;
}
</style>
