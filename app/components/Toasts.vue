<script setup lang="ts">
const { toasts } = useToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">{{ t.text }}</div>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transform: translateX(-50%);
  pointer-events: none;
}
.toast {
  padding: 8px 14px;
  background: #333;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
}
.toast.error {
  background: #b33;
}
</style>
