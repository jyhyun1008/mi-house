<script setup lang="ts">
import type { Note } from '~/types/misskey'

const { site, api, current, isOwner, notesLocked, path, resolveNote, ownerIdFor } = useSite()
const toast = useToast()
const noteId = computed(() => site.value!.config.guestbookNoteId)
const head = ref<Note | null>(null)

const { items, loading, done, error, more, reset } = usePaged<Note>(untilId =>
  api<Note[]>('notes/children', { noteId: noteId.value, limit: 30, untilId }), 30)
const entries = computed(() => items.value.filter(n => n.replyId === noteId.value))

onMounted(async () => {
  if (!noteId.value) return
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
    <div v-if="!noteId" class="mh-empty">
      방명록이 아직 없어요.
      <p v-if="site!.config.waveboxUrl"><a class="mh-btn primary" :href="site!.config.waveboxUrl" target="_blank" rel="noopener noreferrer">💌 Wavebox로 보내기</a></p>
      <p v-if="isOwner"><NuxtLink class="mh-btn primary" :to="path('admin')">관리에서 방명록 만들기</NuxtLink></p>
    </div>
    <template v-else>
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
      <div v-else-if="site!.config.waveboxUrl" class="mh-box login">
        <p class="mh-muted">미스키 계정으로 로그인하면 방명록을 남길 수 있어요. 계정이 없거나 익명으로 보내고 싶으면 💌 Wavebox로 보내 주세요.</p>
        <div class="mh-row">
          <a class="mh-btn primary" :href="site!.config.waveboxUrl" target="_blank" rel="noopener noreferrer">💌 Wavebox로 보내기</a>
        </div>
        <SideVisitor bare />
      </div>
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
