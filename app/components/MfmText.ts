import { h, defineComponent, type PropType, type VNode } from 'vue'
import * as mfm from 'mfm-js'
import { NuxtLink } from '#components'

/**
 * Renders MFM (Misskey Flavored Markdown). `plain` only handles text + emoji (display names).
 * Mentions open that person's mi-house; hashtags open the tag on the site's server.
 */
export default defineComponent({
  name: 'MfmText',
  props: {
    text: { type: String, required: true },
    emojis: { type: Object as PropType<Record<string, string> | undefined>, default: undefined },
    plain: { type: Boolean, default: false },
    /** server the text came from; defaults to the site being viewed */
    host: { type: String, default: undefined },
  },
  setup(props) {
    const { site } = useSite()
    const baseHost = () => props.host ?? site.value?.host ?? null

    function emojiUrl(name: string): string | null {
      if (props.emojis?.[name]) return props.emojis[name]
      const host = baseHost()
      return host ? `https://${host}/emoji/${name}.webp` : null
    }

    function render(nodes: mfm.MfmNode[]): (VNode | string)[] {
      return nodes.map((node): VNode | string => {
        switch (node.type) {
          case 'text':
            return node.props.text
          case 'unicodeEmoji':
            return h('img', { class: 'twemoji', src: twemojiUrl(node.props.emoji), alt: node.props.emoji, draggable: false, loading: 'lazy' })
          case 'emojiCode': {
            const url = emojiUrl(node.props.name)
            return url
              ? h('img', { class: 'mfm-emoji', src: url, alt: `:${node.props.name}:`, title: `:${node.props.name}:`, loading: 'lazy', referrerpolicy: 'no-referrer', draggable: false })
              : `:${node.props.name}:`
          }
          case 'bold':
            return h('b', render(node.children))
          case 'italic':
            return h('i', render(node.children))
          case 'strike':
            return h('del', render(node.children))
          case 'small':
            return h('small', { class: 'mfm-small' }, render(node.children))
          case 'center':
            return h('div', { class: 'mfm-center' }, render(node.children))
          case 'plain':
            return h('span', render(node.children))
          case 'inlineCode':
            return h('code', { class: 'mfm-code' }, node.props.code)
          case 'blockCode':
            return h('pre', { class: 'mfm-pre' }, [h('code', node.props.code)])
          case 'mathInline':
            return h('code', { class: 'mfm-code' }, node.props.formula)
          case 'mathBlock':
            return h('pre', { class: 'mfm-pre' }, [h('code', node.props.formula)])
          case 'quote':
            return h('blockquote', { class: 'mfm-quote' }, render(node.children))
          case 'search':
            return h('a', { class: 'mfm-search', href: `https://www.google.com/search?q=${encodeURIComponent(node.props.query)}`, target: '_blank', rel: 'noopener noreferrer' }, `🔍 ${node.props.query}`)
          case 'url':
            return h('a', { href: safeHttpUrl(node.props.url), target: '_blank', rel: 'noopener noreferrer', class: 'mfm-url' }, node.props.url.replace(/^https?:\/\//, ''))
          case 'link':
            return h('a', { href: safeHttpUrl(node.props.url), target: '_blank', rel: 'noopener noreferrer', title: node.props.url }, render(node.children))
          case 'mention': {
            const host = node.props.host ?? baseHost()
            if (!host) return node.props.acct
            return h(NuxtLink, { class: 'mfm-mention', to: sitePath(node.props.username, host) }, () => node.props.acct)
          }
          case 'hashtag': {
            const host = baseHost()
            return h('a', { class: 'mfm-hashtag', href: host ? `https://${host}/tags/${encodeURIComponent(node.props.hashtag)}` : undefined, target: '_blank', rel: 'noopener noreferrer' }, `#${node.props.hashtag}`)
          }
          case 'fn':
            return renderFnNode(node)
          default:
            return ''
        }
      })
    }

    function renderFnNode(node: mfm.MfmFn): VNode {
      const { name, args } = node.props
      if (name === 'ruby') {
        const only = node.children.length === 1 && node.children[0]!.type === 'text' ? (node.children[0] as mfm.MfmText).props.text : null
        const [base, ...rt] = only?.split(' ') ?? []
        if (base && rt.length) return h('ruby', [base, h('rt', rt.join(' '))])
      }
      if (name === 'unixtime') {
        const only = node.children.length === 1 && node.children[0]!.type === 'text' ? Number((node.children[0] as mfm.MfmText).props.text) : Number.NaN
        if (Number.isFinite(only)) return h('span', { class: 'mfm-unixtime' }, formatFull(new Date(only * 1000).toISOString()))
      }
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      const fn = renderFn(name, args, !reduce)
      return h('span', { class: ['mfm-fn', `mfm-fn-${name}`, fn?.cls], style: fn?.style }, render(node.children))
    }

    const nodes = computed(() => (props.plain ? mfm.parseSimple(props.text) : mfm.parse(props.text)))
    return () => h('span', { class: 'mfm' }, render(nodes.value))
  },
})
