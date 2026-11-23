/*
 * Custom domain (own address for one homepage).
 *
 * The owner points their domain at a small Cloudflare Worker (see workerScript) that serves
 * this app's files and adds two <meta> tags to the HTML:
 *   <meta name="mi-house-site" content="@user@host">   whose homepage this domain shows
 *   <meta name="mi-house-app" content="https://…">     where the app itself lives
 * With those, the router drops the `/@user@host` prefix (home.example/gallery), and links to
 * anything outside this homepage go to the app's own address.
 */

export interface DomainSite {
  username: string
  host: string
  /** the app's own address (origin + base path, no trailing slash) */
  app: string
}

let cached: DomainSite | null | undefined

/** The homepage this domain is set up for, or null on the app's own address. */
export function domainSite(): DomainSite | null {
  if (cached !== undefined) return cached
  cached = null
  if (typeof document === 'undefined') return cached
  const site = document.querySelector<HTMLMetaElement>('meta[name="mi-house-site"]')?.content ?? ''
  const app = document.querySelector<HTMLMetaElement>('meta[name="mi-house-app"]')?.content ?? ''
  const m = /^@([a-zA-Z0-9_]{1,64})@([a-z0-9.-]+(?::\d+)?)$/i.exec(site.trim())
  const appUrl = safeHttpUrl(app.trim())
  if (m && appUrl && new URL(appUrl).host !== location.host) {
    cached = { username: m[1]!, host: m[2]!.toLowerCase(), app: appUrl.replace(/\/$/, '') }
  }
  return cached
}

/** `home.example.com`, from whatever the owner typed (a URL, upper case, a trailing slash…); '' if it isn't one. */
export function normalizeDomain(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, '')
  return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}[a-z0-9]$/.test(host) ? host : ''
}

/** Cloudflare Worker that serves this app on the owner's domain, ready to paste. */
export function workerScript(username: string, host: string, app: string): string {
  return `// 이치고아메 커스텀 도메인 — @${username}@${host}
const SITE = '@${username}@${host}'
const APP = '${app.replace(/\/$/, '')}'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    // the app's own files (scripts, styles, icon) come straight from APP
    if (url.pathname.includes('/_nuxt/') || url.pathname.endsWith('/favicon.ico')) {
      return fetch(new URL(url.pathname + url.search, APP))
    }
    // every other address is a screen of the homepage: the app's index.html, told whose it is
    const res = await fetch(APP + '/')
    const headers = new Headers(res.headers)
    headers.set('cache-control', 'no-cache')
    headers.delete('content-length')
    const meta = '<meta name="mi-house-site" content="' + SITE + '"><meta name="mi-house-app" content="' + APP + '">'
    return new HTMLRewriter()
      .on('head', { element: el => el.prepend(meta, { html: true }) })
      .transform(new Response(res.body, { status: 200, headers }))
  },
}
`
}
