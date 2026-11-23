<script setup lang="ts">
import type { Note } from '~/types/misskey'

/** A note referenced by a page block, fetched from the site's server. */
const props = defineProps<{ noteId: string }>()
const { api, site } = useSite()
const note = ref<Note | null>(null)
const failed = ref(false)
const locked = ref(false)

watchEffect(async () => {
  failed.value = false
  locked.value = false
  try {
    note.value = await api<Note>('notes/show', { noteId: props.noteId })
  }
  catch (e) {
    if (e instanceof MisskeyApiError && e.code === 'CONTENT_RESTRICTED_BY_SERVER') locked.value = true
    else failed.value = true
  }
})
</script>

<template>
  <NoteCard v-if="note && !note.isHidden" :note="note" />
  <LockedNotes v-else-if="locked || note?.isHidden" small />
  <a v-else-if="failed" class="mh-muted" :href="`https://${site?.host}/notes/${props.noteId}`" target="_blank" rel="noopener noreferrer">노트를 불러오지 못했어요 ↗</a>
  <p v-else class="mh-muted">…</p>
</template>
