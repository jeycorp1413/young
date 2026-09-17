// 단일 출처 설정 — 축·단계·이정표·평가기준을 여기서만 정의한다.
export const FIREBASE = {
  apiKey: "AIzaSyDerROVp0gBbuClRdhNAn42uv1FjnoaOKQ",
  databaseURL: "https://young-94e97-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "young-94e97",
};
export const NODE = "bidops";            // 이 앱의 진실의 원천
export const FEED_NODE = "nara";         // 신규 공고 피드(대시보드 갱신기, 11:00) — 읽기 전용
export const TRACK_NODE = "nara_tracking"; // 추적기(나라장터_추적.py check, 08:40) 결과 + 경쟁사 원장 — 읽기 전용
export const LINKS = { board: "../index.html", competitors: "#/competitors", tracking: "#/tracking" };

// 추적기 등록 구분 → 팀원 용어
export const TRACK_KIND = { bid: "본공고", spec: "사전규격", kw: "이름 감시", manual: "국방 D2B" };
// 경쟁사 원장의 분야 태그(경쟁사_원장.py domain_tags) — 표시 순서
export const LEDGER_TAGS = ["LLM·RAG", "AI데이터", "국방", "농업·식품", "피지컬AI", "데이터플랫폼", "AI일반", "운영·유지", "감리"];
// 사업 축 → 원장 분야 태그. 드로어 「경쟁 구도」가 같은 분야에서 자주 만나는 업체를 고를 때 쓴다
export const AXIS_TAGS = { "농업AI": ["농업·식품", "AI일반"], "국방AI": ["국방", "AI데이터"], "AI Agent·LLM": ["LLM·RAG", "AI일반"], "피지컬AI": ["피지컬AI", "AI일반"], "데이터·AI구축": ["AI데이터", "데이터플랫폼"], "모빌리티": ["데이터플랫폼"], "기타": [] };
// 내정 가늠 수준 — 자동 규칙과 팀 판단이 같은 척도를 쓴다
export const INCUMBENT_LEVELS = [["none", "자료 부족 · 판단 보류"], ["low", "내정 가능성 낮음"], ["mid", "내정 의심 신호 있음"], ["high", "내정 가능성 높음"]];
export const INCUMBENT_BY = Object.fromEntries(INCUMBENT_LEVELS);

// 승산 축 (2026-09-08 확정) — 순서가 표시 순서
export const AXES = [
  { id: "농업AI",       type: "growth", color: "#1F9D5B", assets: ["팜스톰(복합환경제어)", "괴산 노지 스마트농업 ISP 참여"] },
  { id: "국방AI",       type: "growth", color: "#334155", assets: ["軍 인사 RAG Agent 제안(만사시스템)", "해군 함정 원천데이터(플렛디스 컨소)"] },
  { id: "AI Agent·LLM", type: "growth", color: "#007AFF", assets: ["AITOM(KLID·전남TP 납품)", "HWPX 문서 생성·편집 에이전트", "JDC sLLM 제안"] },
  { id: "피지컬AI",     type: "growth", color: "#EA7B1C", assets: ["DIP 소리·진동 불량판별(TTA 검증)", "경남TP Edge-AI TTM", "양팔로봇 VLM 비전"] },
  { id: "데이터·AI구축", type: "data",   color: "#0F8B8D", assets: ["텍스톰 데이터 구축", "공공데이터 실적", "ABB 원스톱 건강관리 537명 실증"] },
  { id: "모빌리티",     type: "cash",   color: "#6B7280", assets: ["광주 시내버스 모니터링"] },
  { id: "기타",         type: "other",  color: "#9CA3AF", assets: [] },
];
export const AXIS_BY_ID = Object.fromEntries(AXES.map(a => [a.id, a]));

// 단계 — flow:true 인 것이 칸반 기본 열, 나머지는 토글
export const STAGES = [
  { id: "inbox",     label: "후보",     flow: true,  color: "slate" },
  { id: "review",    label: "검토",     flow: true,  color: "amber" },
  { id: "go",        label: "참여·작성", flow: true,  color: "blue" },
  { id: "submitted", label: "제출",     flow: true,  color: "violet" },
  { id: "result",    label: "결과",     flow: true,  color: "green" },
  { id: "watch",     label: "관찰",     flow: false, color: "slate" },
  { id: "hold",      label: "보류",     flow: false, color: "slate" },
  { id: "drop",      label: "불참",     flow: false, color: "slate" },
];
export const STAGE_BY = Object.fromEntries(STAGES.map(s => [s.id, s]));
export const OUTCOMES = [["", "-"], ["won", "낙찰"], ["lost", "탈락"], ["cancelled", "취소·유찰"]];

// 이정표 — 날짜 키와 라벨. 순서 = 사업 진행 순서
export const MILESTONES = [
  { k: "opinion", label: "의견마감",  cls: "opinion" },
  { k: "reg",     label: "자격등록",  cls: "reg" },
  { k: "agree",   label: "협정서",    cls: "reg" },
  { k: "submit",  label: "제안서 마감", cls: "submit" },
  { k: "present", label: "발표평가",  cls: "present" },
  { k: "open",    label: "개찰",      cls: "open" },
  { k: "award",   label: "낙찰",      cls: "open" },
];
export const MILESTONE_BY = Object.fromEntries(MILESTONES.map(m => [m.k, m]));

export const MEMBERS = ["신지영", "하이슬", "정서연", "김대원"];

// 참여판정 체크리스트 — 매력도 12항목(6영역×2) × 5점 = 60
export const CRITERIA = [
  ["사업 매력도", "핵심 분야 부합도"], ["사업 매력도", "수행 환경 부담 낮음"],
  ["회사 역량", "기술·솔루션 재사용"], ["회사 역량", "레퍼런스·유사 실적"],
  ["수익성", "인건비·마진 확보"], ["수익성", "유지관리 포함 수익성"],
  ["전략 가치", "고객 확장·레퍼런스"], ["전략 가치", "핵심 사업 확대 부합"],
  ["제안 경쟁력", "차별화·경쟁 우위"], ["제안 경쟁력", "컨소·일정 대응력"],
  ["리스크", "법적·계약 리스크 낮음"], ["리스크", "보안·데이터 리스크 낮음"],
];
export const AREAS = [...new Set(CRITERIA.map(c => c[0]))];
export const GATES = [
  "사업비가 최소 인건비 미달", "장거리 상주 필수", "요구 인증·자격 원천 불충족",
  "지식재산권 전부 귀속·재사용 금지", "손해배상 상한 없음", "기술적 수행 불가",
];
export const verdictOf = s => (s == null ? "" : s >= 48 ? "적극참여" : s >= 30 ? "검토" : "비추천");
