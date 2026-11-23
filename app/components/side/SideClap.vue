<script setup lang="ts">
import type { Note } from '~/types/misskey'

/** Web clap (拍手): a 👏 reaction on the guestbook note. One per visitor, as Misskey allows. */
const props = defineProps<{ noteId: string, bare?: boolean }>()
const { site, api, current, resolveNote } = useSite()
const wavebox = computed(() => site.value?.config.waveboxUrl ?? '')
const toast = useToast()
const count = ref<number | null>(null)
const busy = ref(false)
const done = ref(false)

onMounted(async () => {
  if (!props.noteId) return
  try {
    const n = await api<Note>('notes/show', { noteId: props.noteId })
    count.value = Object.values(n.reactions).reduce((a, b) => a + b, 0)
    done.value = !!n.myReaction
  }
  catch { /* hidden note: leave the counter blank */ }
})

async function clap() {
  if (!current.value) return toast.info('로그인하면 박수를 보낼 수 있어요.')
  busy.value = true
  try {
    const { account, noteId } = await resolveNote(props.noteId)
    await apiCall(account.host, 'notes/reactions/create', { noteId, reaction: '👏' }, account.token)
    count.value = (count.value ?? 0) + 1
    done.value = true
    toast.info('👏 박수 고마워요!')
  }
  catch (e) {
    if (e instanceof MisskeyApiError && e.code === 'ALREADY_REACTED') {
      done.value = true
      toast.info('이미 박수를 보냈어요.')
    }
    else toast.error(e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <component :is="props.bare ? 'div' : 'section'" :class="{ 'mh-box': !props.bare }">
    <h2 v-if="!props.bare" class="mh-box-title">Web Clap</h2>
    <div class="mh-row">
      <template v-if="props.noteId">
        <button class="mh-btn primary" :disabled="busy || done" @click="clap">👏 {{ done ? '보냄' : '박수' }}</button>
        <span v-if="count != null" class="mh-muted">{{ count }} claps</span>
      </template>
      <a v-if="wavebox" class="mh-btn" :href="wavebox" target="_blank" rel="noopener noreferrer" title="로그인 없이 익명으로 보내기">💌 Wavebox</a>
    </div>
  </component>
</template>
