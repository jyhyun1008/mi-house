<script setup lang="ts">
import type { DriveFile } from '~/types/misskey'

const props = defineProps<{ files: DriveFile[], index?: number }>()
const emit = defineEmits<{ close: [] }>()
const i = ref(props.index ?? 0)
const images = computed(() => props.files.filter(f => f.type.startsWith('image/')))
const cur = computed(() => images.value[i.value])

function step(d: number) {
  const n = images.value.length
  if (n) i.value = (i.value + d + n) % n
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="lb" @click.self="emit('close')">
      <img v-if="cur" :src="cur.url" :alt="cur.comment ?? ''" @click="emit('close')">
      <p v-if="cur?.comment" class="cap">{{ cur.comment }}</p>
      <template v-if="images.length > 1">
        <button class="nav prev" aria-label="이전" @click="step(-1)">‹</button>
        <button class="nav next" aria-label="다음" @click="step(1)">›</button>
        <span class="count">{{ i + 1 }} / {{ images.length }}</span>
      </template>
      <button class="close" aria-label="닫기" @click="emit('close')">×</button>
    </div>
  </Teleport>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgb(0 0 0 / 0.85);
  padding: 24px;
}
img {
  max-width: 100%;
  max-height: calc(100vh - 80px);
  object-fit: contain;
  cursor: zoom-out;
}
.cap,
.count {
  margin: 0;
  color: #ddd;
  font-size: 13px;
}
.count {
  position: absolute;
  top: 16px;
  left: 16px;
}
button {
  position: absolute;
  border: 0;
  background: rgb(0 0 0 / 0.4);
  color: #fff;
  font-size: 32px;
  line-height: 1;
  width: 44px;
  height: 44px;
  cursor: pointer;
}
.close { top: 8px; right: 8px; }
.prev { left: 8px; top: 50%; }
.next { right: 8px; top: 50%; }
</style>
