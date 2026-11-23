<script setup lang="ts">
import { PhQuotes } from '@phosphor-icons/vue'
import type { Note } from '~/types/misskey'

/** Notes pinned on the Misskey profile, listed under Latest; each opens in a popup. */
const { site } = useSite()
const notes = computed(() => (site.value!.owner.pinnedNotes ?? []).slice(0, 5))
const opened = ref<Note | null>(null)

const label = (n: Note) => (n.cw ?? n.text ?? '')
  .replace(/\$\[[\w.,=-]+\s?/g, '').replace(/\]/g, '').replace(/:[\w@.+-]+:/g, '').replace(/(\*\*|__|~~|`)/g, '').replace(/\s+/g, ' ').trim()
  || (n.files.length ? '(사진)' : '노트')
</script>

<template>
  <section v-if="notes.length" class="gh-w gh-pinned glass">
    <h2 class="gh-h">Pinned</h2>
    <ul class="gh-pinned-list">
      <li v-for="n in notes" :key="n.id">
        <button @click="opened = n">
          <PhQuotes :size="15" weight="duotone" aria-hidden="true" />
          <span>{{ label(n) }}</span>
        </button>
      </li>
    </ul>
    <Modal v-if="opened" title="고정한 노트" @close="opened = null">
      <NoteCard :note="opened" reactable />
    </Modal>
  </section>
</template>
