<script setup lang="ts">
import type { Note } from '~/types/misskey'

const { site, api, current, isOwner, notesLocked, notesOff, path, resolveNote, ownerIdFor } = useSite()
const config = computed(() => site.value!.config)
/** the note-reply guestbook, unless notes are hidden from this visitor */
const noteBook = computed(() => !!config.value.guestbookNoteId && !notesOff.value)
const toast = useToast()
const noteId = computed(() => site.value!.config.guestbookNoteId)
const head = ref<Note | null>(null)

const { items, loading, done, error, more, reset } = usePaged<Note>(untilId =>
  api<Note[]>('notes/children', { noteId: noteId.value, limit: 30, untilId }), 30)
const entries = computed(() => items.value.filter(n => n.replyId === noteId.value))

onMounted(async () => {
  if (!noteBook.value) return
  api<Note>('notes/show', { noteId: noteId.value }).then(n => (head.value = n)).catch(() => {})
  await more()
})

const text = ref('')
const secret = ref(false)
const posting = ref(false)

async function post() {
  if (!text.value.trim()) return
  posting.value = true
  try {
    const { account, noteId: replyId } = await resolveNote(noteId.value)
    const params: Record<string, unknown> = { text: text.value, replyId, visibility: secret.value ? 'specified' : 'home' }
    if (secret.value) params.visibleUserIds = [await ownerIdFor(account)]
    await apiCall(account.host, 'notes/create', params, account.token)
    text.value = ''
    if (account.host === site.value!.host) await reset()
    else toast.info('남겼어요! 다른 서버에서 쓴 글은 반영되기까지 조금 걸릴 수 있어요.')
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
  <div>
    <h1 class="mh-page-title">Guestbook</h1>
    <SideClap v-if="config.workerClap" class="clap" />
    <section v-if="config.quesdon" class="qna-part">
      <h2 class="part-title">Q&amp;A</h2>
      <QnaBoard />
    </section>

    <div v-if="!noteBook && !config.workerClap && !config.quesdon" class="mh-empty">
      방명록이 아직 없어요.
      <p v-if="isOwner"><NuxtLink class="mh-btn primary" :to="path('admin')">관리에서 방명록 만들기</NuxtLink></p>
    </div>
    <template v-else-if="noteBook">
      <h2 v-if="config.quesdon" class="part-title">Guestbook</h2>
      <section v-if="head?.text" class="mh-box"><MfmText :text="head.text" :emojis="head.emojis" /></section>

      <form v-if="current" class="mh-box write" @submit.prevent="post">
        <textarea v-model="text" class="mh-textarea" placeholder="한마디 남겨 주세요" maxlength="3000" />
        <div class="mh-row">
          <label class="mh-check"><input v-model="secret" type="checkbox"> 🔒 비밀글 (주인만 볼 수 있어요)</label>
          <span class="mh-spacer" />
          <span class="mh-muted">@{{ current.key }}</span>
          <button class="mh-btn primary" :disabled="posting">남기기</button>
        </div>
      </form>
      <div v-else class="mh-box login">
        <p class="mh-muted">방명록은 미스키 계정으로 남겨요. 어느 서버 계정이든 괜찮아요.</p>
        <SideVisitor bare />
      </div>

      <div class="mh-list">
        <div v-for="n in entries" :key="n.id"><NoteCard :note="n" /></div>
      </div>
      <LockedNotes v-if="notesLocked && !entries.length" />
      <p v-else-if="error" class="mh-empty">{{ error }}</p>
      <p v-else-if="done && !entries.length" class="mh-empty">첫 번째 방명록을 남겨 주세요!</p>
      <div v-if="!done" class="mh-more"><button class="mh-btn" :disabled="loading" @click="more">{{ loading ? '…' : 'more' }}</button></div>
    </template>
  </div>
</template>

<style scoped>
.clap {
  margin: 14px 0;
}
.qna-part {
  margin: 14px 0 24px;
}
.part-title {
  margin: 18px 0 8px;
  color: var(--fg-strong);
  font-size: 14px;
  letter-spacing: 0.08em;
}
.write {
  margin: 14px 0;
}
.write .mh-row {
  margin-top: 6px;
}
.login {
  margin: 14px 0;
}
.login p {
  margin: 0 0 6px;
}
.mh-box + .mh-list,
.mh-muted + .mh-list {
  margin-top: 14px;
}
</style>
