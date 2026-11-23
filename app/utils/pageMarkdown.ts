/*
 * Markdown block syntax MFM doesn't have, for page text (shared with Miscord):
 *
 *   - item / * item / + item     → bullet list (indent to nest)
 *   1. item                      → numbered list
 *   - [ ] todo / - [x] done      → task list
 *   | a | b |  + | --- | :-: |   → table (`:` in the divider sets alignment)
 *   ---  ***  ___                → divider
 *
 * Everything else stays MFM. Lines inside ``` fences or an unclosed `$[…]` / `<center>`
 * (MFM that spans lines) are never split out, so multi-line MFM keeps working.
 * On Misskey the same lines read as plain text, which is how Markdown is meant to degrade.
 */

export type Align = 'left' | 'center' | 'right' | null

export interface MdItem {
  text: string
  /** Task list state; null for an ordinary item */
  checked: boolean | null
  children: MdList[]
}

export interface MdList {
  type: 'list'
  ordered: boolean
  start: number
  items: MdItem[]
}

export type MdBlock =
  | { type: 'mfm', text: string }
  | MdList
  | { type: 'table', align: Align[], head: string[], rows: string[][] }
  | { type: 'hr' }

const LIST = /^([ \t]*)([-*+]|(\d{1,9})[.)])[ \t]+(\S.*)$/
const TASK = /^\[([ xX])\][ \t]+(.*)$/
const HR = /^[ \t]{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const TABLE_SEP = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const FENCE = /^```/
const MFM_TAG = /<(\/?)(center|small|plain|i|b|s)>/g

const indentOf = (s: string) => s.replace(/\t/g, '    ').length

/** Cells of a `| a | b |` row; `\|` is a literal pipe. */
export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
  return body.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'))
}

function alignOf(cell: string): Align {
  const l = cell.startsWith(':')
  const r = cell.endsWith(':')
  return l && r ? 'center' : r ? 'right' : l ? 'left' : null
}

/** Tracks MFM constructs left open across lines. */
class Nesting {
  fn = 0
  tags = 0
  fenced = false

  get open() {
    return this.fenced || this.fn > 0 || this.tags > 0
  }

  feed(line: string) {
    if (FENCE.test(line)) {
      this.fenced = !this.fenced
      return
    }
    if (this.fenced) return
    const stack: ('fn' | 'br')[] = Array(this.fn).fill('fn')
    const s = line.replace(/`[^`\n]*`/g, '')
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '$' && s[i + 1] === '[') {
        stack.push('fn')
        i++
      }
      else if (s[i] === '[') {
        stack.push('br')
      }
      else if (s[i] === ']') {
        stack.pop()
      }
    }
    // Plain brackets (links) never span lines
    this.fn = stack.filter(k => k === 'fn').length
    for (const m of s.matchAll(MFM_TAG)) this.tags = Math.max(0, this.tags + (m[1] ? -1 : 1))
  }
}

interface Entry {
  indent: number
  ordered: boolean
  num: number
  text: string
  checked: boolean | null
}

function entryOf(line: string): Entry | null {
  const m = LIST.exec(line)
  if (!m) return null
  const task = TASK.exec(m[4]!)
  return {
    indent: indentOf(m[1]!),
    ordered: m[3] != null,
    num: m[3] != null ? Number(m[3]) : 1,
    text: task ? task[2]! : m[4]!,
    checked: task ? task[1] !== ' ' : null,
  }
}

/** Flat entries → nested lists by indentation. */
function nest(entries: Entry[]): MdList[] {
  const root: MdList[] = []
  const stack: { indent: number, list: MdList, container: MdList[] }[] = []
  const newList = (e: Entry): MdList => ({ type: 'list', ordered: e.ordered, start: e.num, items: [] })
  for (const e of entries) {
    while (stack.length && e.indent < stack.at(-1)!.indent) stack.pop()
    let top = stack.at(-1)
    if (top && e.indent > top.indent) {
      const parent = top.list.items.at(-1)!
      const list = newList(e)
      parent.children.push(list)
      stack.push(top = { indent: e.indent, list, container: parent.children })
    }
    else if (!top || top.list.ordered !== e.ordered) {
      const container = top?.container ?? root
      const list = newList(e)
      container.push(list)
      if (top) stack.pop()
      stack.push(top = { indent: e.indent, list, container })
    }
    top.list.items.push({ text: e.text, checked: e.checked, children: [] })
  }
  return root
}

export function parsePageMarkdown(src: string): MdBlock[] {
  const lines = src.split('\n')
  const out: MdBlock[] = []
  const nesting = new Nesting()
  let buf: string[] = []

  const flush = () => {
    const text = buf.join('\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '')
    buf = []
    if (text) out.push({ type: 'mfm', text })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (nesting.open) {
      nesting.feed(line)
      buf.push(line)
      continue
    }

    if (HR.test(line)) {
      flush()
      out.push({ type: 'hr' })
      continue
    }

    const next = lines[i + 1]
    if (line.includes('|') && next != null && TABLE_SEP.test(next) && next.includes('-')) {
      const head = splitRow(line)
      const align = splitRow(next).map(alignOf)
      if (head.length === align.length) {
        flush()
        const rows: string[][] = []
        i += 2
        while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim()) {
          const cells = splitRow(lines[i]!)
          rows.push(head.map((_, c) => cells[c] ?? ''))
          i++
        }
        i--
        out.push({ type: 'table', align, head, rows })
        continue
      }
    }

    const first = entryOf(line)
    if (first) {
      flush()
      const entries = [first]
      while (i + 1 < lines.length) {
        const l = lines[i + 1]!
        const e = entryOf(l)
        if (e && !HR.test(l)) {
          entries.push(e)
          i++
          continue
        }
        // Indented lines continue the item above
        if (l.trim() && /^[ \t]/.test(l)) {
          entries.at(-1)!.text += `\n${l.trim()}`
          i++
          continue
        }
        // A blank line between items keeps the list going
        if (!l.trim()) {
          let j = i + 1
          while (j < lines.length && !lines[j]!.trim()) j++
          if (j < lines.length && entryOf(lines[j]!) && !HR.test(lines[j]!)) {
            i = j - 1
            continue
          }
        }
        break
      }
      out.push(...nest(entries))
      continue
    }

    nesting.feed(line)
    buf.push(line)
  }
  flush()
  return out
}


export type InlinePart = { type: 'text', text: string } | { type: 'image', alt: string, url: string }

const INLINE_IMAGE = /!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)/g

/**
 * `![alt](https://…)` inside table cells and list items → images; the rest stays MFM.
 * On Misskey the same text reads as `!` and a link to the image.
 */
export function splitInlineImages(text: string): InlinePart[] {
  const out: InlinePart[] = []
  let last = 0
  for (const m of text.matchAll(INLINE_IMAGE)) {
    if (m.index! > last) out.push({ type: 'text', text: text.slice(last, m.index) })
    out.push({ type: 'image', alt: m[1]!, url: m[2]! })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) })
  return out
}
