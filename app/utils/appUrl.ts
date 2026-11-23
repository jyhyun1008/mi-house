/**
 * Absolute URL of a path inside this app, including the base path when the app is served
 * from a sub-directory (e.g. GitHub Pages at https://user.github.io/mi-house/).
 */
export function appUrl(path: string): string {
  // a custom domain serves the app at its root whatever base it was built for
  const base = domainSite() ? '/' : useRuntimeConfig().app.baseURL || '/'
  return `${location.origin}${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}
