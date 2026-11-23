import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

async function load(file, modules = {}) {
  const source = await readFile(new URL(`../app/utils/${file}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: name => modules[name] ?? require(name) })
  return exports
}

const pageText = await load('pageText.ts')
const tags = await load('tags.ts', { './pageText': pageText })

test('hashtags come out of MFM text without duplicates', () => {
  assert.deepEqual([...tags.hashtagsIn('그림 #낙서 #OC 그리고 또 #낙서')], ['낙서', 'OC'])
  assert.deepEqual([...tags.hashtagsIn(null)], [])
})

test('page categories: front matter tags, summary and body hashtags', () => {
  const page = {
    summary: '설정 모음 #세계관',
    content: [
      { id: 'fm', type: 'text', text: '---\ntags: [OC, 세계관]\n---' },
      { id: 's', type: 'section', title: '1장', children: [{ id: 't', type: 'text', text: '본문 #oc #소설' }] },
    ],
  }
  assert.deepEqual([...tags.pageTags(page)], ['OC', '세계관', '소설'])
})
