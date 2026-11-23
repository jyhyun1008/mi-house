import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

async function load(file, globals = {}) {
  const source = await readFile(new URL(`../app/utils/${file}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const exports = {}
  vm.runInNewContext(outputText, { exports, URL, ...globals })
  return exports
}

const url = await load('url.ts')
const misskey = await load('misskey.ts', { fetch: () => {}, AbortSignal })
const domain = await load('domain.ts', { safeHttpUrl: url.safeHttpUrl })
const site = await load('site.ts', { safeHttpUrl: url.safeHttpUrl, normalizeHost: misskey.normalizeHost, normalizeDomain: domain.normalizeDomain, domainSite: () => null })

test('config round-trips through page blocks', () => {
  const c = site.defaultConfig('Jay')
  c.skin = 'frame'
  c.banners.push({ id: 'b1', image: 'https://a.example/b.png', url: 'https://friend.example/', label: '친구' })
  c.menu.push({ id: 'x', type: 'clip', label: '낙서', clipId: 'abc', view: 'scrap' })
  const back = site.configFromBlocks(site.configToBlocks(c), 'Jay')
  assert.equal(back.skin, 'frame')
  assert.deepEqual({ ...back.banners[0] }, { id: 'b1', image: 'https://a.example/b.png', url: 'https://friend.example/', label: '친구' })
  assert.deepEqual({ ...back.menu.at(-1) }, { id: 'x', type: 'clip', label: '낙서', clipId: 'abc', view: 'scrap' })
})

test('hostile config values are dropped', () => {
  const c = site.normalizeConfig({
    skin: 'evil',
    bodyFont: 'comic sans',
    accent: 'red;background:url(x)',
    background: 'https://a.example/x.png") ; color: red',
    mainImage: 'javascript:alert(1)',
    guestbookNoteId: '../../i',
    menu: [{ type: 'link', label: 'x', url: 'javascript:alert(1)' }, { type: 'nope' }],
    myBanner: 'http://insecure.example/b.png',
    banners: [{ image: 'javascript:x' }, { image: 'https://ok.example/b.gif', url: 'javascript:alert(1)' }],
  })
  assert.equal(c.myBanner, '')
  assert.equal(c.banners.length, 1)
  assert.equal(c.banners[0].url, '')
  assert.equal(c.skin, 'glass')
  assert.equal(c.bodyFont, 'gothic')
  assert.equal(c.titleFont, 'myeongjo')
  assert.equal(c.accent, '#5b7fc0')
  assert.equal(c.background, '')
  assert.equal(c.mainImage, '')
  assert.equal(c.guestbookNoteId, '')
  assert.equal(c.menu.length, 1)
  assert.equal(c.menu[0].url, '')
})

test('broken JSON falls back to defaults', () => {
  const c = site.configFromBlocks([{ id: '1', type: 'text', text: '```json\n{oops\n```' }], 'T')
  assert.equal(c.title, 'T')
})

test('custom CSS is scoped and cannot import', () => {
  const css = site.scopedCss('@import url(https://x/y.css); .a { color: red } </style><script>')
  assert.ok(css.startsWith('@scope (.mh-site)'))
  assert.ok(!/@import/i.test(css))
  assert.ok(!/<\/?\s*style/i.test(css))
  assert.equal(site.scopedCss('   '), '')
})

test('site route params', () => {
  assert.deepEqual({ ...site.parseSiteParam('@jay@Misskey.IO') }, { username: 'jay', host: 'misskey.io' })
  assert.equal(site.parseSiteParam('jay@misskey.io'), null)
  assert.equal(site.parseSiteParam('@jay@bad host'), null)
  assert.equal(site.sitePath('jay', 'misskey.io', 'gallery'), '/@jay@misskey.io/gallery')
})

test('settings saved with old skins map to a theme', () => {
  assert.equal(site.normalizeConfig({ skin: 'doujin' }).skin, 'retro')
  assert.equal(site.normalizeConfig({ skin: 'bitool' }).skin, 'frame')
  assert.equal(site.normalizeConfig({ skin: 'gaenhome' }).skin, 'glass')
})

test('counter is off unless chosen, and keys are URL-safe', () => {
  assert.equal(site.normalizeConfig({}).counter.mode, 'off')
  assert.equal(site.normalizeConfig({ counter: { mode: 'evil' } }).counter.mode, 'off')
  assert.equal(site.normalizeConfig({ counter: { mode: 'image', imageUrl: 'javascript:x' } }).counter.imageUrl, '')
  assert.equal(site.counterKey('jay', 'misskey.io:3000'), 'jay.misskey.io-3000')
})

test('pin bar links must point into the owner\'s own site', () => {
  const app = 'https://jay.github.io/mi-house/'
  const ok = (raw) => ({ ...site.parseSiteLink(raw, 'jay', 'misskey.io', app) })
  assert.deepEqual(ok('https://misskey.io/@jay/pages/hello'), { path: 'pages/hello' })
  assert.deepEqual(ok('https://misskey.io/@Jay/pages/%ED%95%9C%EA%B8%80'), { path: `pages/${encodeURIComponent('한글')}` })
  assert.deepEqual(ok('https://jay.github.io/mi-house/@jay@misskey.io/gallery/abc123'), { path: 'gallery/abc123' })
  assert.deepEqual(ok('https://jay.github.io/mi-house/@jay@misskey.io/pages/hello/'), { path: 'pages/hello' })
  assert.deepEqual(ok('/mi-house/@jay@misskey.io/clips/xyz'), { path: 'clips/xyz' })
  // someone else, another server, or not a page
  assert.ok('error' in ok('https://misskey.io/@other/pages/hello'))
  assert.ok('error' in ok('https://misskey.io/notes/abc'))
  assert.ok('error' in ok('https://evil.example/@jay/pages/hello'))
  assert.ok('error' in ok('https://jay.github.io/mi-house/@other@misskey.io/pages/hello'))
  assert.ok('error' in ok('https://jay.github.io/mi-house/@jay@misskey.io/admin'))
  assert.ok('error' in ok('javascript:alert(1)'))
})

test('pin bar entries are validated, old page-name lists are upgraded', () => {
  const c = site.normalizeConfig({ pinBar: ['hello', { path: 'gallery/x', label: '그림' }, { path: '../admin' }, { path: 'admin' }] })
  assert.deepEqual(c.pinBar.map(p => ({ ...p })), [{ path: 'pages/hello', label: '' }, { path: 'gallery/x', label: '그림' }])
})

test('background effect is kept when valid and reset otherwise', () => {
  assert.equal(site.defaultConfig().bgEffect, 'none')
  assert.equal(site.normalizeConfig({ bgEffect: 'bubbles' }).bgEffect, 'bubbles')
  assert.equal(site.normalizeConfig({ bgEffect: 'fireworks' }).bgEffect, 'none')
  const c = site.defaultConfig('Jay')
  c.bgEffect = 'notes'
  assert.equal(site.configFromBlocks(site.configToBlocks(c), 'Jay').bgEffect, 'notes')
})

test('colour mode defaults to light and only accepts known values', () => {
  assert.equal(site.defaultConfig().colorMode, 'light')
  assert.equal(site.normalizeConfig({ colorMode: 'dark' }).colorMode, 'dark')
  assert.equal(site.normalizeConfig({ colorMode: 'auto' }).colorMode, 'auto')
  assert.equal(site.normalizeConfig({ colorMode: 'sepia' }).colorMode, 'light')
})

test('custom domain is stored as a bare host name', () => {
  assert.equal(site.normalizeConfig({ customDomain: 'https://Home.Example.com/gallery' }).customDomain, 'home.example.com')
  assert.equal(site.normalizeConfig({ customDomain: 'example.com' }).customDomain, 'example.com')
  for (const bad of ['localhost', 'a b.com', '"><script>.com', 'example', 'user@example.com', 123])
    assert.equal(site.normalizeConfig({ customDomain: bad }).customDomain, '', String(bad))
})

test('on a custom domain the own homepage is at the root, others go to the app', async () => {
  const d = { username: 'jay', host: 'misskey.io', app: 'https://i.chigoa.me' }
  const s = await load('site.ts', { safeHttpUrl: url.safeHttpUrl, normalizeHost: misskey.normalizeHost, normalizeDomain: domain.normalizeDomain, domainSite: () => d })
  assert.equal(s.sitePath('jay', 'misskey.io'), '/')
  assert.equal(s.sitePath('Jay', 'misskey.io', 'gallery'), '/gallery')
  assert.equal(s.sitePath('friend', 'misskey.io', 'about'), 'https://i.chigoa.me/@friend@misskey.io/about')
  assert.equal(s.appHome(), 'https://i.chigoa.me')
})

test('pin bar accepts links on the registered custom domain', () => {
  const app = 'https://i.chigoa.me/'
  assert.deepEqual({ ...site.parseSiteLink('https://home.example.com/gallery/9abc', 'jay', 'misskey.io', app, 'home.example.com') }, { path: 'gallery/9abc' })
  assert.deepEqual({ ...site.parseSiteLink('https://home.example.com/pages/소개', 'jay', 'misskey.io', app, 'home.example.com') }, { path: `pages/${encodeURIComponent('소개')}` })
  assert.ok('error' in site.parseSiteLink('https://home.example.com/admin', 'jay', 'misskey.io', app, 'home.example.com'))
  assert.ok('error' in site.parseSiteLink('https://other.example.com/gallery', 'jay', 'misskey.io', app, 'home.example.com'))
})

test('worker script names the homepage and the app', () => {
  const w = domain.workerScript('jay', 'misskey.io', 'https://i.chigoa.me/')
  assert.match(w, /const SITE = '@jay@misskey\.io'/)
  assert.match(w, /const APP = 'https:\/\/i\.chigoa\.me'\n/)
  assert.match(w, /HTMLRewriter/)
})

test('pretendard and bon myeongjo are valid fonts with stylesheets', () => {
  const c = site.normalizeConfig({ bodyFont: 'pretendard', titleFont: 'bonmyeongjo' })
  assert.equal(c.bodyFont, 'pretendard')
  assert.equal(c.titleFont, 'bonmyeongjo')
  for (const f of ['pretendard', 'bonmyeongjo']) {
    assert.ok(site.FONT_STACKS[f])
    assert.ok(site.FONT_SHEETS[f].every(u => u.startsWith('https://cdn.jsdelivr.net/')))
  }
})
