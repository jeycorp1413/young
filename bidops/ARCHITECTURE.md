# 나라장터 추적 보드 — 사업기획팀 제안 파이프라인 (내부 코드명 bidops)

## 1. 왜 만드나 (목적 → 요구사항)

| 팀의 현실 | 요구사항 | 앱에서의 답 |
|---|---|---|
| 제안서 마감일이 곧 생명 | 모든 사업은 날짜가 붙은 이정표(의견마감→자격등록→협정서→제안서→발표→개찰→낙찰)를 가진다 | `dates` 객체 + D-day 파생, 「오늘」 화면이 첫 화면 |
| 그때그때 RFP 분석 | 60점 판정(탈락요건 6 + 매력도 12×5)과 근거·리스크·액션이 사업에 붙어야 한다 | `analyses/{사업}/{일자}` 버전 이력, 최신본 요약을 사업 카드에 표시 |
| 분석한 것은 끝까지 추적 | 재공고·취소·개찰·참가업체·낙찰을 사업 단위로 이어 본다 | 추적기(08:40) 결과를 `track`으로 합치고, 상태 변화는 `log`에 append |
| 사업 축에 맞춘 제안 | 승산 축(농업AI·국방AI·AI Agent·LLM·피지컬AI·데이터·AI구축) 기준으로 기회·경쟁사·자산을 본다 | `axis`가 1급 차원, 「축」 화면에서 파이프라인·경쟁사·보유 자산을 함께 표시 |

설계 원칙: **엔티티 하나(Opportunity), 진실의 원천 하나(`/bidops`), 새 서버 없음.**
이미 돌아가는 PC 수집기(추적기·대시보드 피드)와 판정 데이터를 버리지 않고 동기화 스크립트 하나로 합친다.

## 2. 시스템 아키텍처

```
[나라장터 OpenAPI]
   │ 08:40  나라장터_추적.py check   → Firebase /nara_tracking (추적·경쟁사 원장)
   │ 11:00  나라장터_대시보드_갱신.py → Firebase /nara          (후보 피드, 3일 창)
   │ 수시   나라장터_데이터_YYMMDD.py (사람이 쓰는 60점 판정)
   ▼
bidops_sync.py  (11:10 예약작업 권장 · 멱등)          ┌───────────────┐
   ① 판정 파일 → analyses + opps 생성/갱신             │ Firebase RTDB │
   ② 추적기 결과 → opps.track / dates / stage(auto)  →│  /bidops       │◄── 브라우저 (읽기+쓰기)
   ③ 사람이 정한 stage·owner·note 는 절대 덮지 않음   │  /nara (읽기)  │
                                                      └───────────────┘
                                                              ▲
                                     Netlify 정적 호스팅  young/bidops/  (ES 모듈, 빌드 없음)
```

- **읽기 3회로 부트**: `/bidops`(사업·판정·로그) · `/nara`(신규 공고 = 아직 검토 등록 안 한 후보) · `/nara_tracking`(추적 현황·경쟁사 원장, 읽기 전용). 옛 `nara-tracking.html`은 `bidops/#/tracking`으로 리다이렉트.
- **쓰기는 액션을 통해서만**: `store.actions.*` → `ref.update()` + `updatedAt/by`. 화면은 상태를 직접 만지지 않는다.
- **자동 vs 사람 구분**: `stageBy:'auto'|'user'`. 동기화는 `auto`인 것만 재계산한다.

## 3. 데이터 모델 (`/bidops`)

```
opps/{id}                 id = 공고번호(R26BK…)·사전규격번호(R26BD…)·발주계획(R26DD…)·D2B번호·slug
  name, org, dem, kind(본공고|사전규격|발주계획|D2B|키워드), axis, axisType, budget(원), url
  stage: inbox|review|go|submitted|result|watch|hold|drop      stageBy: auto|user
  outcome: null|won|lost|cancelled     ours: bool   owner: '신지영'
  dates: {opinion, reg, agree, submit, present, open, award}   (ISO 'YYYY-MM-DD' 또는 'YYYY-MM-DD HH:MM')
  latest: {ymd, score, verdict}        ← analyses 최신본 요약
  track: {status, n_part, winner, signals[], changes[], checked, participants[≤10]}   ← 추적기 스냅샷
  incumbent: {level(low|mid|high|''), memo, by, at}   ← 내정 가늠 팀 판단 (사람 입력, 동기화가 보존)
  docmeta: [{file, author, saved_by, company, created, modified, flag, weak, traces[]}]   ← RFP_*/{번호}_* 첨부 문서 속성 (rfp_meta.py, 동기화가 매일 갱신)
  docs: [파일명…]   alias: 원공고번호   createdAt, updatedAt, by, src[]
analyses/{id}/{ymd}
  inc_signals: [{w:'+3'|'·', t, ev[]}]   ← 일일 판정 파일 incumbent_signals (담당이 확인한 내정·경쟁 신호)
  score, verdict(적극참여|검토|비추천), scores[12], gates[6], oneline, pros[], risks[], actions[], edge, rfp, docs[]
log/{id}/{pushId}          {t, type(auto|note|stage|decision), text, by}
meta                       {updatedAt, counts, sources}
```

## 4. UI 아키텍처

```
index.html  셸: 상단바(브랜드·뷰 탭·담당자·동기화 시각) + <main> + 드로어 + 토스트
js/app.js   해시 라우터  #/today #/pipeline #/calendar #/axis #/opp/{id}(드로어)
js/store.js 상태 {opps, analyses, log, nara, meta, user} · Firebase 구독 · actions
js/derive.js 순수 함수: dday · nextMilestone · urgency · sort · group · axisStats · inbox diff · competitorProfile(경쟁 구도·내정 가늠: 원장 같은 발주처 이력 + 추적기 신호 + 판정문 현행사 언급을 규칙 합산, 근거마다 ev 첨부)
js/ui/components.js  esc · chip · ddayBadge · scoreBars · drawer · toast · empty
js/ui/today.js       KPI 4 · 이번 주 마감 · 다가오는 마감 · 변경 알림 · 신규 공고
js/ui/pipeline.js    칸반(후보→검토→참여·작성→제출→결과, 관찰/보류/불참은 토글)
js/ui/calendar.js    월간 이정표 캘린더
js/ui/axis.js        축별 파이프라인·평균 판정·경쟁사·보유 자산
js/ui/tracking.js    추적: 등록 건의 상태(공고 중·개찰·낙찰·계약)·달라진 것·눈여겨볼 점  ← /nara_tracking.rows
js/ui/competitors.js 경쟁사: 분야별 자주 만나는 업체·업체별 표·개찰 결과            ← /nara_tracking.ledger
js/ui/detail.js      드로어: 기본정보·결정(단계/결과/담당/축)·일정 편집·경쟁 구도·내정 가늠(자동 가늠 + 근거 펼침 + 팀 판단 저장)·판정(문장 단위 줄바꿈)·추적(추적기 원본: 참가업체·규격의견·낙찰·계약·원공고)·로그
css/tokens.css       색·타이포·간격·라운드·그림자·다크모드 토큰
css/app.css          레이아웃·컴포넌트 (모바일 퍼스트, 768/1080 브레이크포인트)
```

렌더 모델: 데이터가 바뀌면 현재 뷰 하나를 통째로 다시 그린다(데이터가 수백 건 규모라 diff 렌더러가 필요 없다).
드로어는 뷰와 독립이라 어느 화면에서든 `#/opp/{id}`로 열린다.

## 5. 확장 지점 (지금은 비워 둔 곳)

- **파일 첨부**: `docs`는 파일명만. 필요해지면 제조AI 대시보드와 같은 RTDB base64(≤5MB) 방식으로 `fileblobs/{id}` 추가.
- **알림**: `derive.dueSoon()`이 이미 D-day 목록을 만들므로, 예약작업에서 같은 함수를 돌려 카카오/메일로 쏘면 된다.
- **경쟁사 지도**: `track.participants`를 축별로 합산하는 `axisStats()`가 있다. 원장(`/nara_tracking.ledger`)을 읽는 뷰를 붙이면 확장.
- **권한**: RTDB 규칙은 팀 공개. 잠글 때는 Firebase Auth 익명 로그인 + 규칙만 바꾸면 되고 코드는 `store.js` 한 곳만 수정.
- **뷰 추가**: `js/ui/*.js`에 `render(state)`를 내보내고 `app.js` ROUTES에 한 줄 등록.

## 6. 운영

- 배포: `young/bidops/` 를 GitHub `jeycorp1413/young`에 push → Netlify 자동 배포 → `https://ai-planning-team.netlify.app/bidops/`
- 동기화: `python 프로젝트1\bidops_sync.py` (예약작업 `BidOps_Sync` 11:10 권장, 추적기·피드 이후)
- 로컬 확인: `python -m http.server 8765` (young 폴더) → `http://localhost:8765/bidops/`
