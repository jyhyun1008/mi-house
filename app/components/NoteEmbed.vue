<script setup lang="ts">
import type { Note } from '~/types/misskey'

/** A note referenced by a page block, fetched from the site's server. */
const props = defineProps<{ noteId: string }>()
const { api, site } = useSite()
const note = ref<Note | null>(null)
const failed = ref(false)

watchEffect(async () => {
  failed.value = false
  try {
    note.value = await api<Note>('notes/show', { noteId: props.noteId })
  }
  catch {
    failed.value = true
  }
})
</script>

<template>
  <NoteCard v-if="note" :note="note" />
  <a v-else-if="failed" class="mh-muted" :href="`https://${site?.host}/notes/${props.noteId}`" target="_blank" rel="noopener noreferrer">노트를 불러오지 못했어요 ↗</a>
  <p v-else class="mh-muted">…</p>
</template>
