<script setup lang="ts">
import type { Clip, GalleryPost, Note, Page } from '~/types/misskey'

const { site, api, path, isOwner, notesLocked, notesOff, markNotesHidden } = useSite()
const config = computed(() => site.value!.config)
const owner = computed(() => site.value!.owner)

const home = ref<Page | null>(null)
const pages = ref<Page[]>([])
const posts = ref<GalleryPost[]>([])
const clips = ref<Clip[]>([])
const memos = ref<Note[]>([])
const guests = ref<Note[]>([])

onMounted(async () => {
  const userId = owner.value.id
  const c = config.value
  const tasks: Promise<unknown>[] = [
    api<GalleryPost[]>('users/gallery/posts', { userId, limit: 8 }).then(v => (posts.value = v)).catch(() => {}),
    api<Page[]>('users/pages', { userId, limit: 10 }).then(v => (pages.value = v.filter(p => p.name !== CONFIG_PAGE_NAME))).catch(() => {}),
    api<Clip[]>('users/clips', { userId, limit: 10 }).then(v => (clips.value = v)).catch(() => {}),
  ]
  if (c.homePage) tasks.push(api<Page>('pages/show', { username: site.value!.username, name: c.homePage }).then(v => (home.value = v)).catch(() => {}))
  if (c.menu.some(m => m.type === 'diary')) {
    tasks.push(api<Note[]>('users/notes', { userId, limit: 20, withReplies: false, withRenotes: false, withChannelNotes: false })
      .then((v) => {
        if (!v.length) markNotesHidden()
        memos.value = v.filter(n => n.visibility !== 'specified' && (!c.diaryTag || n.tags?.some(t => t.toLowerCase() === c.diaryTag.toLowerCase()))).slice(0, 5)
      })
      .catch(() => {}))
  }
  if (c.guestbookNoteId) {
    tasks.push(api<Note[]>('notes/children', { noteId: c.guestbookNoteId, limit: 5 }).then(v => (guests.value = v.filter(n => n.replyId === c.guestbookNoteId))).catch(() => {}))
  }
  await Promise.all(tasks)
})

/** One-line plain text of a note: MFM function wrappers, custom emoji codes and tags stripped */
const visual = computed(() => config.value.mainImage || owner.value.avatarUrl || '')

const excerpt = (n: Note) => (n.cw ?? n.text ?? '')
  .replace(/\$\[[\w.,=-]+\s?/g, '')
  .replace(/\]/g, '')
  .replace(/:[\w@.+-]+:/g, '').replace(/(\*\*|__|~~|`)/g, '')
  .replace(/<\/?(?:center|small|plain|i|b|s)>/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 40) || (n.files.length ? '(사진)' : '…')

/** "Update" / "Latest" log across every hidden feature */
const updates = computed(() => {
  const list: { date: string, kind: string, label: string, to: string }[] = [
    ...pages.value.map(p => ({ date: p.updatedAt, kind: Date.parse(p.updatedAt) - Date.parse(p.createdAt) > 86_400_000 ? 'Board 수정' : 'Board', label: p.title || p.name, to: path(`pages/${encodeURIComponent(p.name)}`) })),
    ...posts.value.map(g => ({ date: g.createdAt, kind: 'Gallery', label: g.title, to: path(`gallery/${g.id}`) })),
    ...clips.value.filter(c => c.lastClippedAt).map(c => ({ date: c.lastClippedAt!, kind: 'Scrap', label: c.name, to: path(`clips/${c.id}`) })),
    ...memos.value.map(n => ({ date: n.createdAt, kind: 'Memo', label: excerpt(n), to: path('diary') })),
    ...guests.value.map(n => ({ date: n.createdAt, kind: 'Guest Book', label: n.visibility === 'specified' ? '🔒 비밀글' : `${n.user.name ?? n.user.username}`, to: path('guestbook') })),
  ]
  return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
})

const short = (iso: string) => {
  const d = new Date(iso)
  return new Date().toDateString() === d.toDateString()
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const kindClass = (k: string) => `k-${k.split(' ')[0]!.toLowerCase()}`
</script>

<template>
  <!-- right side of the 갠홈 layout (clock, title and profile live in GaenLeft; the top menu in GaenPinBar) -->
  <div class="gh-board">
    <div class="gh-col">
      <!-- main image → profile picture → an empty frame that keeps the spot -->
      <section class="gh-w gh-visual" :class="{ center: config.mainImageLayout === 'center' || !config.mainImage, fallback: !config.mainImage }">
        <img v-if="visual" :src="visual" alt="">
        <div v-else class="gh-visual-empty">
          <NuxtLink v-if="isOwner" :to="path('admin')">관리 → 꾸미기에서 메인 이미지를 골라요</NuxtLink>
        </div>
      </section>

      <section class="gh-w gh-notice glass">
        <h2 class="gh-h">Notice</h2>
        <div class="gh-scroll">
          <MfmText v-if="config.notice" class="block" :text="config.notice" />
          <PageBlocks v-if="home" :blocks="splitPageContent(home.content).blocks" :files="home.attachedFiles" />
          <MfmText v-else-if="!config.notice && owner.description" class="block" :text="owner.description" :emojis="owner.emojis" />
          <p v-if="isOwner && !config.notice && !home" class="mh-muted"><NuxtLink :to="path('admin')">관리</NuxtLink>에서 공지를 적거나 인사말 페이지를 고를 수 있어요.</p>
        </div>
      </section>
    </div>

    <div class="gh-col">
      <section class="gh-w gh-latest glass">
        <h2 class="gh-h">Latest</h2>
        <ul v-if="updates.length" class="gh-log">
          <li v-for="u in updates" :key="u.kind + u.to + u.date">
            <span class="tag" :class="kindClass(u.kind)">{{ u.kind }}</span>
            <NuxtLink :to="u.to" class="lbl">{{ u.label }}</NuxtLink>
            <span class="dots" />
            <time>{{ short(u.date) }}</time>
          </li>
        </ul>
        <p v-else-if="!notesLocked" class="mh-muted">아직 소식이 없어요.</p>
        <LockedNotes v-if="notesLocked && !notesOff" small />
      </section>

      <GaenPinnedNotes />

      <section class="gh-w gh-banner glass">
        <h2 class="gh-h">Banner</h2>
        <div class="gh-scroll"><GaenBanners /></div>
      </section>
    </div>
  </div>
</template>
