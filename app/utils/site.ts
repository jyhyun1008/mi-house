import type { PageBlock } from '~/types/misskey'

/*
 * A mi-house site has no server of its own. Its settings live in an ordinary public
 * Misskey Page named `mi-house` on the owner's account, as a ```json fence inside a text
 * block, so any visitor (even without logging in) can read them with `pages/show`.
 */

export const CONFIG_PAGE_NAME = 'mi-house'

/** Every theme uses the full-screen 갠홈 layout; they differ in mood. */
export type Skin = 'glass' | 'paper' | 'frame' | 'retro'

export const SKINS: { id: Skin, label: string, desc: string }[] = [
  { id: 'glass', label: '글래스', desc: '반투명 유리 패널. 배경 사진이 비쳐 보이는 맑은 느낌.' },
  { id: 'paper', label: '페이퍼', desc: '종이 질감과 마스킹테이프, 스크랩북 같은 따뜻한 느낌.' },
  { id: 'frame', label: '프레임', desc: '화면을 감싸는 고전 액자 테두리와 각인 같은 세리프 글씨.' },
  { id: 'retro', label: '레트로', desc: '제목 표시줄 달린 작은 창들. 그 시절 갠홈 느낌.' },
]

/** Skins from earlier versions → the closest theme */
const LEGACY_SKINS: Record<string, Skin> = { gaenhome: 'glass', avocado: 'glass', simple: 'paper', bitool: 'frame', doujin: 'retro' }

/** A pin bar entry: a place inside the site (`pages/<name>`, `gallery/<id>`, …) and an optional label. */
export interface PinLink {
  path: string
  label: string
}

const PIN_PATH = /^(?:pages|gallery|clips|about|diary|guestbook)(?:\/[^\s?#/]+)?$/

export interface BannerItem {
  id: string
  /** https image (banners are usually 200×40) */
  image: string
  url: string
  label: string
}

export type MenuType = 'home' | 'about' | 'gallery' | 'pages' | 'clips' | 'clip' | 'diary' | 'guestbook' | 'page' | 'link'

export const MENU_TYPES: { type: MenuType, label: string, desc: string }[] = [
  { type: 'home', label: 'Top', desc: '첫 화면' },
  { type: 'about', label: 'About', desc: '프로필 소개' },
  { type: 'gallery', label: 'Gallery', desc: '갤러리 게시물' },
  { type: 'pages', label: 'Text', desc: '페이지 목록 (글·소설)' },
  { type: 'clips', label: 'Board', desc: '공개 클립 목록' },
  { type: 'clip', label: 'Clip', desc: '클립 하나를 게시판/스크랩북으로' },
  { type: 'page', label: 'Page', desc: '페이지 하나를 메뉴로' },
  { type: 'diary', label: 'Diary', desc: '노트를 일기장처럼' },
  { type: 'guestbook', label: 'Guestbook', desc: '방명록 (노트 답글)' },
  { type: 'link', label: 'Link', desc: '외부 링크' },
]

export interface MenuItem {
  id: string
  type: MenuType
  label: string
  clipId?: string
  /** clip display */
  view?: 'board' | 'scrap'
  pageName?: string
  url?: string
}

export type FontId = 'gothic' | 'myeongjo' | 'hand' | 'mona12'

export const FONTS: { id: FontId, label: string }[] = [
  { id: 'gothic', label: '부산단디고딕' },
  { id: 'myeongjo', label: '부산단디명조' },
  { id: 'hand', label: '부산단디손글씨' },
  { id: 'mona12', label: 'Mona12 (도트)' },
]

/** CSS variables defined in base.css */
export const FONT_STACKS: Record<FontId, string> = {
  gothic: 'var(--font-gothic)',
  myeongjo: 'var(--font-myeongjo)',
  hand: 'var(--font-hand)',
  mona12: 'var(--font-mona)',
}

const FONT_IDS = new Set<string>(Object.keys(FONT_STACKS))

/** Visit counter. A static site can't count by itself, so this uses an outside service (off by default). */
export type CounterMode = 'off' | 'badge' | 'text' | 'image'

export interface SiteConfig {
  version: 1
  title: string
  subtitle: string
  skin: Skin
  /** body text */
  bodyFont: FontId
  /** site title and headings */
  titleFont: FontId
  accent: string
  /** https image URLs (usually from the owner's drive) */
  background: string
  mainImage: string
  /** center: floating in the middle of the Top board; side: a tall card on the right */
  mainImageLayout: 'center' | 'side'
  enter: { enabled: boolean, text: string, warning: string }
  notice: string
  /** Page shown on Top instead of the profile description */
  homePage: string
  /** links on the pin bar above the main image (places inside this site) */
  pinBar: PinLink[]
  menu: MenuItem[]
  /** My own banner for link exchange */
  myBanner: string
  /** Banners of friends' sites */
  banners: BannerItem[]
  guestbookNoteId: string
  /** Only notes with this hashtag show up in Diary ('' = all notes) */
  diaryTag: string
  since: string
  showUpdates: boolean
  counter: { mode: CounterMode, imageUrl: string }
  footer: string
  customCss: string
}

export function defaultConfig(title = ''): SiteConfig {
  return {
    version: 1,
    title: title || 'My Homepage',
    subtitle: 'welcome to my house',
    skin: 'glass',
    bodyFont: 'gothic',
    titleFont: 'myeongjo',
    accent: '#5b7fc0',
    background: '',
    mainImage: '',
    mainImageLayout: 'center',
    enter: { enabled: false, text: 'ENTER', warning: '' },
    notice: '',
    homePage: '',
    pinBar: [],
    menu: [
      { id: 'm-home', type: 'home', label: 'Top' },
      { id: 'm-about', type: 'about', label: 'About' },
      { id: 'm-gallery', type: 'gallery', label: 'Gallery' },
      { id: 'm-pages', type: 'pages', label: 'Text' },
      { id: 'm-clips', type: 'clips', label: 'Board' },
      { id: 'm-diary', type: 'diary', label: 'Diary' },
      { id: 'm-guest', type: 'guestbook', label: 'Guestbook' },
    ],
    myBanner: '',
    banners: [],
    guestbookNoteId: '',
    diaryTag: '',
    since: '',
    showUpdates: true,
    counter: { mode: 'off', imageUrl: '' },
    footer: '',
    customCss: '',
  }
}

const SKIN_IDS = new Set(SKINS.map(s => s.id))
const MENU_IDS = new Set(MENU_TYPES.map(m => m.type))
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '')
const HEX = /^#[0-9a-f]{6}$/i
const NOTE_ID = /^[a-zA-Z0-9]{1,64}$/

/** Only plain https image URLs may go into `url(...)`. */
export function safeImageUrl(v: unknown): string {
  return typeof v === 'string' && /^https:\/\/[^\s"'()\\<>]+$/.test(v) ? v : ''
}

/** Untrusted JSON (anyone can edit their own config page by hand) → a valid config. */
export function normalizeConfig(raw: unknown, title = ''): SiteConfig {
  const d = defaultConfig(title)
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, any>
  const menu: MenuItem[] = Array.isArray(r.menu)
    ? r.menu.filter((m: any) => m && MENU_IDS.has(m.type)).slice(0, 30).map((m: any, i: number) => ({
        id: str(m.id, 40) || `m-${i}`,
        type: m.type,
        label: str(m.label, 40) || m.type,
        ...(m.clipId ? { clipId: str(m.clipId, 64) } : {}),
        ...(m.view === 'scrap' || m.view === 'board' ? { view: m.view } : {}),
        ...(m.pageName ? { pageName: str(m.pageName, 256) } : {}),
        ...(m.url ? { url: safeHttpUrl(str(m.url)) ?? '' } : {}),
      }))
    : d.menu
  return {
    version: 1,
    title: str(r.title, 80) || d.title,
    subtitle: str(r.subtitle, 200),
    skin: SKIN_IDS.has(r.skin) ? r.skin : LEGACY_SKINS[r.skin] ?? d.skin,
    bodyFont: FONT_IDS.has(r.bodyFont) ? r.bodyFont : d.bodyFont,
    titleFont: FONT_IDS.has(r.titleFont) ? r.titleFont : d.titleFont,
    accent: HEX.test(r.accent) ? r.accent : d.accent,
    background: safeImageUrl(r.background),
    mainImage: safeImageUrl(r.mainImage),
    mainImageLayout: r.mainImageLayout === 'side' ? 'side' : 'center',
    enter: {
      enabled: !!r.enter?.enabled,
      text: str(r.enter?.text, 40) || 'ENTER',
      warning: str(r.enter?.warning, 2000),
    },
    notice: str(r.notice, 3000),
    homePage: str(r.homePage, 256),
    pinBar: Array.isArray(r.pinBar)
      ? r.pinBar
          // older settings stored bare page names
          .map((x: any) => (typeof x === 'string' ? { path: `pages/${encodeURIComponent(x)}`, label: '' } : x))
          .filter((x: any) => x && typeof x.path === 'string' && PIN_PATH.test(x.path))
          .slice(0, 8)
          .map((x: any) => ({ path: x.path as string, label: str(x.label, 60) }))
      : [],
    menu,
    myBanner: safeImageUrl(r.myBanner),
    banners: Array.isArray(r.banners)
      ? r.banners.slice(0, 60).map((b: any, i: number) => ({
          id: str(b?.id, 40) || `b-${i}`,
          image: safeImageUrl(b?.image),
          url: safeHttpUrl(str(b?.url)) ?? '',
          label: str(b?.label, 80),
        })).filter((b: BannerItem) => b.image)
      : [],
    guestbookNoteId: NOTE_ID.test(r.guestbookNoteId) ? r.guestbookNoteId : '',
    diaryTag: str(r.diaryTag, 100).replace(/^#/, ''),
    since: str(r.since, 40),
    showUpdates: r.showUpdates !== false,
    counter: {
      mode: ['badge', 'text', 'image'].includes(r.counter?.mode) ? r.counter.mode : 'off',
      imageUrl: safeImageUrl(r.counter?.imageUrl),
    },
    footer: str(r.footer, 1000),
    customCss: str(r.customCss, 20000),
  }
}

const FENCE_RE = /```json\s*\n([\s\S]*?)\n```/

export function configFromBlocks(blocks: PageBlock[], title = ''): SiteConfig {
  for (const b of blocks) {
    const m = b.type === 'text' && b.text ? FENCE_RE.exec(b.text) : null
    if (m) {
      try {
        return normalizeConfig(JSON.parse(m[1]!), title)
      }
      catch {
        break
      }
    }
  }
  return defaultConfig(title)
}

export function configToBlocks(config: SiteConfig): PageBlock[] {
  return [
    { id: 'mihouse-about', type: 'text', text: '<small>이 페이지는 이치고아메 홈페이지 설정을 담고 있어요. 지우면 홈페이지가 기본 설정으로 돌아갑니다.</small>' },
    { id: 'mihouse-config', type: 'text', text: `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\`` },
  ]
}

/** Custom CSS can't break out of the site: no imports, no closing tags, scoped to the site root. */
export function scopedCss(css: string): string {
  const clean = css
    .replace(/@import[^;]*;?/gi, '')
    .replace(/<\/?\s*style/gi, '')
    .replace(/expression\s*\(/gi, '')
  return clean.trim() ? `@scope (.mh-site) {\n${clean}\n}` : ''
}

/** `@user@host` route param → parts; null when it isn't one. */
export function parseSiteParam(param: string): { username: string, host: string } | null {
  const m = /^@([a-zA-Z0-9_]{1,64})@([a-zA-Z0-9.-]+(?::\d+)?)$/.exec(param)
  if (!m) return null
  try {
    return { username: m[1]!, host: normalizeHost(m[2]!) }
  }
  catch {
    return null
  }
}

export function sitePath(username: string, host: string, sub = '') {
  return `/@${username}@${host}${sub ? `/${sub}` : ''}`
}

/** Counter key for a site: stable, URL-safe, short enough for counter services. */
export function counterKey(username: string, host: string): string {
  return `${username}.${host}`.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 48)
}

/**
 * A link the owner pasted for the pin bar → the place inside their own site, or an error.
 * Accepted: a Misskey page URL of this account on its own server
 * (`https://host/@user/pages/name`), or a mi-house link into this site (`<app>/@user@host/…`).
 * `app` is this mi-house's own address (origin + base path).
 */
export function parseSiteLink(raw: string, username: string, host: string, app: string): { path: string } | { error: string } {
  let url: URL
  try {
    url = new URL(raw.trim(), app)
  }
  catch {
    return { error: '올바른 주소가 아니에요.' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: '올바른 주소가 아니에요.' }
  const lower = username.toLowerCase()
  let pathname: string
  try {
    pathname = decodeURIComponent(url.pathname)
  }
  catch {
    return { error: '올바른 주소가 아니에요.' }
  }

  // Misskey page URL on the owner's server
  if (url.host.toLowerCase() === host.toLowerCase()) {
    const m = /^\/@([^/@]+)\/pages\/([^/]+)\/?$/.exec(pathname)
    if (!m) return { error: '미스키에서는 페이지 주소(/@아이디/pages/…)만 넣을 수 있어요.' }
    if (m[1]!.toLowerCase() !== lower) return { error: `@${username}의 페이지만 넣을 수 있어요.` }
    return { path: `pages/${encodeURIComponent(m[2]!)}` }
  }

  // mi-house link into this site
  const appUrl = new URL(app)
  if (url.origin === appUrl.origin) {
    const base = decodeURIComponent(appUrl.pathname).replace(/\/?$/, '/')
    const prefix = `${base}@${username}@${host}`.toLowerCase()
    if (!pathname.toLowerCase().startsWith(`${prefix}/`)) return { error: `이 홈페이지(@${username}@${host}) 안의 링크만 넣을 수 있어요.` }
    const rest = pathname.slice(prefix.length + 1).replace(/\/$/, '')
    const sub = rest.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/')
    if (!PIN_PATH.test(sub)) return { error: '페이지·갤러리·게시판 같은 메뉴 안의 주소를 넣어 주세요.' }
    return { path: sub }
  }

  return { error: `이 홈페이지(@${username}@${host})나 ${host}의 내 페이지 주소만 넣을 수 있어요.` }
}
