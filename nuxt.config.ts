// GitHub Pages serves a project site from /<repo>/; the deploy workflow sets this.
const base = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  devServer: { port: 3224 },
  css: ['~/assets/css/base.css', '~/assets/css/mfm.css', '~/assets/css/skins.css'],
  app: {
    head: {
      title: '이치고아메',
      htmlAttrs: { lang: 'ko' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // Instance media proxies (e.g. misskey.io) refuse hotlinked images that carry a Referer
        { name: 'referrer', content: 'no-referrer' },
        { name: 'description', content: '미스키 계정의 페이지·갤러리·클립으로 꾸미는 개인 홈페이지' },
      ],
      link: [{ rel: 'icon', href: `${base}favicon.ico` }],
    },
  },
})
