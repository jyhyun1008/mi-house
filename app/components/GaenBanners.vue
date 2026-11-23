<script setup lang="ts">
/** BANNER widget: my banner (with the addresses to take it) and friends' banners. */
const { site, isOwner, path } = useSite()
const toast = useToast()
const config = computed(() => site.value!.config)
const open = ref(false)
const siteUrl = computed(() => appUrl(path()))

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.info('복사했어요.')
  }
  catch {
    toast.error('복사하지 못했어요. 직접 선택해 주세요.')
  }
}
</script>

<template>
  <div class="gb">
    <div v-if="config.myBanner" class="mine">
      <button class="mine-img" title="배너 가져가기" @click="open = !open"><img :src="config.myBanner" alt="이 사이트 배너"></button>
      <div v-if="open" class="code">
        <span>Banner</span><code>{{ config.myBanner }}</code><button class="mh-btn small" @click="copy(config.myBanner)">복사</button>
        <span>Link</span><code>{{ siteUrl }}</code><button class="mh-btn small" @click="copy(siteUrl)">복사</button>
      </div>
      <small v-else class="mh-muted">↑ 배너를 누르면 주소가 나와요</small>
    </div>
    <div v-if="config.banners.length" class="list">
      <a v-for="b in config.banners" :key="b.id" :href="b.url || undefined" target="_blank" rel="noopener noreferrer" :title="b.label">
        <img :src="b.image" :alt="b.label" loading="lazy">
      </a>
    </div>
    <p v-else-if="!config.myBanner" class="mh-muted empty">
      <template v-if="isOwner"><NuxtLink :to="path('admin')">관리 → 배너</NuxtLink>에서 내 배너와 친구 배너를 걸 수 있어요.</template>
      <template v-else>Link Free · 배너 교환 환영</template>
    </p>
  </div>
</template>

<style scoped>
.gb {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mine {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.mine-img {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.mine-img img,
.list img {
  display: block;
  width: 200px;
  max-width: 100%;
  /* the usual 200×40 link-exchange banner; other sizes are cropped to fit the row */
  aspect-ratio: 5 / 1;
  object-fit: cover;
}
.code {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 8px;
  width: 100%;
  font-size: 11px;
}
.code code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: inherit;
  color: var(--fg-link);
}
.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 200px));
  justify-content: center;
  gap: 6px;
}
.list a {
  display: block;
  transition: transform 0.15s, filter 0.15s;
}
.list a:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.empty {
  margin: 0;
  text-align: center;
}
</style>
