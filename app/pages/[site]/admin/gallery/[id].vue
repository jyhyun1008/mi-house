<script setup lang="ts">
import type { DriveFile, GalleryPost } from '~/types/misskey'

const route = useRoute()
const { isOwner, ownerApi, path } = useSite()
const toast = useToast()
const isNew = computed(() => route.params.id === 'new')

const form = reactive({ title: '', description: '', isSensitive: false, files: [] as DriveFile[] })
const picking = ref(false)
const saving = ref(false)

onMounted(async () => {
  if (!isOwner.value || isNew.value) return
  try {
    const p = await ownerApi<GalleryPost>('gallery/posts/show', { postId: String(route.params.id) })
    Object.assign(form, { title: p.title, description: p.description ?? '', isSensitive: p.isSensitive, files: p.files })
  }
  catch (e) {
    toast.error(e)
  }
})

function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= form.files.length) return
  ;[form.files[i], form.files[j]] = [form.files[j]!, form.files[i]!]
}

async function save() {
  if (!form.title.trim()) return toast.error('제목을 입력해 주세요.')
  if (!form.files.length) return toast.error('이미지를 하나 이상 넣어 주세요.')
  saving.value = true
  const params = { title: form.title.trim(), description: form.description || null, fileIds: form.files.map(f => f.id), isSensitive: form.isSensitive }
  try {
    const post = isNew.value
      ? await ownerApi<GalleryPost>('gallery/posts/create', params)
      : await ownerApi<GalleryPost>('gallery/posts/update', { postId: String(route.params.id), ...params })
    toast.info('저장했어요.')
    await useGalleryPosts().load(true).catch(() => {})
    navigateTo(path(`gallery/${post.id}`))
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="!isOwner" class="mh-empty">주인만 올릴 수 있어요.</div>
  <div v-else>
    <div class="mh-row">
      <h1 class="mh-page-title grow">{{ isNew ? '갤러리 업로드' : '갤러리 수정' }}</h1>
      <button class="mh-btn primary" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</button>
    </div>
    <section class="mh-box">
      <label class="mh-field"><span>제목</span><input v-model="form.title" class="mh-input" maxlength="256"></label>
      <label class="mh-field"><span>설명 (MFM)</span><textarea v-model="form.description" class="mh-textarea" maxlength="2048" placeholder="#낙서 #OC 처럼 해시태그를 쓰면 오른쪽 카테고리로 모여요" /><small>설명에 쓴 #해시태그가 갤러리 카테고리가 돼요.</small></label>
      <label class="mh-check"><input v-model="form.isSensitive" type="checkbox"> 민감한 내용 (썸네일 흐리게)</label>
      <div class="mh-field files">
        <span>이미지 ({{ form.files.length }}/32)</span>
        <div class="grid">
          <div v-for="(f, i) in form.files" :key="f.id" class="cell">
            <img :src="f.thumbnailUrl ?? f.url" :alt="f.name">
            <div class="ops">
              <button class="mh-btn small" :disabled="i === 0" @click="move(i, -1)">◀</button>
              <button class="mh-btn small danger" @click="form.files.splice(i, 1)">×</button>
              <button class="mh-btn small" :disabled="i === form.files.length - 1" @click="move(i, 1)">▶</button>
            </div>
          </div>
          <button class="cell add" @click="picking = true">+ 추가 / 업로드</button>
        </div>
      </div>
    </section>
    <AdminDrivePicker v-if="picking" multiple @close="picking = false" @pick="(fs) => { form.files.push(...fs.filter(f => !form.files.some(x => x.id === f.id))); picking = false }" />
  </div>
</template>

<style scoped>
.grow {
  flex: 1;
}
.files {
  margin-top: 12px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.cell {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  background: var(--bg-embed);
  overflow: hidden;
}
.cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ops {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  justify-content: space-between;
  padding: 2px;
}
.add {
  border-style: dashed;
  cursor: pointer;
  color: var(--fg-muted);
}
</style>
