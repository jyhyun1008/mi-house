<script setup lang="ts">
import type { Clip, Note, Page } from '~/types/misskey'
import type { MenuItem, MenuType, SiteConfig } from '~/utils/site'

const { site, isOwner, ownerApi, saveConfig, path } = useSite()
const toast = useToast()

const tab = ref<'basic' | 'look' | 'menu' | 'banner' | 'guestbook' | 'domain'>('basic')
const draft = ref<SiteConfig>(JSON.parse(JSON.stringify(site.value!.config)))
const saving = ref(false)
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(site.value!.config))

async function save() {
  saving.value = true
  try {
    await saveConfig(normalizeConfig(draft.value, site.value!.owner.name ?? ''))
    draft.value = JSON.parse(JSON.stringify(site.value!.config))
    toast.info('저장했어요. 설정은 공개 페이지 "mi-house"에 들어 있어요.')
  }
  catch (e) {
    toast.error(e)
  }
  finally {
    saving.value = false
  }
}

// --- choices for menu items ---
const clips = ref<Clip[]>([])
const pages = ref<Page[]>([])
onMounted(async () => {
  if (!isOwner.value) return
  ;[clips.value, pages.value] = await Promise.all([
    ownerApi<Clip[]>('clips/list').catch(() => []),
    ownerApi<Page[]>('i/pages', { limit: 100 }).then(p => p.filter(x => x.name !== CONFIG_PAGE_NAME)).catch(() => []),
  ])
})

const newType = ref<MenuType>('clip')
function addMenu() {
  const t = MENU_TYPES.find(m => m.type === newType.value)!
  const item: MenuItem = { id: `m-${Date.now().toString(36)}`, type: t.type, label: t.label }
  if (t.type === 'clip') Object.assign(item, { clipId: clips.value[0]?.id ?? '', view: 'board', label: clips.value[0]?.name ?? 'Clip' })
  if (t.type === 'page') Object.assign(item, { pageName: pages.value[0]?.name ?? '', label: pages.value[0]?.title ?? 'Page' })
  if (t.type === 'link') item.url = 'https://'
  draft.value.menu.push(item)
}
function moveMenu(i: number, d: number) {
  const m = draft.value.menu
  const j = i + d
  if (j < 0 || j >= m.length) return
  ;[m[i], m[j]] = [m[j]!, m[i]!]
}
// --- pin bar links ---
const pinUrl = ref('')
function addPin() {
  const res = parseSiteLink(pinUrl.value, site.value!.username, site.value!.host, appUrl('/'), site.value!.config.customDomain)
  if ('error' in res) return toast.error(res.error)
  if (draft.value.pinBar.some(l => l.path === res.path)) return toast.error('이미 들어 있는 링크예요.')
  draft.value.pinBar.push({ path: res.path, label: '' })
  pinUrl.value = ''
}
function movePin(i: number, d: number) {
  const list = draft.value.pinBar
  const j = i + d
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
}

function addBanner() {
  draft.value.banners.push({ id: `b-${Date.now().toString(36)}`, image: '', url: '', label: '' })
}
function moveBanner(i: number, d: number) {
  const list = draft.value.banners
  const j = i + d
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
}
const typeLabel = (t: MenuType) => MENU_TYPES.find(m => m.type === t)?.desc ?? t

// --- guestbook ---
const gbText = ref(`📖 방명록이에요. 이 노트에 답글을 달면 홈페이지 방명록에 올라가요!`)
const gbExisting = ref('')
async function createGuestbook() {
  try {
    const res = await ownerApi<{ createdNote: Note }>('notes/create', { text: gbText.value, visibility: 'public' })
    draft.value.guestbookNoteId = res.createdNote.id
    await save()
  }
  catch (e) {
    toast.error(e)
  }
}
function useExisting() {
  const id = /\/notes\/([a-zA-Z0-9]+)/.exec(gbExisting.value)?.[1] ?? gbExisting.value.trim()
  if (!/^[a-zA-Z0-9]+$/.test(id)) return toast.error('노트 주소나 ID를 넣어 주세요.')
  draft.value.guestbookNoteId = id
}

// --- custom domain ---
/** the app's own address, which the Worker fetches the app from */
const appAddress = domainSite()?.app ?? appUrl('/').replace(/\/$/, '')
const worker = computed(() => workerScript(site.value!.username, site.value!.host, appAddress))
const domainTyped = computed(() => normalizeDomain(draft.value.customDomain))
const onThisDomain = computed(() => !!domainSite() && site.value!.config.customDomain === location.hostname.toLowerCase())
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.info('복사했어요.')
  }
  catch {
    toast.error('복사하지 못했어요. 직접 선택해 주세요.')
  }
}

onBeforeRouteLeave(() => (dirty.value ? confirm('저장하지 않은 설정이 있어요. 나갈까요?') : true))
</script>

<template>
  <div v-if="!isOwner" class="mh-empty">
    이 홈페이지 주인으로 로그인해야 관리할 수 있어요.
  </div>
  <div v-else class="admin">
    <div class="mh-row">
      <h1 class="mh-page-title grow">Admin</h1>
      <button class="mh-btn primary" :disabled="saving || !dirty" @click="save">{{ saving ? '저장 중…' : dirty ? '저장' : '저장됨' }}</button>
    </div>

    <div class="mh-tabs">
      <button :class="{ on: tab === 'basic' }" @click="tab = 'basic'">기본</button>
      <button :class="{ on: tab === 'look' }" @click="tab = 'look'">꾸미기</button>
      <button :class="{ on: tab === 'menu' }" @click="tab = 'menu'">메뉴</button>
      <button :class="{ on: tab === 'banner' }" @click="tab = 'banner'">배너</button>
      <button :class="{ on: tab === 'guestbook' }" @click="tab = 'guestbook'">방명록·박수</button>
      <button :class="{ on: tab === 'domain' }" @click="tab = 'domain'">도메인</button>
    </div>

    <section v-show="tab === 'basic'" class="mh-box">
      <label class="mh-field"><span>사이트 이름</span><input v-model="draft.title" class="mh-input" maxlength="80"></label>
      <label class="mh-field"><span>부제</span><input v-model="draft.subtitle" class="mh-input" maxlength="200"></label>
      <label class="mh-field"><span>Since</span><input v-model="draft.since" class="mh-input" placeholder="2008.05.01" maxlength="40"></label>
      <label class="mh-field">
        <span>Top 화면 내용</span>
        <select v-model="draft.homePage" class="mh-select">
          <option value="">프로필 소개글</option>
          <option v-for="p in pages" :key="p.id" :value="p.name">페이지: {{ p.title }}</option>
        </select>
        <small>페이지 하나를 첫 화면 인사말로 쓸 수 있어요.</small>
      </label>
      <div class="mh-field">
        <span>고정 바 (메인 이미지 위)</span>
        <ol v-if="draft.pinBar.length" class="pinlist">
          <li v-for="(l, i) in draft.pinBar" :key="l.path" class="mh-row">
            <input v-model="l.label" class="mh-input lbl" maxlength="60" placeholder="이름 (비우면 페이지 제목)">
            <code class="pinpath">/{{ l.path }}</code>
            <span class="mh-spacer" />
            <button class="mh-btn small" :disabled="i === 0" @click="movePin(i, -1)">▲</button>
            <button class="mh-btn small" :disabled="i === draft.pinBar.length - 1" @click="movePin(i, 1)">▼</button>
            <button class="mh-btn small danger" @click="draft.pinBar.splice(i, 1)">×</button>
          </li>
        </ol>
        <form class="mh-row" @submit.prevent="addPin">
          <input v-model="pinUrl" class="mh-input grow" :placeholder="`https://${site!.host}/@${site!.username}/pages/…`">
          <button class="mh-btn" :disabled="draft.pinBar.length >= 8">추가</button>
        </form>
        <small>내 미스키 페이지 주소, 또는 이 홈페이지 안의 주소(페이지·갤러리·게시판 등)를 붙여 넣어요. 다른 사람이나 다른 사이트 주소는 넣을 수 없어요. 비워 두면 미스키 프로필에 고정한 페이지가 나와요.</small>
      </div>
      <label class="mh-field"><span>공지 (MFM)</span><textarea v-model="draft.notice" class="mh-textarea" maxlength="3000" /></label>
      <label class="mh-check"><input v-model="draft.showUpdates" type="checkbox"> Top에 업데이트 기록 보이기</label>
      <div class="mh-field counter">
        <span>방문자 카운터</span>
        <select v-model="draft.counter.mode" class="mh-select">
          <option value="off">안 달기</option>
          <option value="badge">배지형 (TOTAL, visitor-badge)</option>
          <option value="text">글자형 TODAY / TOTAL (Abacus, 가끔 응답이 없을 수 있어요)</option>
          <option value="image">다른 카운터 이미지 주소</option>
        </select>
        <input v-if="draft.counter.mode === 'image'" v-model.trim="draft.counter.imageUrl" class="mh-input" placeholder="https://… ({key}를 넣으면 이 사이트 키로 바뀌어요)">
        <small>별도 서버가 없어서 바깥 카운터 서비스를 써요. 켜면 방문자의 접속 정보(IP 등)가 그 서비스로 전송돼요. 같은 브라우저 세션에서는 한 번만 세요(글자형).</small>
      </div>
      <label class="mh-field"><span>Diary 해시태그</span><input v-model="draft.diaryTag" class="mh-input" placeholder="비우면 모든 노트 (예: 일기)"><small>이 태그가 붙은 노트만 Diary에 보여요.</small></label>
      <label class="mh-field"><span>푸터 (MFM)</span><textarea v-model="draft.footer" class="mh-textarea" maxlength="1000" placeholder="무단 전재 금지 / Don't repost" /></label>
      <fieldset class="enter">
        <legend><label class="mh-check"><input v-model="draft.enter.enabled" type="checkbox"> ENTER 페이지 쓰기</label></legend>
        <template v-if="draft.enter.enabled">
          <label class="mh-field"><span>버튼 글자</span><input v-model="draft.enter.text" class="mh-input" maxlength="40"></label>
          <label class="mh-field"><span>주의사항 (MFM)</span><textarea v-model="draft.enter.warning" class="mh-textarea" placeholder="이 사이트는 개인 2차 창작 사이트입니다. 원작자·관계자와 무관합니다." /></label>
        </template>
      </fieldset>
    </section>

    <section v-show="tab === 'look'" class="mh-box">
      <div class="mh-field">
        <span>스킨</span>
        <div class="skins">
          <label v-for="s in SKINS" :key="s.id" class="skin" :class="{ on: draft.skin === s.id }">
            <input v-model="draft.skin" type="radio" :value="s.id" hidden>
            <span class="sw" :class="`sw-${s.id}`" />
            <b>{{ s.label }}</b>
            <small>{{ s.desc }}</small>
          </label>
        </div>
      </div>
      <div class="mh-field">
        <span>화면 모드</span>
        <div class="fx-pick">
          <label v-for="m in COLOR_MODES" :key="m.id" class="mh-check">
            <input v-model="draft.colorMode" type="radio" :value="m.id"> {{ m.label }}
          </label>
        </div>
        <small>어느 스킨에서나 쓸 수 있어요. "방문자 기기 설정 따라가기"는 보는 사람의 기기가 다크 모드면 다크로 보여요.</small>
      </div>
      <div class="mh-field">
        <span>배경 효과</span>
        <div class="fx-pick">
          <label v-for="e in BG_EFFECTS" :key="e.id" class="mh-check" :title="e.desc">
            <input v-model="draft.bgEffect" type="radio" :value="e.id"> {{ e.label }}
          </label>
        </div>
        <small>어느 스킨에서나 쓸 수 있고, 강조색을 따라가요. 움직임 줄이기를 켠 방문자에게는 멈춘 채로 보여요.</small>
      </div>
      <div class="two">
        <label class="mh-field">
          <span>본문 글꼴</span>
          <select v-model="draft.bodyFont" class="mh-select">
            <option v-for="f in FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
        <label class="mh-field">
          <span>제목 글꼴</span>
          <select v-model="draft.titleFont" class="mh-select">
            <option v-for="f in FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
          </select>
        </label>
      </div>
      <p class="mh-muted font-note">부제·날짜 같은 작은 글씨는 부산단디손글씨로 나와요. 부산단디 서체 출처: 부산광역시. 프리텐다드·본명조는 고른 홈페이지에서만 불러와요.</p>
      <label class="mh-field"><span>강조색</span><span class="mh-row"><input v-model="draft.accent" type="color"> <code>{{ draft.accent }}</code></span></label>
      <AdminImageField v-model="draft.mainImage" label="메인 이미지" hint="Top 왼쪽 열, 공지 위에 들어가는 대표 그림이에요. 비우면 공지가 그 열을 다 써요." />
      <div v-if="draft.mainImage" class="mh-field">
        <span>메인 이미지 보여주기</span>
        <span class="mh-row">
          <label class="mh-check"><input v-model="draft.mainImageLayout" type="radio" value="center"> 자르지 않고 띄우기 (배경 없는 PNG 일러스트도 좋아요)</label>
          <label class="mh-check"><input v-model="draft.mainImageLayout" type="radio" value="side"> 카드로 꽉 채우기 (넘치는 부분은 잘려요)</label>
        </span>
      </div>
      <AdminImageField v-model="draft.background" label="배경 이미지" hint="화면 전체를 덮는 배경이에요. 글래스 테마에서 특히 잘 비쳐 보여요." />
      <label class="mh-field">
        <span>사용자 CSS</span>
        <textarea v-model="draft.customCss" class="mh-textarea code" spellcheck="false" placeholder=".mh-title { letter-spacing: 0.5em; }" />
        <small>사이트 안(.mh-site)에만 적용돼요. @import는 쓸 수 없어요. 클래스: .gh-dock .gh-board .gh-title .gh-logo .gh-clock .gh-latest .gh-notice .gh-profile .gh-banner .gh-visual .gh-window .gh-deco</small>
      </label>
    </section>

    <section v-show="tab === 'menu'" class="mh-box">
      <ol class="menu">
        <li v-for="(m, i) in draft.menu" :key="m.id">
          <div class="mh-row">
            <input v-model="m.label" class="mh-input lbl" maxlength="40">
            <span class="mh-muted type">{{ typeLabel(m.type) }}</span>
            <span class="mh-spacer" />
            <button class="mh-btn small" :disabled="i === 0" @click="moveMenu(i, -1)">▲</button>
            <button class="mh-btn small" :disabled="i === draft.menu.length - 1" @click="moveMenu(i, 1)">▼</button>
            <button class="mh-btn small danger" @click="draft.menu.splice(i, 1)">×</button>
          </div>
          <div v-if="m.type === 'clip'" class="mh-row sub">
            <select v-model="m.clipId" class="mh-select">
              <option v-for="c in clips" :key="c.id" :value="c.id">{{ c.name }}{{ c.isPublic ? '' : ' (비공개!)' }}</option>
            </select>
            <select v-model="m.view" class="mh-select">
              <option value="board">목록</option>
              <option value="scrap">스크랩북 (이미지 격자)</option>
            </select>
          </div>
          <div v-else-if="m.type === 'page'" class="mh-row sub">
            <select v-model="m.pageName" class="mh-select">
              <option v-for="p in pages" :key="p.id" :value="p.name">{{ p.title }}</option>
            </select>
          </div>
          <div v-else-if="m.type === 'link'" class="mh-row sub">
            <input v-model.trim="m.url" class="mh-input" placeholder="https://">
          </div>
        </li>
      </ol>
      <div class="mh-row add">
        <select v-model="newType" class="mh-select">
          <option v-for="t in MENU_TYPES" :key="t.type" :value="t.type">{{ t.label }} — {{ t.desc }}</option>
        </select>
        <button class="mh-btn" @click="addMenu">+ 메뉴 추가</button>
      </div>
      <p class="mh-muted">클립 메뉴는 공개 클립이어야 방문자에게 보여요.</p>
      <hr>
      <label class="mh-check"><input v-model="draft.hideNotesWhenLocked" type="checkbox"> 서버가 노트를 숨길 때 노트 메뉴 감추기</label>
      <p class="mh-muted">로그인하지 않은 방문자에게 서버가 노트를 보여주지 않으면(서버 설정), 그 방문자에게는 Diary·Guestbook·Scrap 메뉴와 고정 노트, 노트 리액션 박수를 감춰요. 로그인 없는 박수와 Q&A는 남아요. 주인과 그 서버 계정으로 로그인한 사람에게는 그대로 보여요.</p>
    </section>

    <section v-show="tab === 'banner'" class="mh-box">
      <AdminImageField v-model="draft.myBanner" label="내 배너" hint="보통 200×40. Top의 Banner 칸에서 방문자가 배너 주소와 링크를 복사해 갈 수 있어요." />
      <div class="mh-field">
        <span>친구 배너 ({{ draft.banners.length }}/60)</span>
        <ol class="banners">
          <li v-for="(b, i) in draft.banners" :key="b.id">
            <img v-if="b.image" class="bimg" :src="b.image" :alt="b.label">
            <div class="bfields">
              <AdminImageField v-model="b.image" label="배너 이미지" />
              <div class="mh-row">
                <input v-model.trim="b.url" class="mh-input grow" placeholder="https://친구 사이트 주소">
                <input v-model="b.label" class="mh-input lbl" placeholder="이름" maxlength="80">
              </div>
            </div>
            <div class="bops">
              <button class="mh-btn small" :disabled="i === 0" @click="moveBanner(i, -1)">▲</button>
              <button class="mh-btn small" :disabled="i === draft.banners.length - 1" @click="moveBanner(i, 1)">▼</button>
              <button class="mh-btn small danger" @click="draft.banners.splice(i, 1)">×</button>
            </div>
          </li>
        </ol>
        <p><button class="mh-btn" :disabled="draft.banners.length >= 60" @click="addBanner">+ 배너 추가</button></p>
        <small>이미지 주소가 https가 아니거나 비어 있는 배너는 저장할 때 빠져요.</small>
      </div>
    </section>

    <section v-show="tab === 'guestbook'" class="mh-box">
      <template v-if="draft.guestbookNoteId">
        <p>방명록 노트: <a :href="`https://${site!.host}/notes/${draft.guestbookNoteId}`" target="_blank" rel="noopener noreferrer">{{ draft.guestbookNoteId }} ↗</a></p>
        <p class="mh-muted">이 노트의 답글이 방명록, 👏 리액션이 Web Clap이 돼요. 방문자는 어느 서버 계정으로든 쓸 수 있고, 비밀글은 "지정 공개"로 주인에게만 보여요.</p>
        <div class="mh-row">
          <NuxtLink class="mh-btn" :to="path('guestbook')">방명록 보기</NuxtLink>
          <button class="mh-btn danger" @click="draft.guestbookNoteId = ''">연결 끊기</button>
        </div>
      </template>
      <template v-else>
        <label class="mh-field"><span>새 방명록 노트 만들기</span><textarea v-model="gbText" class="mh-textarea" /></label>
        <button class="mh-btn primary" @click="createGuestbook">노트 올리고 연결하기</button>
        <hr>
        <label class="mh-field"><span>이미 있는 노트 쓰기</span>
          <span class="mh-row"><input v-model="gbExisting" class="mh-input grow" :placeholder="`https://${site!.host}/notes/…`"><button class="mh-btn" @click="useExisting">연결</button></span>
        </label>
      </template>
      <hr>
      <h3>로그인 없는 박수 · Q&amp;A</h3>
      <label class="mh-check"><input v-model="draft.workerClap" type="checkbox"> 박수를 로그인 없이 받기</label>
      <p class="mh-muted">미스키 리액션 대신 이치고아메가 박수를 세요. 누구나 누를 수 있고, 같은 사람은 한 시간에 한 번만 세요.</p>
      <label class="mh-field"><span>네퀘돈 계정</span>
        <input v-model.trim="draft.quesdon" class="mh-input" :placeholder="`@${site!.username}@${site!.host}`" autocapitalize="off" spellcheck="false">
        <small v-if="draft.quesdon && !normalizeHandle(draft.quesdon)" class="warn">@아이디@서버 모양으로 넣어 주세요. 이대로 저장하면 비워져요.</small>
        <small v-else>
          <a :href="QUESDON_ORIGIN" target="_blank" rel="noopener noreferrer">네오-퀘스돈 ↗</a>에 가입한 계정이에요.
          넣으면 박수 옆 💌 한마디가 익명 질문으로 전해지고, 메뉴 → <b>Q&amp;A</b>를 추가하면 답한 질문이 올라와요.
          저장하고 몇 분 뒤부터 반영돼요.
        </small>
      </label>
    </section>

    <section v-show="tab === 'domain'" class="mh-box domain">
      <p>
        내 도메인(<code>home.example.com</code> 같은)으로 이 홈페이지를 열 수 있어요.
        주소창에는 <code>https://내도메인/gallery</code>처럼 내 도메인만 보여요.
        도메인이 <b>Cloudflare</b>에 연결되어 있어야 하고, 무료 요금제로 충분해요.
      </p>
      <p v-if="onThisDomain" class="mh-muted">✓ 지금 {{ site!.config.customDomain }}에서 보고 있어요. 연결이 끝났어요.</p>

      <h3>1. 도메인을 Cloudflare에 연결</h3>
      <p>
        <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare 대시보드 ↗</a>에서
        <b>도메인 추가</b>(Add a domain)로 도메인을 넣고, 도메인을 산 곳(가비아, 후이즈, Namecheap 등)에서
        네임서버를 Cloudflare가 알려 주는 두 개로 바꿔요. 반영까지 몇 분~하루쯤 걸려요.
        이미 Cloudflare에 있는 도메인이면 넘어가요.
      </p>

      <h3>2. Worker 만들기</h3>
      <ol>
        <li><b>Workers &amp; Pages</b> → <b>Create</b> → <b>Worker</b>에서 "Hello World"로 시작해요. 이름은 아무거나(예: <code>my-house</code>), <b>Deploy</b>.</li>
        <li><b>Edit code</b>를 누르고, 원래 있던 코드를 지운 뒤 아래 코드를 그대로 붙여 넣고 <b>Deploy</b>.</li>
      </ol>
      <div class="mh-field">
        <span class="mh-row">이 홈페이지용 Worker 코드 <span class="mh-spacer" /><button class="mh-btn small" @click="copyText(worker)">복사</button></span>
        <textarea class="mh-textarea code" readonly :value="worker" @focus="($event.target as HTMLTextAreaElement).select()" />
        <small>이 코드는 이치고아메({{ appAddress }})의 파일을 내 도메인으로 보여 주기만 해요. 아무 정보도 저장하지 않아요.</small>
      </div>

      <h3>3. Worker에 도메인 붙이기</h3>
      <p>
        만든 Worker의 <b>Settings</b> → <b>Domains &amp; Routes</b> → <b>Add</b> → <b>Custom domain</b>에
        쓰고 싶은 주소(예: <code>home.example.com</code> 또는 <code>example.com</code>)를 넣어요.
        DNS 레코드와 HTTPS 인증서는 Cloudflare가 알아서 만들어요. 같은 이름의 DNS 레코드가 이미 있으면 먼저 지워 주세요.
      </p>

      <h3>4. 여기에 도메인 등록</h3>
      <label class="mh-field">
        <span>커스텀 도메인</span>
        <input v-model.trim="draft.customDomain" class="mh-input" placeholder="home.example.com" autocapitalize="off" autocorrect="off" spellcheck="false">
        <small v-if="draft.customDomain && !domainTyped" class="warn">도메인 이름만 넣어 주세요 (예: home.example.com). 이대로 저장하면 비워져요.</small>
        <small v-else>위 3번에 넣은 주소와 똑같이 적고 <b>저장</b>해요. 등록한 도메인에서만 이 홈페이지가 열려요. 배너의 Link 주소도 이 도메인으로 바뀌어요.</small>
      </label>
      <p v-if="site!.config.customDomain">
        <a class="mh-btn" :href="`https://${site!.config.customDomain}/`" target="_blank" rel="noopener noreferrer">{{ site!.config.customDomain }} 열어 보기 ↗</a>
      </p>

      <hr>
      <h3>알아 두기</h3>
      <ul>
        <li>로그인은 주소마다 따로예요. 내 도메인에서 관리하려면 거기서 한 번 더 로그인해요. 방문자도 마찬가지예요.</li>
        <li>원래 주소(<code>{{ appAddress }}/@{{ site!.username }}@{{ site!.host }}</code>)도 계속 열려요.</li>
        <li>Cloudflare 무료 요금제의 Worker는 하루 10만 번까지 불려요. 개인 홈페이지에는 넉넉해요.</li>
        <li>
          주소창이 바뀌어도 괜찮다면 Worker 없이 <b>Rules → Redirect Rules</b>로 내 도메인을 원래 주소로 넘겨줄 수도 있어요.
          이때는 여기 등록하지 않아도 돼요.
          <details>
            <summary>넘겨주기 설정 방법</summary>
            <p>
              DNS에 내 도메인 A 레코드를 <code>192.0.2.1</code>, 프록시 켬(주황 구름)으로 만들고,
              Redirect Rule을 "Custom filter expression"으로 <code>(http.host eq "home.example.com")</code>,
              URL redirect는 <b>Dynamic</b> · 301로 아래처럼 넣어요.
            </p>
            <code class="expr">concat("{{ appAddress }}/@{{ site!.username }}@{{ site!.host }}", http.request.uri.path)</code>
          </details>
        </li>
      </ul>
    </section>

    <section class="mh-box">
      <h2 class="mh-box-title">콘텐츠</h2>
      <div class="mh-row">
        <NuxtLink class="mh-btn" :to="path('admin/page/new')">+ 새 글 (페이지)</NuxtLink>
        <NuxtLink class="mh-btn" :to="path('admin/gallery/new')">+ 갤러리 업로드</NuxtLink>
        <NuxtLink class="mh-btn" :to="path('clips')">게시판(클립) 관리</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grow {
  flex: 1;
  min-width: 0;
}
.admin .mh-box + .mh-box {
  margin-top: 14px;
}
.enter {
  margin: 12px 0 0;
  border: 1px dashed var(--border);
  padding: 8px 12px;
}
.fx-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.skins {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.skin {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 2px solid var(--border);
  cursor: pointer;
}
.skin.on {
  border-color: var(--accent);
}
.skin small {
  color: var(--fg-muted);
}
.sw {
  height: 48px;
  border: 1px solid var(--border);
}
.sw-glass { background: linear-gradient(#fff9 0 0) 10% 25% / 24% 55% no-repeat, linear-gradient(#fff9 0 0) 42% 25% / 24% 55% no-repeat, linear-gradient(#fff9 0 0) 74% 25% / 18% 55% no-repeat, linear-gradient(160deg, #e8eef8, #a9bcdc); }
.sw-paper { background: linear-gradient(#d9b89a 0 0) 30% 14% / 22% 12% no-repeat, linear-gradient(#fffdf8 0 0) 14% 25% / 32% 55% no-repeat, linear-gradient(#fffdf8 0 0) 56% 25% / 32% 55% no-repeat, #ece3d4; }
.sw-frame { background: linear-gradient(#e9edf3 0 0) 50% 50% / calc(100% - 12px) calc(100% - 12px) no-repeat, #24335a; }
.sw-retro { background: linear-gradient(#e0789a 0 0) 12% 20% / 40% 14% no-repeat, linear-gradient(#fff 0 0) 12% 34% / 40% 46% no-repeat, radial-gradient(circle, #e9a7bd 1px, transparent 1.5px) 0 0 / 8px 8px, #fbeff3; }
.code {
  font-family: var(--font-mono);
  min-height: 140px;
}
.menu {
  margin: 0 0 12px;
  padding-left: 1.4em;
}
.menu li {
  padding: 6px 0;
  border-bottom: 1px dotted var(--border);
}
.lbl {
  width: 140px;
}
.type {
  font-size: 0.9em;
}
.sub {
  margin-top: 4px;
}
.sub .mh-select,
.sub .mh-input {
  width: auto;
  flex: 1;
  min-width: 0;
}
.add .mh-select {
  width: auto;
  flex: 1;
  min-width: 0;
}
.domain h3 {
  margin: 18px 0 6px;
  font-size: 1em;
}
.domain p,
.domain ol,
.domain ul {
  margin: 0 0 8px;
  line-height: 1.7;
}
.domain ol,
.domain ul {
  padding-left: 1.4em;
}
.domain .code {
  min-height: 260px;
  font-size: 11px;
  white-space: pre;
}
.expr {
  display: block;
  overflow-wrap: anywhere;
}
.warn {
  color: #c33;
}
.pinlist {
  margin: 0 0 6px;
  padding-left: 1.4em;
}
.pinlist li {
  padding: 4px 0;
  border-bottom: 1px dotted var(--border);
}
.pinpath {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 40%;
  color: var(--fg-muted);
}
.counter {
  margin-top: 12px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.font-note {
  margin: -4px 0 12px;
  font-size: 0.92em;
}
.banners {
  margin: 0;
  padding-left: 1.4em;
}
.banners li {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px dotted var(--border);
}
.bimg {
  width: 120px;
  height: auto;
}
.bfields .mh-field {
  margin-bottom: 6px;
}
.bops {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
hr {
  margin: 16px 0;
  border: 0;
  border-top: 1px dashed var(--border);
}
</style>
