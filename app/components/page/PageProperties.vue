<script setup lang="ts">
import type { PageProperty } from '~/utils/pageText'

/** Front matter at the top of a page, shown as a Notion-style property list. */
const props = defineProps<{ properties: PageProperty[] }>()
</script>

<template>
  <dl class="props">
    <template v-for="(p, i) in props.properties" :key="i">
      <dt>{{ p.key }}</dt>
      <dd>
        <span v-if="Array.isArray(p.value) && p.value.length" class="chips">
          <MfmText v-for="(v, j) in p.value" :key="j" class="chip" :text="v" />
        </span>
        <MfmText v-else-if="typeof p.value === 'string' && p.value" :text="p.value" />
        <span v-else class="empty">비어 있음</span>
      </dd>
    </template>
  </dl>
</template>

<style scoped>
.props {
  display: grid;
  grid-template-columns: minmax(80px, max-content) minmax(0, 1fr);
  gap: 2px 16px;
  margin: 0;
  padding: 8px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
}
dt {
  padding: 4px 0;
  color: var(--fg-muted);
  overflow-wrap: anywhere;
}
dd {
  margin: 0;
  padding: 4px 0;
  color: var(--fg);
  overflow-wrap: anywhere;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  padding: 1px 8px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--fg-strong);
  font-size: 13px;
}
.empty {
  color: var(--fg-faint);
}
</style>
