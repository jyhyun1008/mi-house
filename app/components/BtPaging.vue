<script setup lang="ts">
/** Old board style page numbers: ◀ [1] 2 3 ▶ (kept in ?page=). */
const props = defineProps<{ page: number, pages: number }>()
const route = useRoute()

const WINDOW = 10
const nums = computed(() => {
  const start = Math.floor((props.page - 1) / WINDOW) * WINDOW + 1
  return Array.from({ length: Math.min(WINDOW, props.pages - start + 1) }, (_, i) => start + i)
})
function to(p: number) {
  const query = { ...route.query }
  if (p > 1) query.page = String(p)
  else delete query.page
  return { path: route.path, query }
}
</script>

<template>
  <nav v-if="props.pages > 1" class="bt-paging" aria-label="페이지">
    <NuxtLink v-if="nums[0]! > 1" :to="to(nums[0]! - 1)" class="arrow">◀ 이전</NuxtLink>
    <template v-for="n in nums" :key="n">
      <b v-if="n === props.page" class="cur">[{{ n }}]</b>
      <NuxtLink v-else :to="to(n)">{{ n }}</NuxtLink>
    </template>
    <NuxtLink v-if="nums.at(-1)! < props.pages" :to="to(nums.at(-1)! + 1)" class="arrow">다음 ▶</NuxtLink>
  </nav>
</template>
