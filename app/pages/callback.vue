<script setup lang="ts">
const route = useRoute()
const error = ref('')

onMounted(async () => {
  try {
    const session = String(route.query.session ?? '')
    if (!session) throw new Error('세션 정보가 없습니다.')
    const { returnTo } = await finishMiAuth(session)
    await navigateTo(returnTo, { replace: true })
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <div class="cb">
    <template v-if="error">
      <p class="err">{{ error }}</p>
      <NuxtLink class="mh-btn" to="/">처음으로</NuxtLink>
    </template>
    <p v-else>Now Loading…</p>
  </div>
</template>

<style scoped>
.cb {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-family: Verdana, var(--font);
  letter-spacing: 0.2em;
  color: var(--fg-muted);
}
.err {
  color: #c33;
  letter-spacing: 0;
}
</style>
