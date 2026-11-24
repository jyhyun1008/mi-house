/*
 * api.chigoa.me — one shared Worker for every 이치고아메 homepage.
 *
 * Things a static site can't do by itself, without anyone having to log in:
 *   GET  /clap?site=@user@host          web clap count
 *   POST /clap   { site }               +1 (one per visitor per hour)
 *   POST /ask    { site, question }     anonymous neo-quesdon question to the owner
 *   GET  /qna?site=@user@host&untilId=  the owner's answered neo-quesdon questions
 *
 * Each call names a homepage; the Worker reads that homepage's settings (its public `mi-house`
 * page on the Misskey server) and only does what the owner switched on there — so it can't be
 * used to clap for, or question, anyone who didn't ask for it.
 *
 * Storage: D1 bound as `DB` (schema.sql). Visitor addresses are only kept hashed, for an hour.
 */

const QUESDON_ORIGIN = 'https://neo-quesdon.serafuku.moe'
const CONFIG_PAGE = 'mi-house'
const CLAP_WINDOW = 3600 // seconds a visitor's clap is remembered

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

function json(data, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, ...CORS },
  })
}

class Fail extends Error {
  constructor(code, status = 400) {
    super(code)
    this.status = status
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    try {
      const url = new URL(request.url)
      const route = url.pathname.replace(/^\/+|\/+$/g, '')
      const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
      const site = parseSite(request.method === 'POST' ? body.site : url.searchParams.get('site'))

      if (route === 'clap' && (request.method === 'GET' || request.method === 'POST')) {
        const config = await siteConfig(site, ctx)
        if (!config.workerClap) throw new Fail('CLAP_OFF', 403)
        if (!env.DB) throw new Fail('NO_DB', 501)
        return request.method === 'GET' ? json({ count: await clapCount(env, site.key) }) : json(await clap(env, site.key, request))
      }
      if (route === 'ask' && request.method === 'POST') {
        const config = await siteConfig(site, ctx)
        if (!config.quesdon) throw new Fail('NO_QUESDON', 403)
        return json(await ask(config.quesdon, body.question, request))
      }
      if (route === 'qna' && request.method === 'GET') {
        const config = await siteConfig(site, ctx)
        if (!config.quesdon) throw new Fail('NO_QUESDON', 403)
        return await answers(config.quesdon, url.searchParams.get('untilId'), ctx)
      }
      throw new Fail('NOT_FOUND', 404)
    }
    catch (e) {
      if (e instanceof Fail) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'SERVER_ERROR' }, 500)
    }
  },
}

/** `@user@host` → parts; the host must look like a public domain name */
function parseSite(raw) {
  const m = /^@([a-zA-Z0-9_]{1,64})@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/i.exec(String(raw ?? '').trim())
  if (!m) throw new Fail('BAD_SITE')
  const host = m[2].toLowerCase()
  return { username: m[1], host, key: `@${m[1]}@${host}` }
}

/** The homepage's own settings, read from its public config page (cached a minute, so changes show up soon). */
async function siteConfig(site, ctx) {
  const cacheKey = new Request(`https://config.cache/v2/${encodeURIComponent(site.key)}`)
  const hit = await caches.default.match(cacheKey)
  if (hit) return hit.json()

  const res = await fetch(`https://${site.host}/api/pages/show`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: site.username, name: CONFIG_PAGE }),
    redirect: 'manual', // a redirect counts as unreachable (no following to elsewhere)
    signal: AbortSignal.timeout(10_000),
  }).catch((e) => {
    console.error('config fetch failed', site.host, String(e))
    return null
  })
  if (res && !res.ok) console.error('config fetch status', site.host, res.status)
  // no such user / no config page → everything off; anything else is a hiccup, not worth caching
  if (!res || (!res.ok && res.status !== 400 && res.status !== 404)) throw new Fail('SITE_UNREACHABLE', 502)
  let config = { workerClap: false, quesdon: '' }
  if (res.ok) {
    const page = await res.json().catch(() => null)
    for (const block of page?.content ?? []) {
      const m = block?.type === 'text' && typeof block.text === 'string' ? /```json\s*\n([\s\S]*?)\n```/.exec(block.text) : null
      if (!m) continue
      try {
        const raw = JSON.parse(m[1])
        config = { workerClap: raw.workerClap === true, quesdon: normalizeHandle(raw.quesdon) }
      }
      catch { /* broken config: everything off */ }
      break
    }
  }
  ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify(config), { headers: { 'cache-control': 'public, max-age=60' } })))
  return config
}

function normalizeHandle(raw) {
  const m = typeof raw === 'string' ? /@?([a-zA-Z0-9_]{1,64})@([a-z0-9.-]+\.[a-z]{2,})\/?$/i.exec(raw.trim()) : null
  return m ? `@${m[1]}@${m[2].toLowerCase()}` : ''
}

/** visitor address, hashed with the site so it can't be matched across homepages */
async function visitor(request, siteKey) {
  const ip = request.headers.get('cf-connecting-ip') || ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${siteKey}\n${ip}`))
  return [...new Uint8Array(digest)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function clapCount(env, siteKey) {
  const row = await env.DB.prepare('SELECT count FROM claps WHERE site = ?').bind(siteKey).first()
  return row?.count ?? 0
}

async function clap(env, siteKey, request) {
  const now = Math.floor(Date.now() / 1000)
  const who = await visitor(request, siteKey)
  // forget old visitors, then claim this one's slot: no row inserted → already clapped this hour
  const [, claimed] = await env.DB.batch([
    env.DB.prepare('DELETE FROM clap_seen WHERE at < ?').bind(now - CLAP_WINDOW),
    env.DB.prepare('INSERT OR IGNORE INTO clap_seen (site, visitor, at) VALUES (?, ?, ?)').bind(siteKey, who, now),
  ])
  if (!claimed.meta.changes) return { count: await clapCount(env, siteKey), already: true }
  const row = await env.DB.prepare('INSERT INTO claps (site, count) VALUES (?, 1) ON CONFLICT (site) DO UPDATE SET count = count + 1 RETURNING count')
    .bind(siteKey).first()
  return { count: row.count }
}

async function ask(quesdon, question, request) {
  const text = typeof question === 'string' ? question.trim().slice(0, 1000) : ''
  if (!text) throw new Fail('EMPTY')
  const res = await fetch(`${QUESDON_ORIGIN}/api/db/questions`, {
    method: 'POST',
    // the visitor's own address, so neo-quesdon's per-person limits and blocks still apply to them
    headers: { 'content-type': 'application/json', 'x-forwarded-for': request.headers.get('cf-connecting-ip') || '' },
    body: JSON.stringify({ question: text, isAnonymous: true, questionee: quesdon }),
    signal: AbortSignal.timeout(15_000),
  })
  if (res.ok) return { ok: true }
  const err = await res.json().catch(() => null)
  throw new Fail(err?.error_type || `QUESDON_${res.status}`, res.status === 429 ? 429 : res.status === 403 ? 403 : 502)
}

/**
 * Answered questions. The edge keeps a copy for a minute (never an empty list, so a first
 * answer shows up right away); browsers always ask again, so they never hold a stale list.
 */
async function answers(quesdon, untilId, ctx) {
  const target = `${QUESDON_ORIGIN}/api/db/answers/${encodeURIComponent(quesdon)}?limit=20&sort=DESC`
    + (/^[a-z0-9]{1,64}$/i.test(untilId ?? '') ? `&untilId=${untilId}` : '')
  const cacheKey = new Request(`https://answers.cache/v2/${encodeURIComponent(target)}`)
  const hit = await caches.default.match(cacheKey)
  if (hit) return json(await hit.json())
  const up = await fetch(target, { signal: AbortSignal.timeout(15_000) })
  if (!up.ok) throw new Fail(`QUESDON_${up.status}`, 502)
  const data = await up.json()
  const list = (data.answers ?? data.answersList ?? []).map(a => ({
    id: a.id,
    question: a.question,
    answer: a.answer,
    answeredAt: a.answeredAt,
    nsfwedAnswer: !!a.nsfwedAnswer,
  }))
  if (list.length) {
    ctx.waitUntil(caches.default.put(cacheKey, new Response(JSON.stringify({ answers: list }), { headers: { 'cache-control': 'public, max-age=60' } })))
  }
  return json({ answers: list })
}
