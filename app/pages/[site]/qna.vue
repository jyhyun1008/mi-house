<script setup lang="ts">
/** Q&A: the owner's answered neo-quesdon questions, through api.chigoa.me. */
const { site, isOwner, path } = useSite()
const toast = useToast()
const handle = computed(() => site.value!.config.quesdon)
const siteKey = `@${site.value!.key}`

const { items, loading, done, error, more } = usePaged<QnaAnswer>(async untilId =>
  (await petit<{ answers: QnaAnswer[] }>(siteKey, 'qna', { query: untilId ? { untilId } : undefined })).answers, 20)
onMounted(() => {
  if (handle.value) more()
})

const question = ref('')
const sending = ref(false)
async function ask() {
  if (!question.value.trim()) return
  sending.value = true
  try {
    await petit(siteKey, 'ask', { method: 'POST', body: { question: question.value } })
    question.value = ''
    toast.info('💌 질문을 보냈어요! 답변하면 여기에 올라와요.')
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    sending.value = false
  }
}

const reveal = ref(new Set<string>())
const stamp = (iso: string) => new Date(iso).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="bt">
    <div class="bt-head">
      <h1 class="bt-title">Q&amp;A</h1>
      <span v-if="handle" class="bt-total"><a :href="quesdonPage(handle)" target="_blank" rel="noopener noreferrer">네퀘돈 ↗</a></span>
    </div>

    <div v-if="!handle" class="mh-empty">
      아직 질문함이 없어요.
      <p v-if="isOwner"><NuxtLink class="mh-btn primary" :to="path('admin')">관리 → 방명록에서 네퀘돈 계정을 넣어요</NuxtLink></p>
    </div>
    <template v-else>
      <form class="ask" @submit.prevent="ask">
        <textarea v-model="question" class="mh-textarea" maxlength="1000" placeholder="익명으로 질문하기 (로그인 필요 없어요)" />
        <div class="mh-row"><span class="mh-spacer" /><button class="bt-btn strong" :disabled="sending || !question.trim()">보내기</button></div>
      </form>

      <ol class="qna">
        <li v-for="a in items" :key="a.id" class="qa">
          <p class="q"><b>Q.</b><span>{{ a.question }}</span></p>
          <p v-if="a.nsfwedAnswer && !reveal.has(a.id)" class="a">
            <b>A.</b><button class="bt-btn" @click="reveal.add(a.id)">민감한 답변 보기</button>
          </p>
          <p v-else class="a"><b>A.</b><span>{{ a.answer }}</span></p>
          <time>{{ stamp(a.answeredAt) }}</time>
        </li>
      </ol>
      <p v-if="error" class="bt-empty">{{ error }} <a :href="quesdonPage(handle)" target="_blank" rel="noopener noreferrer">네퀘돈에서 보기 ↗</a></p>
      <p v-else-if="done && !items.length" class="bt-empty">아직 답한 질문이 없어요.</p>
      <p v-else-if="loading && !items.length" class="bt-empty">Now Loading…</p>
      <div v-if="!done && items.length" class="mh-more"><button class="bt-btn" :disabled="loading" @click="more">{{ loading ? '…' : '더 보기' }}</button></div>
    </template>
  </div>
</template>

<style scoped>
.ask {
  margin-bottom: 12px;
  padding: 8px;
  border: 1px solid var(--bt-line);
  background: var(--bt-bar);
}
.ask .mh-row {
  margin-top: 6px;
}
.qna {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 2px solid var(--bt-head);
}
.qa {
  padding: 12px 6px;
  border-bottom: 1px solid var(--bt-line);
}
.q,
.a {
  display: flex;
  gap: 8px;
  margin: 0 0 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.q b,
.a b {
  flex: none;
  color: var(--accent);
  font-family: Tahoma, Verdana, var(--font);
}
.q span {
  color: var(--fg-strong);
  font-weight: 700;
}
.qa time {
  display: block;
  color: var(--fg-muted);
  font-family: Tahoma, Verdana, var(--font);
  font-size: 11px;
  text-align: right;
}
</style>
