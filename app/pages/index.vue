<script setup lang="ts">
const { accounts, current, use, remove } = useAccounts()
const toast = useToast()
const visit = ref('')
const loginHost = ref('')
/** example address shown in the hint, e.g. https://i.chigoa.me/@아이디@서버 */
const exampleUrl = appUrl('/@아이디@서버')

useHead({ title: '이치고아메 — 미스키로 짓는 내 홈페이지' })

function go() {
  const raw = visit.value.trim()
  // accepts @user@host, user@host, https://host/@user
  const url = /^https?:\/\/([^/]+)\/@([a-zA-Z0-9_]+)\/?$/.exec(raw)
  const acct = /^@?([a-zA-Z0-9_]+)@([a-zA-Z0-9.-]+(?::\d+)?)$/.exec(raw)
  const parsed = url ? { username: url[2]!, host: url[1]! } : acct ? { username: acct[1]!, host: acct[2]! } : null
  if (!parsed) return toast.error('@아이디@서버 형식으로 입력해 주세요.')
  navigateTo(sitePath(parsed.username, parsed.host.toLowerCase()))
}

function login() {
  try {
    startMiAuth(loginHost.value || 'misskey.io')
  }
  catch (e) {
    toast.error(e)
  }
}
</script>

<template>
  <div class="landing">
    <div class="frame">
      <header>
        <p class="since">since 2026 · no server · just misskey</p>
        <h1>이치고아메</h1>
        <p class="lead">미스키 계정의 <b>페이지</b>·<b>갤러리</b>·<b>클립</b>으로 꾸미는 개인 홈페이지</p>
      </header>

      <section class="box">
        <h2>≫ VISIT</h2>
        <form class="mh-row" @submit.prevent="go">
          <input v-model="visit" class="mh-input grow" placeholder="@username@misskey.example" autocapitalize="off" autocorrect="off" spellcheck="false">
          <button class="mh-btn primary">놀러가기</button>
        </form>
        <p class="hint">주소는 <code>{{ exampleUrl }}</code> 모양이에요. 로그인 없이도 볼 수 있어요.</p>
      </section>

      <section v-if="accounts.length" class="box">
        <h2>≫ MY HOUSE</h2>
        <ul class="accs">
          <li v-for="a in accounts" :key="a.key" :class="{ on: current?.key === a.key }">
            <img v-if="a.user.avatarUrl" :src="a.user.avatarUrl" alt="">
            <span class="who"><b>{{ a.user.name ?? a.user.username }}</b> <span class="mh-muted">@{{ a.key }}</span></span>
            <NuxtLink class="mh-btn small" :to="sitePath(a.user.username, a.host)" @click="use(a.key)">내 홈</NuxtLink>
            <NuxtLink class="mh-btn small" :to="sitePath(a.user.username, a.host, 'admin')" @click="use(a.key)">관리</NuxtLink>
            <button class="mh-btn small" @click="remove(a.key)">로그아웃</button>
          </li>
        </ul>
      </section>

      <section class="box">
        <h2>≫ LOGIN</h2>
        <form class="mh-row" @submit.prevent="login">
          <input v-model="loginHost" class="mh-input grow" placeholder="misskey.io" autocapitalize="off" autocorrect="off" spellcheck="false">
          <button class="mh-btn">MiAuth 로그인</button>
        </form>
        <p class="hint">로그인하면 내 홈페이지를 꾸미고, 다른 사람 홈페이지에 방명록·박수·좋아요를 남길 수 있어요. 토큰은 이 브라우저에만 저장돼요.</p>
      </section>

      <section class="box how">
        <h2>≫ HOW IT WORKS</h2>
        <dl>
          <dt>Text</dt><dd>미스키 <b>페이지</b>가 글·소설·설정 문서가 돼요.</dd>
          <dt>Gallery</dt><dd>미스키 <b>갤러리</b> 게시물이 그림 게시판이 돼요.</dd>
          <dt>Board</dt><dd>공개 <b>클립</b>이 게시판·스크랩북이 돼요.</dd>
          <dt>Guestbook</dt><dd>노트 하나의 <b>답글</b>이 방명록, 리액션이 박수가 돼요. 비밀글은 "지정 공개"로.</dd>
          <dt>Setting</dt><dd>스킨·메뉴 같은 설정은 <code>mi-house</code>라는 공개 페이지에 저장돼요. 별도 서버가 없어요.</dd>
        </dl>
      </section>

      <footer>이치고아메 · powered by Misskey API · font: 부산단디 ⓒ부산광역시 (공공누리 제1유형)</footer>
    </div>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 12px;
  background-color: #fbeff3;
  background-image: radial-gradient(circle, rgb(224 120 154 / 0.25) 1.2px, transparent 1.6px);
  background-size: 14px 14px;
  font-size: 12px;
}
.frame {
  width: min(620px, 100%);
  /* auto on all sides centres vertically, but stays top-aligned when taller than the screen */
  margin: auto;
  padding: 18px 22px;
  background: #fff;
  border: 1px dotted var(--accent);
  box-shadow: 4px 4px 0 var(--accent-soft);
}
header {
  text-align: center;
  padding-bottom: 14px;
  border-bottom: 1px dotted var(--accent);
}
.since {
  margin: 0;
  font-family: Verdana, sans-serif;
  font-size: 10px;
  letter-spacing: 0.25em;
  color: var(--fg-muted);
}
h1 {
  margin: 6px 0;
  font-family: var(--font-title);
  font-style: italic;
  font-weight: normal;
  font-size: 34px;
  letter-spacing: 0.08em;
  color: var(--accent);
}
.lead {
  margin: 0;
}
.box {
  margin-top: 18px;
}
h2 {
  margin: 0 0 8px;
  font-family: Verdana, sans-serif;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--accent);
}
.grow {
  flex: 1;
  min-width: 0;
}
.hint {
  margin: 6px 0 0;
  color: var(--fg-muted);
  font-size: 11px;
}
.accs {
  list-style: none;
  margin: 0;
  padding: 0;
}
.accs li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px dotted var(--border);
}
.accs li.on .who b {
  color: var(--accent);
}
.accs img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.who {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.how dl {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 4px 10px;
  margin: 0;
}
.how dt {
  font-family: Verdana, sans-serif;
  font-size: 11px;
  color: var(--accent);
}
.how dd {
  margin: 0;
}
footer {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px dotted var(--accent);
  text-align: center;
  font-family: Verdana, sans-serif;
  font-size: 10px;
  color: var(--fg-muted);
}
</style>
