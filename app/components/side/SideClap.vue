<script setup lang="ts">
import type { Note } from '~/types/misskey'

/**
 * Web clap (拍手).
 * - With `workerClap`: counted by api.chigoa.me, no login needed, and a one-line message can
 *   go along as an anonymous neo-quesdon question (when `quesdon` is set).
 * - Otherwise: a 👏 reaction on the guestbook note. One per visitor, as Misskey allows.
 */
const props = defineProps<{ noteId?: string, bare?: boolean }>()
const { site, api, current, resolveNote } = useSite()
const toast = useToast()
const viaWorker = computed(() => !!site.value?.config.workerClap)
const siteKey = computed(() => `@${site.value!.key}`)
const canAsk = computed(() => !!site.value?.config.quesdon)
const count = ref<number | null>(null)
const busy = ref(false)
const done = ref(false)
const asking = ref(false)
const message = ref('')

onMounted(async () => {
  try {
    if (viaWorker.value) {
      count.value = (await petit<{ count: number }>(siteKey.value, 'clap')).count
    }
    else if (props.noteId) {
      const n = await api<Note>('notes/show', { noteId: props.noteId })
      count.value = Object.values(n.reactions).reduce((a, b) => a + b, 0)
      done.value = !!n.myReaction
    }
  }
  catch { /* hidden note / no Worker: leave the counter blank */ }
})

async function clap() {
  if (viaWorker.value) return clapWorker()
  if (!current.value) return toast.info('로그인하면 박수를 보낼 수 있어요.')
  busy.value = true
  try {
    const { account, noteId } = await resolveNote(props.noteId!)
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

async function clapWorker() {
  busy.value = true
  try {
    const res = await petit<{ count: number, already?: boolean }>(siteKey.value, 'clap', { method: 'POST' })
    count.value = res.count
    done.value = true
    toast.info(res.already ? '박수는 한 시간에 한 번만 셀게요. 고마워요!' : '👏 박수 고마워요!')
    if (canAsk.value) asking.value = true
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    busy.value = false
  }
}

async function ask() {
  if (!message.value.trim()) return
  busy.value = true
  try {
    await petit(siteKey.value, 'ask', { method: 'POST', body: { question: message.value } })
    message.value = ''
    asking.value = false
    toast.info('💌 전했어요!')
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <component :is="props.bare ? 'div' : 'section'" :class="{ 'mh-box': !props.bare }">
    <h2 v-if="!props.bare" class="mh-box-title">Web Clap</h2>
    <div class="mh-row bar">
      <button class="mh-btn primary" :class="{ small: props.bare }" :disabled="busy || done" @click="clap">
        👏 {{ done ? '보냄' : '박수' }}<b v-if="count != null" class="cnt">{{ count }}</b>
      </button>
      <button v-if="canAsk && !asking" class="mh-btn" :class="{ small: props.bare }" @click="asking = true">💌 한마디</button>
    </div>
    <form v-if="asking" class="ask" @submit.prevent="ask">
      <textarea v-model="message" class="mh-textarea" maxlength="1000" placeholder="익명으로 한마디 (네퀘돈 질문으로 전해져요)" />
      <div class="mh-row">
        <span class="mh-spacer" />
        <button type="button" class="mh-btn small" @click="asking = false">닫기</button>
        <button class="mh-btn small primary" :disabled="busy || !message.trim()">보내기</button>
      </div>
    </form>
  </component>
</template>

<style scoped>
.bar {
  flex-wrap: wrap;
  gap: 6px;
}
.cnt {
  margin-left: 6px;
  padding-left: 6px;
  border-left: 1px solid currentColor;
  font-weight: 400;
  opacity: 0.85;
}
.ask {
  margin-top: 6px;
}
.ask .mh-textarea {
  min-height: 56px;
}
.ask .mh-row {
  margin-top: 4px;
}
</style>
