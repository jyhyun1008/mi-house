import * as mfm from 'mfm-js'
import type { Page, PageBlock } from '~/types/misskey'
import { splitPageContent } from './pageText'

/** `#hashtags` written in MFM text, in order, without duplicates. */
export function hashtagsIn(text: string | null | undefined): string[] {
  if (!text) return []
  const tags = mfm.extract(mfm.parse(text), n => n.type === 'hashtag').map(n => (n as mfm.MfmHashtag).props.hashtag)
  return [...new Set(tags)]
}

const TAG_KEYS = /^(tags?|태그|카테고리|categor(y|ies))$/i

/** Categories of a Misskey page: a `tags:` front-matter property, plus #hashtags in the summary and text blocks. */
export function pageTags(page: Pick<Page, 'summary' | 'content'>): string[] {
  const out: string[] = []
  const { properties, blocks } = splitPageContent(page.content)
  for (const p of properties ?? []) {
    if (!TAG_KEYS.test(p.key.trim())) continue
    const values = Array.isArray(p.value) ? p.value : p.value.split(/[,\s]+/)
    out.push(...values.map(v => v.trim().replace(/^#/, '')).filter(Boolean))
  }
  out.push(...hashtagsIn(page.summary))
  const walk = (list: PageBlock[]) => {
    for (const b of list) {
      if (b.type === 'text') out.push(...hashtagsIn(b.text))
      if (b.children) walk(b.children)
    }
  }
  walk(blocks)
  const seen = new Set<string>()
  return out.filter(t => !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
}
