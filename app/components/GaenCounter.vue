<script setup lang="ts">
/**
 * Visit counter. There is no server, so counting is done by an outside service:
 *  - badge: visitor-badge.laobi.icu image (total)
 *  - text:  Abacus JSON counter → "TODAY n · TOTAL n" in the site's own type
 *  - image: any counter image URL the owner pastes ({key} is replaced with this site's key)
 * Each counts once per browser session for this site.
 */
const { site } = useSite()
const config = computed(() => site.value!.config.counter)
const key = computed(() => counterKey(site.value!.username, site.value!.host))
const accent = computed(() => site.value!.config.accent)

const badgeUrl = computed(() => `https://visitor-badge.laobi.icu/badge?${new URLSearchParams({
  page_id: `mi-house.${key.value}`,
  left_text: 'TOTAL',
  left_color: '#555566',
  right_color: accent.value,
})}`)
const imageUrl = computed(() => config.value.imageUrl.replaceAll('{key}', encodeURIComponent(key.value)))

// --- text mode (Abacus) ---
const ABACUS = 'https://abacus.jasoncameron.dev'
const total = ref<number | null>(null)
const today = ref<number | null>(null)
const failed = ref(false)

async function count(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${ABACUS}/${path}`, { signal: AbortSignal.timeout(6000), credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (res.status === 404) return 0
    const body = await res.json()
    return typeof body?.value === 'number' ? body.value : null
  }
  catch {
    return null
  }
}

onMounted(async () => {
  if (config.value.mode !== 'text') return
  const d = new Date()
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const seenKey = `mihouse:counted:${key.value}`
  let first = true
  try {
    first = sessionStorage.getItem(seenKey) !== '1'
    sessionStorage.setItem(seenKey, '1')
  }
  catch { /* private mode: count every view */ }
  const verb = first ? 'hit' : 'get'
  const [t, d1] = await Promise.all([count(`${verb}/mi-house/${key.value}.t`), count(`${verb}/mi-house/${key.value}.d${day}`)])
  total.value = t
  today.value = d1
  failed.value = t == null
})
</script>

<template>
  <div v-if="config.mode !== 'off'" class="gh-counter">
    <img v-if="config.mode === 'badge'" :src="badgeUrl" alt="방문자 수" loading="lazy">
    <img v-else-if="config.mode === 'image' && imageUrl" :src="imageUrl" alt="방문자 수" loading="lazy">
    <p v-else-if="config.mode === 'text'" class="text">
      <span>TODAY <b>{{ today ?? '-' }}</b></span>
      <span>TOTAL <b>{{ total ?? '-' }}</b></span>
      <small v-if="failed" title="카운터 서비스가 응답하지 않아요">(쉬는 중)</small>
    </p>
  </div>
</template>

<style scoped>
.gh-counter {
  margin-top: 10px;
}
.gh-counter img {
  display: block;
  height: 20px;
  width: auto;
}
.text {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  font-family: Tahoma, Verdana, var(--font);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--fg-muted);
}
.text b {
  margin-left: 2px;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.text small {
  letter-spacing: 0;
}
</style>
