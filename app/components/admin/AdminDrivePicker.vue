<script setup lang="ts">
import type { DriveFile } from '~/types/misskey'

/** Pick (or upload) images from the owner's Misskey drive. */
const props = defineProps<{ multiple?: boolean }>()
const emit = defineEmits<{ pick: [files: DriveFile[]], close: [] }>()
const { ownerApi, local } = useSite()
const toast = useToast()
const selected = ref<DriveFile[]>([])
const uploading = ref(false)
const input = ref<HTMLInputElement | null>(null)

const { items, loading, done, more, reset } = usePaged<DriveFile>(untilId =>
  ownerApi<DriveFile[]>('drive/files', { limit: 30, untilId, type: 'image/*' }), 30)
onMounted(more)

function toggle(f: DriveFile) {
  if (!props.multiple) return emit('pick', [f])
  const i = selected.value.findIndex(x => x.id === f.id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(f)
}

async function upload(e: Event) {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  if (!files.length) return
  uploading.value = true
  try {
    const done: DriveFile[] = []
    for (const f of files) done.push(await uploadDriveFile(local.value!.host, local.value!.token, f))
    if (!props.multiple) return emit('pick', done.slice(0, 1))
    selected.value.push(...done)
    await reset()
  }
  catch (err) {
    toast.error(err)
  }
  finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}
</script>

<template>
  <Modal title="드라이브" @close="emit('close')">
    <div class="mh-row bar">
      <button class="mh-btn small primary" :disabled="uploading" @click="input?.click()">{{ uploading ? '올리는 중…' : '⬆ 업로드' }}</button>
      <input ref="input" type="file" accept="image/*" :multiple="props.multiple" hidden @change="upload">
      <span class="mh-spacer" />
      <button v-if="props.multiple" class="mh-btn small" :disabled="!selected.length" @click="emit('pick', selected)">{{ selected.length }}개 선택</button>
    </div>
    <div class="grid">
      <button v-for="f in items" :key="f.id" class="cell" :class="{ on: selected.some(s => s.id === f.id) }" :title="f.name" @click="toggle(f)">
        <img :src="f.thumbnailUrl ?? f.url" :alt="f.name" loading="lazy">
        <span v-if="props.multiple && selected.some(s => s.id === f.id)" class="n">{{ selected.findIndex(s => s.id === f.id) + 1 }}</span>
      </button>
    </div>
    <div v-if="!done" class="mh-more"><button class="mh-btn small" :disabled="loading" @click="more">more</button></div>
  </Modal>
</template>

<style scoped>
.bar {
  margin-bottom: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
}
.cell {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid transparent;
  background: var(--bg-embed);
  cursor: pointer;
  overflow: hidden;
}
.cell.on {
  border-color: var(--accent);
}
.cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.n {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  padding: 0 4px;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 11px;
}
</style>
