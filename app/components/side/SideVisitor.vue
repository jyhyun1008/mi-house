<script setup lang="ts">
const props = defineProps<{ bare?: boolean }>()
const route = useRoute()
const { site, current, isOwner, path } = useSite()
const { accounts, use } = useAccounts()
const toast = useToast()
const host = ref('')

function login() {
  try {
    startMiAuth(host.value || site.value!.host, route.fullPath)
  }
  catch (e) {
    toast.error(e)
  }
}

function switchTo(key: string) {
  use(key)
  // Re-fetch as the new viewer (likes, secret posts)
  const s = site.value
  if (s) loadSite(s.username, s.host, accounts.value.find(a => a.key === key && a.host === s.host)?.token).then(v => (site.value = v)).catch(() => {})
}
</script>

<template>
  <component :is="props.bare ? 'div' : 'section'" :class="{ 'mh-box': !props.bare }">
    <h2 v-if="!props.bare" class="mh-box-title">Visitor</h2>
    <template v-if="current">
      <p class="who">
        <img v-if="current.user.avatarUrl" :src="current.user.avatarUrl" alt="">
        <span><b>{{ current.user.name ?? current.user.username }}</b> 님<br><span class="mh-muted">@{{ current.key }}</span></span>
      </p>
      <div class="mh-row">
        <NuxtLink v-if="isOwner" class="mh-btn small primary" :to="path('admin')">관리</NuxtLink>
        <NuxtLink class="mh-btn small" :to="sitePath(current.user.username, current.host)">내 홈</NuxtLink>
        <select v-if="accounts.length > 1" class="mh-select small" :value="current.key" @change="switchTo(($event.target as HTMLSelectElement).value)">
          <option v-for="a in accounts" :key="a.key" :value="a.key">@{{ a.key }}</option>
        </select>
      </div>
    </template>
    <form v-else class="login" @submit.prevent="login">
      <p class="mh-muted">로그인하면 방명록·박수·좋아요를 남길 수 있어요.</p>
      <div class="mh-row">
        <input v-model="host" class="mh-input" :placeholder="site?.host" autocapitalize="off" spellcheck="false">
        <button class="mh-btn small">Login</button>
      </div>
    </form>
  </component>
</template>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  word-break: break-all;
}
.who img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.login p {
  margin: 0 0 6px;
}
.login .mh-input {
  flex: 1;
  min-width: 0;
}
.small {
  width: auto;
  padding: 1px 4px;
  font-size: 0.9em;
}
</style>
