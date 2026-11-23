<script setup lang="ts">
import type { Note } from '~/types/misskey'

/**
 * A note shown as a diary entry / scrap / guestbook post — not a chat bubble.
 * `reactable` adds a 👏 button (works for visitors from other servers too).
 */
const props = defineProps<{ note: Note, reactable?: boolean, hideAuthor?: boolean, removable?: boolean }>()
const emit = defineEmits<{ remove: [] }>()
const { site, current, resolveNote } = useSite()
const toast = useToast()

const n = computed(() => (props.note.renote && !props.note.text ? props.note.renote : props.note))
const showCw = ref(false)
const lightbox = ref<number | null>(null)
const busy = ref(false)
const host = computed(() => n.value.user.host ?? site.value?.host)
const reactionTotal = computed(() => Object.values(n.value.reactions ?? {}).reduce((a, b) => a + b, 0))
const topReactions = computed(() => Object.entries(n.value.reactions ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6))

function reactionImg(r: string) {
  const m = /^:([^@:]+)(?:@([^:]+))?:$/.exec(r)
  if (!m) return null
  const name = `${m[1]}${m[2] && m[2] !== '.' ? `@${m[2]}` : ''}`
  return n.value.reactionEmojis?.[name] ?? (host.value ? `https://${host.value}/emoji/${m[1]}.webp` : null)
}

async function clap() {
  if (!current.value) return toast.info('로그인하면 박수를 보낼 수 있어요.')
  busy.value = true
  try {
    const { account, noteId } = await resolveNote(n.value.id)
    await apiCall(account.host, 'notes/reactions/create', { noteId, reaction: '👏' }, account.token)
    n.value.reactions = { ...n.value.reactions, '👏': (n.value.reactions['👏'] ?? 0) + 1 }
    toast.info('👏 박수를 보냈어요!')
  }
  catch (e) {
    toast.error(e instanceof MisskeyApiError && e.code === 'ALREADY_REACTED' ? new Error('이미 반응한 글이에요.') : e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <article class="note">
    <header v-if="!props.hideAuthor" class="who">
      <img v-if="n.user.avatarUrl" class="av" :src="n.user.avatarUrl" alt="" loading="lazy">
      <NuxtLink class="name" :to="sitePath(n.user.username, host!)"><MfmText :text="n.user.name ?? n.user.username" :emojis="n.user.emojis" :host="host" plain /></NuxtLink>
      <span class="mh-muted acct">@{{ n.user.username }}{{ n.user.host ? `@${n.user.host}` : '' }}</span>
    </header>
    <div class="body">
      <p v-if="n.cw != null" class="cw">
        <MfmText :text="n.cw" :emojis="n.emojis" :host="host" />
        <button class="mh-btn small" @click="showCw = !showCw">{{ showCw ? '접기' : '펼치기' }}</button>
      </p>
      <template v-if="n.cw == null || showCw">
        <MfmText v-if="n.text" class="text" :text="n.text" :emojis="n.emojis" :host="host" />
        <div v-if="n.files.length" class="files" :class="{ one: n.files.length === 1 }">
          <template v-for="(f, i) in n.files" :key="f.id">
            <button v-if="f.type.startsWith('image/')" class="thumb" :class="{ nsfw: f.isSensitive }" @click="lightbox = i">
              <img :src="f.thumbnailUrl ?? f.url" :alt="f.comment ?? ''" loading="lazy">
            </button>
            <a v-else :href="safeHttpUrl(f.url)" target="_blank" rel="noopener noreferrer">📎 {{ f.name }}</a>
          </template>
        </div>
      </template>
    </div>
    <footer class="meta">
      <span v-if="n.visibility === 'specified'" title="비밀글">🔒</span>
      <a class="mh-muted" :href="`https://${site?.host}/notes/${props.note.id}`" target="_blank" rel="noopener noreferrer">{{ formatStamp(n.createdAt) }}</a>
      <span v-if="reactionTotal" class="reacts">
        <span v-for="[r, c] in topReactions" :key="r" class="react">
          <img v-if="reactionImg(r)" class="mfm-emoji" :src="reactionImg(r)!" :alt="r" loading="lazy">
          <img v-else class="twemoji" :src="twemojiUrl(r)" :alt="r">
          {{ c }}
        </span>
      </span>
      <button v-if="props.reactable" class="mh-btn small" :disabled="busy" @click="clap">👏 박수</button>
      <button v-if="props.removable" class="mh-btn small" @click="emit('remove')">클립에서 빼기</button>
    </footer>
    <Lightbox v-if="lightbox != null" :files="n.files" :index="n.files.filter(f => f.type.startsWith('image/')).indexOf(n.files[lightbox]!)" @close="lightbox = null" />
  </article>
</template>

<style scoped>
.note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.who {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.av {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.name {
  font-weight: bold;
}
.acct {
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.text {
  display: block;
  line-height: 1.7;
}
.cw {
  margin: 0;
  display: flex;
  gap: 8px;
  align-items: center;
}
.files {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
  margin-top: 6px;
}
.files.one {
  grid-template-columns: minmax(0, 360px);
}
.thumb {
  padding: 0;
  border: 1px solid var(--border);
  background: var(--bg-embed);
  aspect-ratio: 1;
  overflow: hidden;
  cursor: zoom-in;
}
.files.one .thumb {
  aspect-ratio: auto;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb.nsfw img {
  filter: blur(16px);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
}
.reacts {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}
.react {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
