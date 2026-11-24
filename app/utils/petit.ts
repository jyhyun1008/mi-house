/*
 * api.chigoa.me — the shared Worker (worker/ in this repo): web clap count, anonymous
 * neo-quesdon questions and answers, for any homepage whose owner switched them on.
 */

export const PETIT_API = 'https://api.chigoa.me'
/** neo-quesdon, where Q&A answers come from and clap messages go */
export const QUESDON_ORIGIN = 'https://neo-quesdon.serafuku.moe'

export interface QnaAnswer {
  id: string
  question: string
  answer: string
  answeredAt: string
  nsfwedAnswer: boolean
}

export class PetitError extends Error {
  constructor(public code: string, public status: number) {
    super(PETIT_MESSAGES[code] ?? (status === 429 ? '잠시 후에 다시 보내 주세요.' : `보내지 못했어요 (${code})`))
  }
}

const PETIT_MESSAGES: Record<string, string> = {
  CLAP_OFF: '박수가 꺼져 있어요. (설정을 바꿨다면 1분쯤 뒤에 반영돼요)',
  NO_QUESDON: '네퀘돈 계정이 설정되어 있지 않아요. (설정을 바꿨다면 1분쯤 뒤에 반영돼요)',
  SITE_UNREACHABLE: '홈페이지 서버에 닿지 못했어요. 잠시 후에 다시 해 주세요.',
  EMPTY: '내용을 적어 주세요.',
  USER_NOT_ACCEPT_ANONYMOUS_QUESTION: '지금은 익명 질문을 받지 않아요.',
  USER_NOT_ACCEPT_NEW_QUESTION: '지금은 질문을 받지 않아요.',
  YOU_MUST_LOGIN_TO_MUTUAL_ONLY_QUESTION: '맞팔로우한 사람만 질문할 수 있게 되어 있어요.',
  QUESTION_BLOCKED: '질문을 보낼 수 없어요.',
}

/** Call the shared Worker for one homepage (`site` = `@user@host`). */
export async function petit<T>(site: string, route: 'clap' | 'ask' | 'qna', init: { method?: 'GET' | 'POST', body?: Record<string, unknown>, query?: Record<string, string> } = {}): Promise<T> {
  const post = init.method === 'POST'
  const qs = post ? '' : `?${new URLSearchParams({ site, ...init.query })}`
  const res = await fetch(`${PETIT_API}/${route}${qs}`, {
    method: post ? 'POST' : 'GET',
    headers: post ? { 'content-type': 'application/json' } : undefined,
    body: post ? JSON.stringify({ ...init.body, site }) : undefined,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(20_000),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new PetitError(body?.error ?? `HTTP_${res.status}`, res.status)
  return body as T
}

/** the owner's neo-quesdon page */
export const quesdonPage = (handle: string) => `${QUESDON_ORIGIN}/main/user/${handle}`
