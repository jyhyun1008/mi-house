import type { RouterConfig } from 'nuxt/schema'
import { createWebHistory } from 'vue-router'
import { domainSite } from '~/utils/domain'

/**
 * On a custom domain (see utils/domain.ts) the domain *is* one homepage: its screens live
 * at the root (`/gallery` instead of `/@user@host/gallery`) and the landing page is gone.
 */
export default <RouterConfig>{
  // the app may be built for a sub-path (GitHub Pages), but a custom domain serves it at /
  history: () => (domainSite() ? createWebHistory('/') : undefined),
  routes: (routes) => {
    if (!domainSite()) return routes
    const site = routes.find(r => r.path.startsWith('/:site'))
    if (!site) return routes
    return [
      ...routes.filter(r => r.path === '/callback'),
      { ...site, path: '/' },
    ]
  },
}
