<script setup lang="ts">
/** An https image URL setting with a drive picker. */
const model = defineModel<string>({ required: true })
const props = defineProps<{ label: string, hint?: string }>()
const picking = ref(false)
</script>

<template>
  <div class="mh-field">
    <span>{{ props.label }}</span>
    <div class="mh-row">
      <img v-if="model" class="pv" :src="model" alt="">
      <input v-model.trim="model" class="mh-input grow" placeholder="https://…">
      <button type="button" class="mh-btn small" @click="picking = true">드라이브</button>
      <button v-if="model" type="button" class="mh-btn small" @click="model = ''">지우기</button>
    </div>
    <small v-if="props.hint">{{ props.hint }}</small>
    <AdminDrivePicker v-if="picking" @close="picking = false" @pick="(f) => { model = f[0]!.url; picking = false }" />
  </div>
</template>

<style scoped>
.grow {
  flex: 1;
  min-width: 0;
}
.pv {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border: 1px solid var(--border);
}
</style>
