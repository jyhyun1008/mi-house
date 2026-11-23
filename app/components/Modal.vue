<script setup lang="ts">
const props = defineProps<{ title?: string }>()
const emit = defineEmits<{ close: [] }>()
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to=".mh-site">
    <div class="modal-bg" @click.self="emit('close')">
      <div class="mh-box modal" role="dialog" aria-modal="true">
        <div class="mh-row head">
          <h2 class="mh-box-title grow">{{ props.title }}</h2>
          <button class="mh-btn small" aria-label="닫기" @click="emit('close')">×</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-bg {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 0.45);
}
.modal {
  width: min(560px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
}
.head {
  margin-bottom: 8px;
}
.head .mh-box-title {
  margin: 0;
}
.grow {
  flex: 1;
}
</style>
