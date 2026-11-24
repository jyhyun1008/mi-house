# api.chigoa.me

이치고아메 홈페이지 전체가 같이 쓰는 Cloudflare Worker 하나예요.
정적 사이트 혼자서는 못 하는 일을 맡고, 방문자는 로그인하지 않아도 돼요.

| 경로 | 하는 일 |
| --- | --- |
| `GET /clap?site=@user@host` | 박수 수 |
| `POST /clap` `{ site }` | 박수 +1 (같은 사람은 한 시간에 한 번) |
| `POST /ask` `{ site, question }` | 주인에게 네퀘돈 익명 질문 보내기 |
| `GET /qna?site=@user@host&untilId=` | 주인이 네퀘돈에서 답한 질문 (5분 캐시) |

각 홈페이지의 설정은 그 홈페이지의 공개 `mi-house` 페이지에서 읽어요. 읽은 설정은 1분 동안 캐시하고,
주인이 켜 둔 기능(`workerClap`, `quesdon`)만 해요.

## 올리기 (한 번만)

```sh
cd worker
npx wrangler login
npx wrangler d1 create chigoa-api          # 나오는 database_id를 wrangler.toml에 넣기
npx wrangler d1 execute chigoa-api --remote --file=schema.sql
npx wrangler deploy                        # api.chigoa.me 커스텀 도메인도 같이 붙어요
```

`chigoa.me`가 같은 Cloudflare 계정에 연결되어 있어야 해요. DNS에 `api` 레코드가 이미 있으면 먼저 지워 주세요.

## 무료 요금제 한도

- Workers: 하루 10만 번 요청
- D1: 하루 10만 행 쓰기 (박수 한 번에 약 3행)

## 개인정보

- **박수 기록:** 접속 주소는 그대로 저장하지 않아요. 홈페이지마다 다르게 섞은 SHA-256 해시로만 저장해서,
  같은 사람인지 홈페이지끼리 맞춰 볼 수 없어요. 한 시간 뒤 지워요.
- **네퀘돈 질문:** 질문을 보낼 때는 방문자 주소를 `X-Forwarded-For`로 네퀘돈에 넘겨요.
  네퀘돈의 사람별 질문 제한과 차단이 방문자 한 명 한 명에게 그대로 걸리게 하려는 거예요.
