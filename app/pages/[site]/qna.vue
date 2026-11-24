<script setup lang="ts">
/** Q&A: the owner's answered neo-quesdon questions. */
const { site, isOwner, path } = useSite()
const handle = computed(() => site.value!.config.quesdon)
</script>

<template>
  <div class="bt">
    <div class="bt-head">
      <h1 class="bt-title">Q&amp;A</h1>
    </div>
    <QnaBoard v-if="handle" />
    <div v-else class="mh-empty">
      아직 질문함이 없어요.
      <p v-if="isOwner"><NuxtLink class="mh-btn primary" :to="path('admin')">관리 → 방명록·박수에서 네퀘돈 계정을 넣어요</NuxtLink></p>
    </div>
  </div>
</template>
