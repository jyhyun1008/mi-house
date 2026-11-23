<script setup lang="ts">
/** One line-ish piece of page text (a table cell, a list item): MFM with inline `![alt](https://…)` images. */
const props = defineProps<{ text: string }>()

const parts = computed(() => splitInlineImages(props.text))
</script>

<template>
  <span class="inline">
    <template v-for="(p, i) in parts" :key="i">
      <MfmText v-if="p.type === 'text'" :text="p.text" />
      <a v-else class="img" :href="p.url" target="_blank" rel="noopener noreferrer">
        <img :src="p.url" :alt="p.alt" loading="lazy" referrerpolicy="no-referrer">
      </a>
    </template>
  </span>
</template>

<style scoped>
.img {
  display: block;
  margin: 4px auto;
  max-width: 100%;
  text-align: center;
}
.img img {
  display: block;
  max-width: 100%;
  max-height: 360px;
  margin: 0 auto;
  border-radius: 4px;
  object-fit: contain;
}
</style>
