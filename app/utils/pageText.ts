import type { PageBlock } from '~/types/misskey'

/*
 * Misskey Pages store content as a tree of blocks, and its own editor makes you add
 * each block as a separate card. Here a page is written as one plain text document instead:
 *
 *   # Section title          → section block (## nests one level deeper, up to ######)
 *   Any other lines (MFM)    → text block
 *   ![이미지](file:<id>)      → image block
 *   ![노트](note:<id>)        → note block (`![자세히](note:<id>)` for a detailed one)
 *   https://<host>/notes/<id> on its own line → note block as well
 *   ![<type>](block:<id>)    → a block this editor doesn't understand, kept as-is
 *   ::: 접기 Title … :::      → toggle: a section titled `▶ Title` (Misskey shows it as a
 *                              plain section; Miscord folds it). `::: details` works too.
 *
 * Lines inside ``` fences are always text, so code can contain `#`.
 *
 * A `---` fenced YAML-ish header at the very top (Jekyll-style front matter) is kept as its
 * own text block, which Miscord shows as a property table. On save a one-line note pointing
 * Misskey readers to Miscord is appended; Miscord hides it and the editor never shows it.
 */

const HEADING = /^(#{1,6})[ \t]+(\S.*?)[ \t]*$/
const EMBED = /^!\[([^\]\n]*)\]\((file|note|block):([^\s)]+)\)[ \t]*$/
const FENCE = /^```/
const MAX_DEPTH = 6
const TOGGLE_OPEN = /^:::[ \t]*(?:접기|details)(?:[ \t]+(\S.*?))?[ \t]*$/
const TOGGLE_CLOSE = /^:::[ \t]*$/
const TOGGLE_MARK = '▶ '

/** A section saved from `::: 접기` — Miscord shows it folded. */
export function isToggleSection(b: PageBlock): boolean {
  return b.type === 'section' && !!b.title?.startsWith(TOGGLE_MARK)
}

export function toggleTitle(b: PageBlock): string {
  return b.title?.slice(TOGGLE_MARK.length).trim() || '더 보기'
}

export interface PageTextOptions {
  /** Blocks referenced by `block:<id>` lines; filled by pageBlocksToText. */
  keep?: Map<string, PageBlock>
  /** Local host, so pasted note URLs from it become note blocks. */
  host?: string
  newId?: () => string
}

export function pageBlocksToText(blocks: PageBlock[], keep: Map<string, PageBlock> = new Map(), depth = 0, root = true): string {
  const out: string[] = []
  for (const b of blocks) {
    if (root && isMiscordFooter(b)) continue
    switch (b.type) {
      case 'text':
        if (b.text?.trim()) out.push(b.text.replace(/\s+$/, ''))
        break
      case 'section': {
        if (isToggleSection(b)) {
          out.push(`::: 접기 ${toggleTitle(b)}`)
          // Headings inside a toggle count from # again; the toggle keeps them in
          const inner = pageBlocksToText(b.children ?? [], keep, 0, false)
          if (inner) out.push(inner)
          out.push(':::')
          break
        }
        out.push(`${'#'.repeat(Math.min(depth + 1, MAX_DEPTH))} ${b.title?.trim() || '제목 없음'}`)
        const inner = pageBlocksToText(b.children ?? [], keep, depth + 1, false)
        if (inner) out.push(inner)
        break
      }
      case 'image':
        if (b.fileId) out.push(`![이미지](file:${b.fileId})`)
        break
      case 'note':
        if (b.note) out.push(`![${b.detailed ? '자세히' : '노트'}](note:${b.note})`)
        break
      default:
        keep.set(b.id, b)
        out.push(`![${b.type}](block:${b.id})`)
    }
  }
  return out.join('\n\n')
}

export function pageTextToBlocks(src: string, opts: PageTextOptions = {}): PageBlock[] {
  const newId = opts.newId ?? (() => crypto.randomUUID())
  const noteUrl = opts.host
    ? new RegExp(`^https?://${opts.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/notes/([a-zA-Z0-9]+)[ \\t]*$`)
    : null
  const root: PageBlock[] = []
  // A toggle entry stops headings from closing it; only `:::` does
  const stack: { level: number, children: PageBlock[], toggle?: boolean }[] = [{ level: 0, children: root }]
  const top = () => stack[stack.length - 1]!.children
  let buf: string[] = []
  let fenced = false
  let lines = src.split(/\r?\n/)

  // Front matter stays a block of its own so it can be found again
  let front: PageBlock | null = null
  const fm = frontMatterAt(lines)
  if (fm) {
    front = { id: newId(), type: 'text', text: lines.slice(0, fm).join('\n') }
    root.push(front)
    lines = lines.slice(fm)
  }

  function flush() {
    const text = buf.join('\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '')
    buf = []
    if (!text) return
    // Text split only by blank lines stays one block
    const prev = top().at(-1)
    if (prev?.type === 'text' && prev !== front) prev.text = `${prev.text}\n\n${text}`
    else top().push({ id: newId(), type: 'text', text })
  }

  for (const line of lines) {
    if (fenced || FENCE.test(line)) {
      if (FENCE.test(line)) fenced = !fenced
      buf.push(line)
      continue
    }
    const h = HEADING.exec(line)
    if (h) {
      flush()
      const level = h[1]!.length
      while (stack.length > 1 && !stack.at(-1)!.toggle && stack.at(-1)!.level >= level) stack.pop()
      const section: PageBlock = { id: newId(), type: 'section', title: h[2]!, children: [] }
      top().push(section)
      stack.push({ level, children: section.children! })
      continue
    }
    const t = TOGGLE_OPEN.exec(line)
    if (t) {
      flush()
      const toggle: PageBlock = { id: newId(), type: 'section', title: `${TOGGLE_MARK}${t[1] ?? '더 보기'}`, children: [] }
      top().push(toggle)
      stack.push({ level: 0, children: toggle.children!, toggle: true })
      continue
    }
    if (TOGGLE_CLOSE.test(line) && stack.some(x => x.toggle)) {
      flush()
      while (!stack.pop()!.toggle) { /* close sections opened inside the toggle */ }
      continue
    }
    const e = EMBED.exec(line)
    if (e && (e[2] !== 'block' || opts.keep?.has(e[3]!))) {
      const [, label, kind, ref] = e
      flush()
      top().push(kind === 'file'
        ? { id: newId(), type: 'image', fileId: ref! }
        : kind === 'note'
          ? { id: newId(), type: 'note', note: ref!, detailed: label === '자세히' }
          : opts.keep!.get(ref!)!)
      continue
    }
    const n = noteUrl?.exec(line)
    if (n) {
      flush()
      top().push({ id: newId(), type: 'note', note: n[1]!, detailed: false })
      continue
    }
    buf.push(line)
  }
  flush()
  return root
}

/** Plain-ish preview text for a gallery card. */
export function pageExcerpt(blocks: PageBlock[]): string {
  const first = (list: PageBlock[]): string => {
    for (const b of list) {
      if (b.type === 'text' && b.text?.trim()) return b.text.trim()
      if (b.children) {
        const inner = first(b.children)
        if (inner) return inner
      }
    }
    return ''
  }
  return first(splitPageContent(blocks).blocks)
}

// --- Front matter ---

export interface PageProperty {
  key: string
  value: string | string[]
}

const FM_FENCE = /^---[ \t]*$/
const FM_KEY = /^([^\s:#\-][^:]*?)[ \t]*:(?:[ \t]+(.*?))?[ \t]*$/
const FM_ITEM = /^[ \t]+-[ \t]+(.*?)[ \t]*$|^-[ \t]+(.*?)[ \t]*$/

function unquote(v: string) {
  const m = /^(["'])(.*)\1$/.exec(v)
  return m ? m[2]! : v
}

/** `key: value` lines (plus `[a, b]` and `- item` lists) → properties; null when it isn't that shape. */
export function parseFrontMatter(body: string): PageProperty[] | null {
  const props: PageProperty[] = []
  for (const line of body.split('\n')) {
    if (!line.trim() || /^[ \t]*#/.test(line)) continue
    const item = FM_ITEM.exec(line)
    const last = props.at(-1)
    if (item && last && (Array.isArray(last.value) || last.value === '')) {
      last.value = [...(Array.isArray(last.value) ? last.value : []), unquote(item[1] ?? item[2] ?? '')]
      continue
    }
    const kv = FM_KEY.exec(line)
    if (!kv) return null
    const raw = kv[2] ?? ''
    const list = /^\[(.*)\]$/.exec(raw)
    props.push({
      key: kv[1]!,
      value: list ? list[1]!.split(',').map(s => unquote(s.trim())).filter(Boolean) : unquote(raw),
    })
  }
  return props.length ? props : null
}

/** Number of lines the front matter at the top of `lines` takes, or 0 when there is none. */
function frontMatterAt(lines: string[]): number {
  if (!FM_FENCE.test(lines[0] ?? '')) return 0
  const end = lines.findIndex((l, i) => i > 0 && FM_FENCE.test(l))
  if (end < 2 || !parseFrontMatter(lines.slice(1, end).join('\n'))) return 0
  return end + 1
}

/** Front matter at the top of an editor text, lifted out; `body` is the rest. */
export function splitFrontMatter(text: string): { properties: PageProperty[], body: string } {
  const lines = text.split(/\r?\n/)
  const n = frontMatterAt(lines)
  if (!n) return { properties: [], body: text }
  return {
    properties: parseFrontMatter(lines.slice(1, n - 1).join('\n')) ?? [],
    body: lines.slice(n).join('\n').replace(/^(?:[ \t]*\n)+/, ''),
  }
}

/** Keeps a value from reading back as a list or losing its own quotes. */
function fmValue(v: string): string {
  const s = v.replace(/\s*\n\s*/g, ' ').trim()
  return /^(["']).*\1$|^\[.*\]$/.test(s) ? `"${s}"` : s
}

/** A property name front matter can hold: no colons, no leading `#` / `-`. */
export function cleanPropertyKey(key: string): string {
  return key.replace(/[:\s]+/g, ' ').replace(/^[\s#-]+/, '').trim()
}

/** Properties → front matter (with a trailing newline), or '' when there are none. */
export function frontMatterText(properties: PageProperty[]): string {
  const rows: string[] = []
  for (const p of properties) {
    const key = cleanPropertyKey(p.key)
    if (!key) continue
    if (!Array.isArray(p.value)) {
      rows.push(`${key}: ${fmValue(p.value)}`.trimEnd())
      continue
    }
    const items = p.value.map(fmValue).filter(Boolean)
    rows.push(items.length ? `${key}:` : `${key}: []`, ...items.map(v => `  - ${v}`))
  }
  return rows.length ? `---\n${rows.join('\n')}\n---\n` : ''
}

function frontMatterOf(b: PageBlock | undefined): PageProperty[] | null {
  if (b?.type !== 'text' || !b.text) return null
  const lines = b.text.split('\n')
  return frontMatterAt(lines) === lines.length ? parseFrontMatter(lines.slice(1, -1).join('\n')) : null
}

// --- Note for Misskey readers ---

const FOOTER = /^<small>[^\n]*Miscord[^\n]*\]\(https?:\/\/[^\s)]+\/p\/[^\s)]+\)[^\n]*<\/small>$/

/** The line telling Misskey readers the page was written in (and reads best in) Miscord. */
export function miscordFooterText(url: string): string {
  return `<small>이 글은 Miscord로 작성되어 Miscord에서 가장 보기 좋아요. ?[Miscord에서 읽기 →](${url})</small>`
}

export function isMiscordFooter(b: PageBlock): boolean {
  return b.type === 'text' && !!b.text && FOOTER.test(b.text.trim())
}

/** The blocks to save: content plus a fresh footer at the very end (an old one is replaced). */
export function withMiscordFooter(blocks: PageBlock[], url: string, newId: () => string = () => crypto.randomUUID()): PageBlock[] {
  return [...blocks.filter(b => !isMiscordFooter(b)), { id: newId(), type: 'text', text: miscordFooterText(url) }]
}

/** What Miscord shows: the front matter as properties, the rest without the Misskey-only footer. */
export function splitPageContent(blocks: PageBlock[]): { properties: PageProperty[] | null, blocks: PageBlock[] } {
  const rest = blocks.filter(b => !isMiscordFooter(b))
  const properties = frontMatterOf(rest[0])
  return { properties, blocks: properties ? rest.slice(1) : rest }
}

/** First image block's file id, used as the card cover when the page has no eye-catching image. */
export function pageFirstImageId(blocks: PageBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === 'image' && b.fileId) return b.fileId
    if (b.children) {
      const inner = pageFirstImageId(b.children)
      if (inner) return inner
    }
  }
  return null
}

/** Misskey's own constraint on page names (they are URL path segments). */
export const PAGE_NAME_RE = /^[^\s:/?#[\]@!$&'()*+,;=\\%]{1,256}$/
