<script setup lang="ts">
import { PhBookOpen, PhLink, PhPushPin } from '@phosphor-icons/vue'
import type { Page } from '~/types/misskey'
import type { MenuItem } from '~/utils/site'

/**
 * Pin bar above the main image: links the owner entered (places inside this site).
 * Without any, the page pinned on the Misskey profile, then the menu entries stand in.
 */
const { site, api, path, menu, notesOff } = useSite()
const config = computed(() => site.value!.config)
const owner = computed(() => site.value!.owner)

/** titles of linked pages, for links without a label */
const titles = ref<Record<string, string>>({})
onMounted(async () => {
  const names = config.value.pinBar.filter(l => !l.label && l.path.startsWith('pages/')).map(l => decodeURIComponent(l.path.slice(6)))
  const got = await Promise.all(names.map(name => api<Page>('pages/show', { username: site.value!.username, name }).catch(() => null)))
  titles.value = Object.fromEntries(got.filter((p): p is Page => !!p).map(p => [p.name, p.title || p.name]))
})

const SECTION: Record<string, string> = { pages: 'Board', gallery: 'Gallery', clips: 'Scrap', about: 'About', diary: 'Diary', guestbook: 'Guestbook' }
function labelOf(p: string, label: string) {
  if (label) return label
  const [section, rest] = p.split('/') as [string, string | undefined]
  if (section === 'pages' && rest) return titles.value[decodeURIComponent(rest)] ?? decodeURIComponent(rest)
  return rest ? `${SECTION[section] ?? section} · ${decodeURIComponent(rest)}` : (SECTION[section] ?? section)
}

type Pin = { key: string, label: string, to: string, icon: 'link' | 'page' | 'pin' | MenuItem }

const pins = computed<Pin[]>(() => {
  if (config.value.pinBar.length) {
    return config.value.pinBar.filter(l => !(notesOff.value && isNotePath(l.path))).map(l => ({ key: l.path, label: labelOf(l.path, l.label), to: path(l.path), icon: l.path.startsWith('pages/') ? 'page' : 'link' }))
  }
  const pinned = owner.value.pinnedPage
  if (pinned) return [{ key: pinned.id, label: pinned.title || pinned.name, to: path(`pages/${encodeURIComponent(pinned.name)}`), icon: 'pin' }]
  return menu.value.filter(m => m.type !== 'home' && m.type !== 'link').slice(0, 4).map(m => ({
    key: m.id,
    label: m.label,
    to: m.type === 'clip' ? path(`clips/${m.clipId ?? ''}`) : m.type === 'page' ? path(`pages/${encodeURIComponent(m.pageName ?? '')}`) : path(m.type),
    icon: m,
  }))
})
</script>

<template>
  <nav class="gh-pinbar" aria-label="바로가기">
    <NuxtLink v-for="p in pins" :key="p.key" class="pin" :to="p.to" :title="p.label">
      <PhPushPin v-if="p.icon === 'pin'" :size="18" weight="duotone" aria-hidden="true" />
      <PhBookOpen v-else-if="p.icon === 'page'" :size="18" weight="duotone" aria-hidden="true" />
      <PhLink v-else-if="p.icon === 'link'" :size="18" weight="duotone" aria-hidden="true" />
      <DockIcon v-else :type="p.icon.type" :skin="config.skin" :size="18" />
      <span>{{ p.label }}</span>
    </NuxtLink>
  </nav>
</template>
