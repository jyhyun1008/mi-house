<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { GalleryPost } from '~/types/misskey'

/**
 * One gallery post as a big board card: number badge, the picture on the left (click for the
 * original), author / title / text / date on the right, categories and buttons along the bottom.
 * Used one after another in the gallery feed, and alone on a post's own page.
 */
const props = defineProps<{ post: GalleryPost, number?: number | null, closeTo?: RouteLocationRaw }>()
const emit = defineEmits<{ deleted: [] }>()
const { site, ownerApi, path, isOwner } = useSite()
const toast = useToast()
const post = computed(() => props.post)
const reveal = ref(false)
const current = ref(0)
const lightbox = ref<number | null>(null)

const media = computed(() => post.value.files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/')))
const images = computed(() => media.value.filter(f => f.type.startsWith('image/')))
const shown = computed(() => media.value[current.value] ?? null)
const tagsOfPost = computed(() => galleryTags(post.value))
const permalink = computed(() => path(`gallery/${post.value.id}`))
const stamp = computed(() => {
  const d = new Date(post.value.createdAt)
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
})

function onLike(liked: boolean, count: number) {
  Object.assign(props.post, { isLiked: liked, likedCount: count })
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(appUrl(permalink.value))
    toast.info('링크를 복사했어요.')
  }
  catch {
    toast.error('복사하지 못했어요.')
  }
}

async function del() {
  if (!confirm(`"${post.value.title}"을(를) 지울까요?`)) return
  try {
    await ownerApi('gallery/posts/delete', { postId: post.value.id })
    toast.info('지웠어요.')
    emit('deleted')
  }
  catch (e) {
    toast.error(e)
  }
}
</script>

<template>
  <article class="gv">
      <span v-if="props.number" class="gv-no">{{ props.number }}</span>

      <div class="gv-media">
        <div class="gv-stage">
          <p v-if="!post.files.length" class="gv-note">{{ post.isSensitive ? '민감한 이미지는 미스키에 로그인한 사람에게만 보여요.' : '이미지가 없어요.' }}</p>
          <div v-else-if="post.isSensitive && !reveal" class="gv-note">
            <p>민감한 내용이 포함된 게시물이에요.</p>
            <button class="bt-btn" @click="reveal = true">보기</button>
          </div>
          <template v-else-if="shown">
            <button v-if="shown.type.startsWith('image/')" class="gv-img" @click="lightbox = images.indexOf(shown)">
              <img :src="shown.url" :alt="shown.comment ?? post.title">
            </button>
            <video v-else :src="shown.url" controls preload="metadata" />
          </template>
        </div>
        <p v-if="images.length" class="gv-hint">클릭 시 원본 이미지를 확인할 수 있습니다.</p>
        <div v-if="media.length > 1 && (!post.isSensitive || reveal)" class="gv-thumbs">
          <button v-for="(f, i) in media" :key="f.id" :class="{ on: i === current }" :aria-label="`${i + 1}번째`" @click="current = i">
            <img :src="f.thumbnailUrl ?? f.url" alt="" loading="lazy">
          </button>
        </div>
        <NuxtLink v-if="props.closeTo" class="gv-close" :to="props.closeTo">CLOSE</NuxtLink>
      </div>

      <aside class="gv-side">
        <span class="gv-name"><MfmText :text="post.user.name ?? post.user.username" :emojis="post.user.emojis" plain /></span>
        <h2 class="gv-title"><NuxtLink :to="permalink">{{ post.title }}</NuxtLink></h2>
        <MfmText v-if="post.description" class="gv-desc" :text="post.description" />
        <time class="gv-date">{{ stamp }}</time>
        <div class="gv-like">
          <LikeButton kind="gallery" :id="post.id" :liked="post.isLiked" :count="post.likedCount" :href="`https://${site!.host}/gallery/${post.id}`" @change="onLike" />
          <span class="mh-muted">{{ post.files.length }} files</span>
        </div>
      </aside>

      <footer class="gv-bottom">
        <div class="gv-tags">
          <span class="gv-cat">분류</span>
          <NuxtLink v-for="t in tagsOfPost" :key="t" class="gv-tag" :to="{ path: path('gallery'), query: { tag: t } }">#{{ t }}</NuxtLink>
          <span v-if="!tagsOfPost.length" class="mh-muted">없음</span>
        </div>
        <div class="gv-actions">
          <button class="gv-btn" @click="copyLink">링크 복사</button>
          <template v-if="isOwner">
            <NuxtLink class="gv-btn" :to="path(`admin/gallery/${post.id}`)">수정</NuxtLink>
            <button class="gv-btn" @click="del">삭제</button>
          </template>
        </div>
      </footer>

      <Lightbox v-if="lightbox != null" :files="images" :index="lightbox" @close="lightbox = null" />
    </article>
</template>

<style scoped>
.gv {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(220px, 1fr);
  gap: 18px 22px;
  margin: 12px 6px 6px 12px;
  padding: 20px;
  border: 1.5px solid var(--bt-head);
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 3%, #f4f4f6);
  box-shadow: 5px 5px 0 color-mix(in srgb, var(--accent) 18%, rgb(0 0 0 / 0.08));
}
.gv-no {
  position: absolute;
  top: -13px;
  left: -13px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: 3px solid #fff;
  border-radius: 999px;
  background: var(--bt-head);
  color: #fff;
  font-family: Tahoma, Verdana, var(--font);
  font-size: 13px;
  font-weight: 700;
}
.gv-media {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.gv-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
}
.gv-img {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}
.gv-img img,
.gv-stage video {
  display: block;
  width: 100%;
  max-height: 68vh;
  object-fit: contain;
}
.gv-note {
  padding: 40px 16px;
  color: var(--fg-muted);
  text-align: center;
}
.gv-hint {
  margin: 0;
  color: var(--fg-muted);
  font-size: 11px;
  text-align: center;
}
.gv-thumbs {
  display: flex;
  gap: 6px;
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.gv-thumbs button {
  flex: none;
  width: 52px;
  height: 52px;
  padding: 2px;
  border: 1px solid var(--bt-line);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  opacity: 0.6;
}
.gv-thumbs button.on {
  border-color: var(--accent);
  opacity: 1;
}
.gv-thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.gv-close {
  display: block;
  margin-top: 4px;
  padding: 5px 0;
  border: 1px solid var(--bt-line);
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent) 4%, #fafafb);
  color: var(--fg-strong);
  font-family: Tahoma, Verdana, var(--font);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-align: center;
  text-decoration: none !important;
}
.gv-close:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.gv-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding-top: 18px;
}
.gv-name {
  padding: 1px 7px;
  background: color-mix(in srgb, var(--accent) 22%, #fff);
  color: var(--bt-head);
  font-size: 12px;
  font-weight: 700;
}
.gv-title a {
  color: inherit;
}
.gv-title {
  margin: 0;
  color: var(--fg-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}
.gv-desc {
  display: block;
  font-size: 12.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.gv-date {
  color: var(--fg-muted);
  font-family: Tahoma, Verdana, var(--font);
  font-size: 12px;
}
.gv-like {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.gv-bottom {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.gv-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.gv-cat {
  padding: 2px 7px;
  border-radius: 3px;
  background: var(--bt-head);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.gv-tag {
  padding: 1px 8px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--accent) 18%, #fff);
  color: var(--bt-head);
  text-decoration: none !important;
}
.gv-tag:hover {
  background: var(--accent);
  color: #fff;
}
.gv-actions {
  display: flex;
  gap: 4px;
}
.gv-btn {
  padding: 2px 10px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, #ccc);
  border-radius: 999px;
  background: #fff;
  color: color-mix(in srgb, var(--accent) 70%, #555);
  font-size: 11px;
  cursor: pointer;
  text-decoration: none !important;
}
.gv-btn:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}
@media (max-width: 760px) {
  .gv {
    grid-template-columns: minmax(0, 1fr);
    padding: 14px;
  }
  .gv-side {
    padding-top: 0;
  }
}
</style>
