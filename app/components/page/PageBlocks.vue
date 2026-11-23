<script setup lang="ts">
import type { DriveFile, PageBlock } from '~/types/misskey'

const props = defineProps<{ blocks: PageBlock[], files: DriveFile[], depth?: number }>()

const depth = computed(() => props.depth ?? 0)
const lightbox = ref<DriveFile | null>(null)

function file(id: string | null | undefined) {
  return id ? props.files.find(f => f.id === id) : undefined
}
</script>

<template>
  <div class="blocks">
    <template v-for="b in props.blocks" :key="b.id">
      <PageMarkdown v-if="b.type === 'text' && b.text" class="text" :text="b.text" />

      <details v-else-if="isToggleSection(b)" class="toggle">
        <summary>{{ toggleTitle(b) }}</summary>
        <PageBlocks class="toggle-body" :blocks="b.children ?? []" :files="props.files" :depth="depth" />
      </details>

      <section v-else-if="b.type === 'section'" class="section">
        <component :is="depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4'" class="mh-heading">{{ b.title }}</component>
        <PageBlocks :blocks="b.children ?? []" :files="props.files" :depth="depth + 1" />
      </section>

      <template v-else-if="b.type === 'image'">
        <button v-if="file(b.fileId)?.type.startsWith('image/')" class="image" @click="lightbox = file(b.fileId)!">
          <img :src="file(b.fileId)!.url" :alt="file(b.fileId)!.comment ?? ''" loading="lazy">
        </button>
        <a v-else-if="file(b.fileId)" class="attach" :href="safeHttpUrl(file(b.fileId)!.url)" target="_blank" rel="noopener noreferrer">📎 {{ file(b.fileId)!.name }}</a>
      </template>

      <NoteEmbed v-else-if="b.type === 'note' && b.note" :note-id="b.note" />
    </template>

    <Lightbox v-if="lightbox" :files="[lightbox]" @close="lightbox = null" />
  </div>
</template>

<style scoped>
.blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.text {
  line-height: 1.8;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}
.toggle {
  border: 1px solid var(--border);
  background: var(--bg-embed);
}
.toggle > summary {
  padding: 6px 10px;
  cursor: pointer;
  font-weight: bold;
}
.toggle-body {
  padding: 8px 12px 12px;
}
.image {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}
.image img {
  display: block;
  max-width: 100%;
  max-height: 80vh;
  margin: 0 auto;
  object-fit: contain;
}
.attach {
  align-self: flex-start;
}
</style>
