<script setup lang="ts">
import type { DriveFile, Page, PageBlock } from '~/types/misskey'

const route = useRoute()
const { site, isOwner, ownerApi, path } = useSite()
const toast = useToast()
const isNew = computed(() => route.params.id === 'new')

const form = reactive({
  title: '',
  name: '',
  summary: '',
  font: 'sans-serif' as 'serif' | 'sans-serif',
  alignCenter: false,
  eye: null as DriveFile | null,
  body: '',
})
const original = ref<Page | null>(null)
const keep = new Map<string, PageBlock>()
const files = ref<DriveFile[]>([])
const tab = ref<'write' | 'preview'>('write')
const saving = ref(false)
const picking = ref<'body' | 'eye' | null>(null)
const ta = ref<HTMLTextAreaElement | null>(null)

onMounted(async () => {
  if (!isOwner.value) return
  if (isNew.value) {
    form.name = `p-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`
    return
  }
  try {
    const page = await ownerApi<Page>('pages/show', { pageId: String(route.params.id) })
    original.value = page
    Object.assign(form, {
      title: page.title,
      name: page.name,
      summary: page.summary ?? '',
      font: page.font,
      alignCenter: page.alignCenter,
      eye: page.eyeCatchingImage,
      body: pageBlocksToText(page.content, keep),
    })
    files.value = [...page.attachedFiles]
  }
  catch (e) {
    toast.error(e)
  }
})

const blocks = computed(() => pageTextToBlocks(form.body, { keep, host: site.value!.host }))
const preview = computed(() => splitPageContent(blocks.value))

function insert(text: string) {
  const el = ta.value
  if (!el) {
    form.body += text
    return
  }
  const { selectionStart: s, selectionEnd: e } = el
  const before = form.body.slice(0, s)
  const pad = before && !before.endsWith('\n') ? '\n' : ''
  form.body = `${before}${pad}${text}${form.body.slice(e)}`
  nextTick(() => {
    el.focus()
    el.selectionStart = el.selectionEnd = s + pad.length + text.length
  })
}

function onPick(picked: DriveFile[]) {
  if (picking.value === 'eye') form.eye = picked[0] ?? null
  else {
    for (const f of picked) if (!files.value.some(x => x.id === f.id)) files.value.push(f)
    insert(`${picked.map(f => `![이미지](file:${f.id})`).join('\n\n')}\n`)
  }
  picking.value = null
}

async function save() {
  if (!form.title.trim()) return toast.error('제목을 입력해 주세요.')
  if (!PAGE_NAME_RE.test(form.name) || form.name === CONFIG_PAGE_NAME) return toast.error('주소(name)에 쓸 수 없는 글자가 있어요.')
  saving.value = true
  const params = {
    title: form.title.trim(),
    name: form.name,
    summary: form.summary || null,
    content: blocks.value,
    variables: original.value?.variables ?? [],
    script: original.value?.script ?? '',
    font: form.font,
    alignCenter: form.alignCenter,
    hideTitleWhenPinned: original.value?.hideTitleWhenPinned ?? false,
    eyeCatchingImageId: form.eye?.id ?? null,
  }
  try {
    if (original.value) await ownerApi('pages/update', { pageId: original.value.id, ...params })
    else await ownerApi<Page>('pages/create', params)
    toast.info('저장했어요.')
    navigateTo(path(`pages/${encodeURIComponent(form.name)}`))
  }
  catch (e) {
    toast.error(e instanceof MisskeyApiError && e.code === 'NAME_ALREADY_EXISTS' ? new Error('같은 주소의 페이지가 이미 있어요.') : e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="!isOwner" class="mh-empty">주인만 쓸 수 있어요.</div>
  <div v-else>
    <div class="mh-row">
      <h1 class="mh-page-title grow">{{ isNew ? '새 글' : '글 수정' }}</h1>
      <button class="mh-btn primary" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</button>
    </div>
    <section class="mh-box">
      <label class="mh-field"><span>제목</span><input v-model="form.title" class="mh-input" maxlength="256"></label>
      <div class="two">
        <label class="mh-field"><span>주소</span><input v-model.trim="form.name" class="mh-input" maxlength="256"><small>/pages/{{ form.name }}</small></label>
        <label class="mh-field"><span>글꼴</span>
          <select v-model="form.font" class="mh-select"><option value="sans-serif">고딕</option><option value="serif">명조</option></select>
        </label>
      </div>
      <label class="mh-field"><span>요약</span><input v-model="form.summary" class="mh-input" maxlength="256"></label>
      <div class="mh-row">
        <span>대표 이미지</span>
        <img v-if="form.eye" class="eye" :src="form.eye.thumbnailUrl ?? form.eye.url" alt="">
        <button class="mh-btn small" @click="picking = 'eye'">고르기</button>
        <button v-if="form.eye" class="mh-btn small" @click="form.eye = null">빼기</button>
        <span class="mh-spacer" />
        <label class="mh-check"><input v-model="form.alignCenter" type="checkbox"> 가운데 정렬</label>
      </div>
    </section>

    <section class="mh-box">
      <div class="mh-tabs">
        <button :class="{ on: tab === 'write' }" @click="tab = 'write'">쓰기</button>
        <button :class="{ on: tab === 'preview' }" @click="tab = 'preview'">미리보기</button>
      </div>
      <template v-if="tab === 'write'">
        <div class="mh-row tools">
          <button class="mh-btn small" @click="picking = 'body'">🖼 이미지</button>
          <button class="mh-btn small" @click="insert('# 소제목\n')"># 소제목</button>
          <button class="mh-btn small" @click="insert('::: 접기 펼쳐 보기\n내용\n:::\n')">▶ 접기</button>
          <button class="mh-btn small" @click="insert('---\n')">― 구분선</button>
        </div>
        <textarea ref="ta" v-model="form.body" class="mh-textarea body" spellcheck="false" />
        <details class="help mh-muted">
          <summary>문법 도움말</summary>
          <ul>
            <li>평범한 글은 MFM 그대로 (<code>**굵게**</code>, <code>$[x2 크게]</code>, <code>&lt;center&gt;</code> …)</li>
            <li><code># 제목</code> / <code>## 소제목</code> → 미스키 페이지 섹션</li>
            <li><code>::: 접기 제목</code> … <code>:::</code> → 접는 섹션</li>
            <li><code>![이미지](file:파일ID)</code> → 이미지 블록, 노트 주소 한 줄 → 노트 블록</li>
            <li>목록(<code>- </code>), 표(<code>| a | b |</code>), 구분선(<code>---</code>)도 써요</li>
          </ul>
        </details>
      </template>
      <div v-else :class="{ serif: form.font === 'serif', center: form.alignCenter }">
        <PageProperties v-if="preview.properties" :properties="preview.properties" />
        <PageBlocks :blocks="preview.blocks" :files="files" />
      </div>
    </section>

    <AdminDrivePicker v-if="picking" :multiple="picking === 'body'" @close="picking = null" @pick="onPick" />
  </div>
</template>

<style scoped>
.grow {
  flex: 1;
}
.mh-box + .mh-box {
  margin-top: 14px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
}
.eye {
  width: 48px;
  height: 32px;
  object-fit: cover;
}
.tools {
  margin-bottom: 6px;
}
.body {
  min-height: 420px;
  font-family: var(--font-mono);
  font-size: 13px;
}
.help ul {
  margin: 4px 0;
  padding-left: 1.4em;
}
.serif {
  font-family: 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif;
}
.center :deep(.blocks) {
  text-align: center;
}
</style>
