<script setup lang="ts">
import type { MdBlock } from '~/utils/pageMarkdown'

/** A page text block: MFM plus the Markdown block syntax MFM lacks (lists, tables, dividers). */
const props = defineProps<{ text?: string, blocks?: MdBlock[] }>()

const parsed = computed(() => props.blocks ?? parsePageMarkdown(props.text ?? ''))
</script>

<template>
  <div class="md">
    <template v-for="(b, i) in parsed" :key="i">
      <MfmText v-if="b.type === 'mfm'" class="para" :text="b.text" />
      <hr v-else-if="b.type === 'hr'" class="hr">
      <component :is="b.ordered ? 'ol' : 'ul'" v-else-if="b.type === 'list'" class="list" :start="b.ordered && b.start !== 1 ? b.start : undefined">
        <li v-for="(item, j) in b.items" :key="j" :class="{ task: item.checked !== null, done: item.checked }">
          <input v-if="item.checked !== null" type="checkbox" :checked="item.checked" disabled>
          <PageInline class="item-text" :text="item.text" />
          <PageMarkdown v-if="item.children.length" :blocks="item.children" />
        </li>
      </component>
      <div v-else-if="b.type === 'table'" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th v-for="(c, j) in b.head" :key="j" :style="{ textAlign: b.align[j] ?? undefined }"><PageInline :text="c" /></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in b.rows" :key="r">
              <td v-for="(c, j) in row" :key="j" :style="{ textAlign: b.align[j] ?? undefined }"><PageInline :text="c" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.md {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.para,
.item-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.hr {
  width: 100%;
  margin: 8px 0;
  border: none;
  border-top: 1px solid var(--border);
}
.list {
  margin: 0;
  padding-left: 1.6em;
  text-align: left;
}
.list li {
  margin: 2px 0;
}
.list li::marker {
  color: var(--fg-muted);
}
.list .md {
  margin-top: 2px;
  gap: 0;
}
.list li.task {
  list-style: none;
  margin-left: -1.3em;
}
.list li.task > input {
  margin: 0 6px 0 0;
  vertical-align: -1px;
  accent-color: var(--accent);
}
.list li.done > .item-text {
  color: var(--fg-muted);
  text-decoration: line-through;
}
/* Tables sit centered and fill the column; a too-wide one scrolls inside */
.table-wrap {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  /* Rounded outline like the toggle card; overflow clips the header's corners */
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
table {
  width: 100%;
  margin: 0 auto;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.5;
}
/* Minimal: no vertical rules, a firmer line under the header, hairlines between rows */
th,
td {
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}
/* Images in cells stay at most 200px tall; auto width/height keeps their aspect ratio */
th :deep(.img img),
td :deep(.img img) {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 128px;
}
th {
  border-bottom: 2px solid var(--border);
  background: var(--bg-embed);
  color: var(--fg-strong);
  font-weight: 700;
}
tbody tr:last-child td {
  border-bottom: none;
}
tbody tr:hover td {
  background: var(--bg-hover);
}
</style>
