<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { TagCount } from '~/composables/useTagFilter'

/** CATEGORY card made of hashtags, shown next to the section window. */
const props = defineProps<{ tags: TagCount[], active: string | null, total: number, to: (tag: string | null) => RouteLocationRaw, note?: string }>()
</script>

<template>
  <!-- rendered as its own card beside the section window (slot lives in pages/[site].vue) -->
  <Teleport defer to="#gh-cate-slot">
  <aside class="bt-cate">
    <h2 class="bt-cate-title">Category</h2>
    <ul>
      <li :class="{ on: !props.active }"><NuxtLink :to="props.to(null)">전체 <small>({{ props.total }})</small></NuxtLink></li>
      <li v-for="t in props.tags" :key="t.tag" :class="{ on: props.active?.toLowerCase() === t.tag.toLowerCase() }">
        <NuxtLink :to="props.to(t.tag)">#{{ t.tag }} <small>({{ t.count }})</small></NuxtLink>
      </li>
    </ul>
    <p v-if="!props.tags.length" class="bt-cate-empty">#해시태그를 달면 여기 카테고리로 모여요.</p>
    <p v-else-if="props.note" class="bt-cate-empty">{{ props.note }}</p>
  </aside>
  </Teleport>
</template>
