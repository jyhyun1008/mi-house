<script setup lang="ts">
/**
 * ♥ for pages and gallery posts. Misskey only lets accounts on the same server like them,
 * so visitors from elsewhere get a link to the original instead.
 */
const props = defineProps<{ kind: 'page' | 'gallery', id: string, liked?: boolean, count: number, href: string }>()
const emit = defineEmits<{ change: [liked: boolean, count: number] }>()
const { local, isOwner } = useSite()
const toast = useToast()
const busy = ref(false)

async function toggle() {
  const like = !props.liked
  busy.value = true
  try {
    const ep = props.kind === 'page' ? (like ? 'pages/like' : 'pages/unlike') : (like ? 'gallery/posts/like' : 'gallery/posts/unlike')
    await apiCall(local.value!.host, ep, props.kind === 'page' ? { pageId: props.id } : { postId: props.id }, local.value!.token)
    emit('change', like, props.count + (like ? 1 : -1))
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <button v-if="local && !isOwner" class="mh-btn small like" :class="{ on: props.liked }" :disabled="busy" @click="toggle">
    {{ props.liked ? '♥' : '♡' }} {{ props.count }}
  </button>
  <a v-else class="mh-btn small like" :href="props.href" target="_blank" rel="noopener noreferrer" :title="isOwner ? '받은 좋아요' : '좋아요는 같은 서버 계정으로 원본에서 누를 수 있어요'">♡ {{ props.count }}</a>
</template>

<style scoped>
.like.on {
  color: var(--accent);
  border-color: var(--accent);
}
</style>
