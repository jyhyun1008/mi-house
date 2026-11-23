<script setup lang="ts">
import type { MenuItem } from '~/utils/site'

const route = useRoute()
const { site, skin, current, isOwner, path } = useSite()
const { accounts } = useAccounts()

const parsed = computed(() => parseSiteParam(String(route.params.site ?? '')))
const error = ref('')
const loading = ref(false)

async function load() {
  const p = parsed.value
  if (!p) {
    error.value = '주소가 올바르지 않아요. /@아이디@서버 모양이어야 해요.'
    return
  }
  const key = `${p.username}@${p.host}`
  if (site.value?.key === key) return
  site.value = null
  error.value = ''
  loading.value = true
  try {
    // Signed in on that server → fetch as that account (sees likes, own secret posts)
    const token = accounts.value.find(a => a.host === p.host && a.key === current.value?.key)?.token
    site.value = await loadSite(p.username, p.host, token)
  }
  catch (e) {
    error.value = e instanceof MisskeyApiError && e.code === 'NO_SUCH_USER'
      ? '그런 사람이 이 서버에 없어요.'
      : e instanceof MisskeyApiError && (e.status === 401 || e.status === 403)
        ? '이 서버는 로그인한 사람에게만 내용을 보여줘요.'
        : `불러오지 못했어요: ${e instanceof Error ? e.message : String(e)}`
  }
  finally {
    loading.value = false
  }
}
watch(() => route.params.site, load, { immediate: true })

const config = computed(() => (site.value ? { ...site.value.config, skin: skin.value } : undefined))

// --- ENTER splash: once per browser session per site ---
const entered = ref(true)
watch(() => site.value?.key, (key) => {
  if (!key || !config.value?.enter.enabled) return (entered.value = true)
  try {
    entered.value = sessionStorage.getItem(`mihouse:entered:${key}`) === '1'
  }
  catch {
    entered.value = false
  }
}, { immediate: true })
function enter() {
  entered.value = true
  try {
    sessionStorage.setItem(`mihouse:entered:${site.value!.key}`, '1')
  }
  catch { /* ignore */ }
}

// colour mode: the owner's choice, or the visitor's device when set to auto
const prefersDark = ref(false)
let darkQuery: MediaQueryList | null = null
const onSchemeChange = (e: MediaQueryListEvent) => (prefersDark.value = e.matches)
onMounted(() => {
  darkQuery = matchMedia('(prefers-color-scheme: dark)')
  prefersDark.value = darkQuery.matches
  darkQuery.addEventListener('change', onSchemeChange)
})
onBeforeUnmount(() => darkQuery?.removeEventListener('change', onSchemeChange))
const isDark = computed(() => config.value?.colorMode === 'dark' || (config.value?.colorMode === 'auto' && prefersDark.value))

const vars = computed(() => {
  const c = config.value
  if (!c) return {}
  const v: Record<string, string> = { '--accent': c.accent }
  v['--font'] = FONT_STACKS[c.bodyFont]
  v['--title-font'] = FONT_STACKS[c.titleFont]
  if (c.background) Object.assign(v, { '--site-bg': `url("${c.background}")`, '--site-bg-size': 'cover' })
  if (c.mainImage) v['--main-image'] = `url("${c.mainImage}")`
  return v
})

// Owner's own CSS, scoped to the site root (see scopedCss)
let styleEl: HTMLStyleElement | null = null
watchEffect(() => {
  const css = config.value ? scopedCss(config.value.customCss) : ''
  if (!css) {
    styleEl?.remove()
    styleEl = null
    return
  }
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.dataset.mihouse = 'custom'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = css
})
onBeforeUnmount(() => styleEl?.remove())

useHead({ title: () => (config.value?.title ?? '이치고아메').replace(/:[a-zA-Z0-9_+-]+:/g, '').trim() || '이치고아메' })

function menuTo(m: MenuItem): string {
  switch (m.type) {
    case 'home': return path()
    case 'clip': return path(`clips/${m.clipId ?? ''}`)
    case 'page': return path(`pages/${encodeURIComponent(m.pageName ?? '')}`)
    case 'link': return m.url ?? '#'
    default: return path(m.type)
  }
}

/** Highlight the menu entry for the current section (a clip/page entry wins over the list it's in). */
function isActive(m: MenuItem) {
  const here = decodeURI(route.path).replace(/\/$/, '')
  const to = decodeURI(menuTo(m)).replace(/\/$/, '')
  if (m.type === 'home') return here === to
  if (here === to) return true
  if (!here.startsWith(`${to}/`)) return false
  // /clips/:id belongs to a "clip" entry for that clip if there is one
  return !config.value!.menu.some(o => o !== m && o.type !== 'link' && decodeURI(menuTo(o)) === here)
}

/** 공공누리 제1유형 asks for the source wherever the Busan Dandi fonts are shown */
const usesDandi = computed(() => !!config.value && [config.value.bodyFont, config.value.titleFont].some(f => f !== 'mona12'))

// --- 갠홈 layout: Top is the widget board, every other section opens in a window ---
const isTop = computed(() => site.value && decodeURI(route.path).replace(/\/$/, '') === path())
const activeLabel = computed(() => {
  if (route.path.startsWith(path('admin'))) return 'Admin'
  return config.value?.menu.find(m => m.type !== 'home' && isActive(m))?.label ?? ''
})
</script>

<template>
  <div v-if="error" class="mh-site mh-gaen theme-glass">
    <div class="gh-stage"><div class="gh-state glass"><p>{{ error }}</p><NuxtLink class="mh-btn" to="/">이치고아메 처음으로</NuxtLink></div></div>
  </div>
  <div v-else-if="loading || !site || !config" class="mh-site mh-gaen theme-glass">
    <div class="gh-stage"><p class="gh-loading">Now Loading…</p></div>
  </div>

  <div v-else class="mh-site mh-gaen" :class="[`theme-${config.skin}`, { 'mh-dark': isDark }]" :style="vars">
    <!-- frame theme: border around the whole screen -->
    <div class="gh-deco" aria-hidden="true"><i /><i /><i /><i /></div>
    <GaenBgEffect :effect="config.bgEffect" />

    <div v-if="!entered" class="gh-stage">
      <div class="gh-enter glass">
        <h1 class="gh-logo"><MfmText :text="config.title" :emojis="site.owner.emojis" plain /></h1>
        <p v-if="config.subtitle" class="gh-sub">{{ config.subtitle }}</p>
        <div v-if="config.enter.warning" class="warning"><MfmText :text="config.enter.warning" /></div>
        <p class="links">
          <button class="enter-btn" @click="enter">{{ config.enter.text }}</button>
          <a class="mh-muted" href="https://www.google.com/">EXIT</a>
        </p>
      </div>
    </div>

    <template v-else>
      <nav class="mh-nav gh-dock" aria-label="메뉴">
        <ul>
          <li v-for="m in config.menu" :key="m.id">
            <a v-if="m.type === 'link'" :href="safeHttpUrl(m.url)" target="_blank" rel="noopener noreferrer" :title="m.label"><span class="ic"><DockIcon :type="m.type" :skin="config.skin" /></span><span class="lb">{{ m.label }}</span></a>
            <NuxtLink v-else :to="menuTo(m)" :class="{ 'mh-on': isActive(m) }" :title="m.label"><span class="ic"><DockIcon :type="m.type" :skin="config.skin" /></span><span class="lb">{{ m.label }}</span></NuxtLink>
          </li>
          <li v-if="isOwner"><NuxtLink :to="path('admin')" :class="{ 'mh-on': route.path.startsWith(path('admin')) }" title="관리"><span class="ic"><DockIcon type="admin" :skin="config.skin" /></span><span class="lb">Admin</span></NuxtLink></li>
        </ul>
      </nav>
      <div class="gh-stage">
        <div class="gh-shell" :class="{ inner: !isTop }">
          <GaenLeft />
          <GaenPinBar />
          <NuxtPage v-if="isTop" />
          <section v-else class="gh-window">
            <header class="gh-window-bar">
              <span class="gh-window-title">{{ activeLabel }}</span>
              <NuxtLink class="gh-close" :to="path()" aria-label="닫기">×</NuxtLink>
            </header>
            <div class="gh-window-body mh-main"><NuxtPage /></div>
          </section>
          <div v-if="!isTop" id="gh-cate-slot" class="gh-cate-slot" />
        </div>
      </div>
      <footer class="gh-foot">
        <MfmText v-if="config.footer" :text="config.footer" />
        <span><template v-if="config.since">since {{ config.since }} · </template><NuxtLink to="/">이치고아메</NuxtLink></span>
        <span v-if="usesDandi" title="공공누리 제1유형">font: 부산단디 ⓒ부산광역시</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.gh-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 40px;
  text-align: center;
}
.gh-loading {
  letter-spacing: 0.3em;
  color: var(--fg-muted);
}
.gh-enter {
  width: min(560px, 100%);
  padding: 40px 32px;
  text-align: center;
}
.gh-enter .gh-logo {
  font-size: clamp(28px, 5vw, 48px);
}
.warning {
  margin: 24px 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  text-align: left;
  white-space: pre-wrap;
}
.links {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 28px;
  margin: 24px 0 0;
}
.enter-btn {
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 22px;
  letter-spacing: 0.3em;
  cursor: pointer;
  animation: blink 1.6s ease-in-out infinite;
}
@keyframes blink {
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .enter-btn { animation: none; }
}
</style>
