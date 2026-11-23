import type { MetaLite, UserDetailed } from '~/types/misskey'

export interface Account {
  /** `username@host` */
  key: string
  host: string
  token: string
  user: UserDetailed
  meta: MetaLite
}

const STORAGE_KEY = 'mihouse:accounts'
const LAST_KEY = 'mihouse:last-account'
const PENDING_KEY = 'mihouse:miauth'

export const MIAUTH_PERMISSIONS = [
  'read:account',
  'write:account',
  'write:notes',
  'read:reactions',
  'write:reactions',
  'read:drive',
  'write:drive',
  'read:pages',
  'write:pages',
  'read:page-likes',
  'write:page-likes',
  'read:gallery',
  'write:gallery',
  'read:gallery-likes',
  'write:gallery-likes',
  'read:clip-favorite',
  'write:clip-favorite',
]

export function useAccounts() {
  const accounts = useState<Account[]>('accounts', () => loadJson<Account[]>(STORAGE_KEY, []))
  const currentKey = useState<string | null>('current-account', () => loadJson<string | null>(LAST_KEY, null))

  const current = computed(() => accounts.value.find(a => a.key === currentKey.value) ?? accounts.value[0] ?? null)

  function persist() {
    saveJson(STORAGE_KEY, accounts.value)
  }

  function upsert(account: Account) {
    const i = accounts.value.findIndex(a => a.key === account.key)
    if (i >= 0) accounts.value.splice(i, 1, account)
    else accounts.value.push(account)
    persist()
  }

  function remove(key: string) {
    accounts.value = accounts.value.filter(a => a.key !== key)
    persist()
    if (currentKey.value === key) use(accounts.value[0]?.key ?? null)
  }

  function use(key: string | null) {
    currentKey.value = key
    saveJson(LAST_KEY, key)
  }

  return { accounts, current, upsert, remove, use }
}

/** Kick off MiAuth; `returnTo` is where the callback sends the browser afterwards. */
export function startMiAuth(rawHost: string, returnTo = '/') {
  const host = normalizeHost(rawHost)
  const session = crypto.randomUUID()
  saveJson(PENDING_KEY, { host, session, returnTo: returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/' })
  const q = new URLSearchParams({
    name: '이치고아메',
    callback: appUrl('/callback'),
    permission: MIAUTH_PERMISSIONS.join(','),
  })
  location.href = `https://${host}/miauth/${session}?${q}`
}

export async function finishMiAuth(session: string): Promise<{ account: Account, returnTo: string }> {
  const pending = loadJson<{ host: string, session: string, returnTo?: string } | null>(PENDING_KEY, null)
  if (!pending || pending.session !== session) throw new Error('로그인 세션을 찾을 수 없습니다. 다시 시도해 주세요.')
  const { host } = pending

  const res = await apiCall<{ ok: boolean, token?: string }>(host, `miauth/${session}/check`)
  if (!res.ok || !res.token) throw new Error('인증이 거부되었거나 만료되었습니다.')

  const [user, meta] = await Promise.all([
    apiCall<UserDetailed>(host, 'i', {}, res.token),
    apiCall<MetaLite>(host, 'meta', { detail: false }).catch(() => ({ name: host, iconUrl: null })),
  ])
  removeKey(PENDING_KEY)

  const account: Account = {
    key: `${user.username}@${host}`,
    host,
    token: res.token,
    user,
    meta: { name: meta.name, iconUrl: meta.iconUrl },
  }
  const accs = useAccounts()
  accs.upsert(account)
  accs.use(account.key)
  return { account, returnTo: pending.returnTo ?? '/' }
}
