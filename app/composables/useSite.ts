import type { Account } from './useAccounts'
import type { Note, Page, UserDetailed } from '~/types/misskey'
import type { MenuItem, SiteConfig } from '~/utils/site'

export interface SiteState {
  key: string
  host: string
  username: string
  owner: UserDetailed
  config: SiteConfig
  /** id of the `mi-house` settings page, when the owner has saved settings */
  configPageId: string | null
}

/** The site being viewed. Loaded once by pages/[site].vue; every page below reads it. */
export function useSite() {
  const site = useState<SiteState | null>('site', () => null)
  const { current } = useAccounts()
  const route = useRoute()

  /** Skin in effect: `?skin=…` previews another one without saving */
  const skin = computed(() => SKINS.find(x => x.id === route.query.skin)?.id ?? site.value?.config.skin ?? 'glass')

  /** Logged-in account on the site's own server: can like, clip, and see its own non-public things. */
  const local = computed<Account | null>(() => (current.value && site.value && current.value.host === site.value.host ? current.value : null))
  const isOwner = computed(() => !!local.value && local.value.user.id === site.value?.owner.id)

  /**
   * The server hides notes from visitors who aren't signed in there (Misskey's "content for
   * visitors" setting): note lists come back empty and notes/show fails, but the profile still
   * has the note count, and pinned notes arrive with `isHidden` and no text.
   */
  const notesHiddenFor = useState<string | null>('notesHiddenFor', () => null)
  const notesLocked = computed(() => {
    const st = site.value
    if (!st || local.value || !st.owner.notesCount) return false
    return notesHiddenFor.value === st.key || !!st.owner.pinnedNotes?.some(n => n.isHidden)
  })
  /** Owner chose to hide the note-based sections while visitors can't see notes anyway. */
  const notesOff = computed(() => notesLocked.value && !!site.value?.config.hideNotesWhenLocked)
  /** Menu as this viewer sees it */
  const menu = computed(() => {
    const c = site.value?.config
    if (!c) return []
    // the guestbook stays when it has more than notes in it (web clap, Q&A)
    const keep = (m: MenuItem) => !notesOff.value || !NOTE_MENU_TYPES.has(m.type) || (m.type === 'guestbook' && (c.workerClap || !!c.quesdon))
    return c.menu.filter(keep)
  })

  /** Call when the owner's note list came back empty although they have notes. */
  function markNotesHidden() {
    if (site.value && !local.value && site.value.owner.notesCount > 0) notesHiddenFor.value = site.value.key
  }
  /** Ask once whether notes come through for this viewer (when nothing pinned already told us). */
  async function probeNotes() {
    const st = site.value
    if (!st || local.value || notesLocked.value || !st.owner.notesCount) return
    const got = await api<unknown[]>('users/notes', { userId: st.owner.id, limit: 1 }).catch(() => null)
    if (got && !got.length) markNotesHidden()
  }

  function s() {
    if (!site.value) throw new Error('사이트를 불러오지 못했어요.')
    return site.value
  }

  /** API call against the site's server, signed in when the viewer lives there. */
  function api<T>(endpoint: string, params: Record<string, unknown> = {}) {
    return apiCall<T>(s().host, endpoint, params, local.value?.token)
  }

  /** API call that needs the owner's token (admin screens). */
  function ownerApi<T>(endpoint: string, params: Record<string, unknown> = {}) {
    if (!isOwner.value) throw new Error('주인만 할 수 있어요.')
    return apiCall<T>(s().host, endpoint, params, local.value!.token)
  }

  function path(sub = '') {
    return sitePath(s().username, s().host, sub)
  }

  /**
   * A note of this site as seen from the viewer's own server, so a visitor from another
   * instance can reply or react. Same server → the id as is.
   */
  async function resolveNote(noteId: string): Promise<{ account: Account, noteId: string }> {
    const account = current.value
    if (!account) throw new Error('로그인이 필요해요.')
    if (account.host === s().host) return { account, noteId }
    const res = await apiCall<{ type: string, object: Note }>(account.host, 'ap/show', { uri: `https://${s().host}/notes/${noteId}` }, account.token)
    if (res.type !== 'Note') throw new Error('노트를 내 서버로 가져오지 못했어요.')
    return { account, noteId: res.object.id }
  }

  /** The owner's user id on the viewer's server (for secret guestbook posts). */
  async function ownerIdFor(account: Account) {
    if (account.host === s().host) return s().owner.id
    const u = await apiCall<UserDetailed>(account.host, 'users/show', { username: s().username, host: s().host }, account.token)
    return u.id
  }

  async function saveConfig(config: SiteConfig) {
    const st = s()
    const params = {
      title: `${config.title} — 이치고아메 설정`,
      name: CONFIG_PAGE_NAME,
      summary: '이치고아메 홈페이지 설정',
      content: configToBlocks(config),
      variables: [],
      script: '',
      font: 'sans-serif',
      alignCenter: false,
      hideTitleWhenPinned: false,
      eyeCatchingImageId: null,
    }
    if (st.configPageId) {
      await ownerApi('pages/update', { pageId: st.configPageId, ...params })
    }
    else {
      const page = await ownerApi<Page>('pages/create', params)
      st.configPageId = page.id
    }
    st.config = normalizeConfig(JSON.parse(JSON.stringify(config)), st.owner.name ?? st.username)
  }

  return { site, skin, local, current, isOwner, notesLocked, notesOff, menu, markNotesHidden, probeNotes, api, ownerApi, path, resolveNote, ownerIdFor, saveConfig }
}

/** Fetch owner + settings for `@username@host`. */
export async function loadSite(username: string, host: string, token?: string): Promise<SiteState> {
  const owner = await apiCall<UserDetailed>(host, 'users/show', { username, host: null }, token)
  let config = defaultConfig(owner.name ?? owner.username)
  let configPageId: string | null = null
  try {
    const page = await apiCall<Page>(host, 'pages/show', { username, name: CONFIG_PAGE_NAME }, token)
    config = configFromBlocks(page.content, owner.name ?? owner.username)
    configPageId = page.id
  }
  catch (e) {
    if (!(e instanceof MisskeyApiError && e.code === 'NO_SUCH_PAGE')) console.warn('mi-house config', e)
  }
  return { key: `${username}@${host}`, host, username, owner, config, configPageId }
}
