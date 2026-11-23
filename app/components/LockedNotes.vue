<script setup lang="ts">
/** Stand-in for notes the site's server only shows to people signed in there. */
const props = defineProps<{ small?: boolean, count?: boolean }>()
const { site } = useSite()
</script>

<template>
  <p v-if="props.small" class="mh-locked small">
    <span class="ic" aria-hidden="true">🔒</span>{{ site!.host }} 계정으로 로그인하면 볼 수 있어요.
  </p>
  <div v-else class="mh-locked">
    <span class="ic" aria-hidden="true">🔒</span>
    <template v-if="props.count"><b>노트 {{ site!.owner.notesCount }}개</b>가 있지만, </template>
    {{ site!.host }} 서버는 로그인한 사람에게만 노트를 보여줘요.<br>
    {{ site!.host }} 계정으로 로그인하면 볼 수 있어요.
  </div>
</template>
