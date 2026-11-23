<script setup lang="ts">
const now = ref(new Date())
let t: ReturnType<typeof setInterval> | undefined
onMounted(() => (t = setInterval(() => (now.value = new Date()), 1000)))
onBeforeUnmount(() => clearInterval(t))
const hm = computed(() => `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`)
const date = computed(() => now.value.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))
</script>

<template>
  <div class="clock">
    <p class="date">{{ date }}</p>
    <p class="hm"><time>{{ hm }}</time></p>
  </div>
</template>

<style scoped>
.clock {
  text-align: center;
}
.date {
  margin: 0;
  font-family: var(--font-hand);
  font-size: 15px;
  letter-spacing: 0.1em;
  color: var(--fg-muted);
}
.hm {
  margin: 0;
  font-family: var(--title-font);
  font-size: 48px;
  line-height: 1.1;
  letter-spacing: 0.04em;
  color: var(--fg-strong);
}
</style>
