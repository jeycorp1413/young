// AITOM 트래킹 자동 수집 — GitHub 릴리스 · arXiv · 나라장터(조달청)
// GitHub Actions(cron)에서 실행 → Firebase RTDB(aitom-track/*)에 최신값 기록
// 대시보드는 이 값을 자동으로 표시함.

const DB = "https://young-94e97-default-rtdb.asia-southeast1.firebasedatabase.app";
const GH_TOKEN = process.env.GH_TOKEN || "";
const G2B_KEY  = process.env.G2B_SERVICE_KEY || "";

const ghHeaders = { "User-Agent": "aitom-tracker",
  ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {}) };

const now = new Date().toISOString().slice(0, 16).replace("T", " ");

async function getItems() {
  const r = await fetch(`${DB}/aitom-track/items.json`);
  return (await r.json()) || {};
}
async function patchItem(id, data) {
  const r = await fetch(`${DB}/aitom-track/items/${id}.json`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  if (!r.ok) console.log("write fail", id, r.status, await r.text());
  return r.ok;
}
async function setMeta(obj) {
  await fetch(`${DB}/aitom-track/auto/meta.json`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj),
  });
}

function parseRepo(url) {
  const m = (url || "").match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/);
  return m ? { owner: m[1], repo: m[2].replace(/\.git$/, "") } : null;
}

async function ghLatest(owner, repo) {
  let r = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers: ghHeaders });
  if (r.ok) { const j = await r.json(); return { ver: j.tag_name || j.name, date: (j.published_at || "").slice(0, 10), url: j.html_url }; }
  r = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`, { headers: ghHeaders });
  if (r.ok) { const a = await r.json(); if (a[0]) return { ver: a[0].name, date: "", url: `https://github.com/${owner}/${repo}/releases` }; }
  return null;
}

async function arxivLatest(keyword) {
  const q = encodeURIComponent(`"${keyword}"`);
  const url = `https://export.arxiv.org/api/query?search_query=all:${q}&sortBy=submittedDate&sortOrder=descending&max_results=1`;
  const r = await fetch(url); if (!r.ok) return null;
  const t = await r.text();
  const e = t.split("<entry>")[1]; if (!e) return null;
  const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim().replace(/\s+/g, " ");
  const date  = (e.match(/<published>(.*?)<\/published>/) || [])[1]?.slice(0, 10);
  const link  = (e.match(/<id>(.*?)<\/id>/) || [])[1];
  if (!title) return null;
  return { ver: title.length > 70 ? title.slice(0, 70) + "…" : title, date, url: link };
}

// 조달청 나라장터 입찰공고 — 용역조회(getBidPblancListInfoServc). 최근 30일 용역공고를 받아 키워드로 로컬 필터.
const G2B_BASE = process.env.G2B_ENDPOINT ||
  "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc";

async function g2bRecentServc() {
  if (!G2B_KEY) return [];
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, "") + "0000";
  const bgn = fmt(new Date(Date.now() - 30 * 864e5));
  const end = fmt(new Date());
  const url = `${G2B_BASE}?serviceKey=${encodeURIComponent(G2B_KEY)}&pageNo=1&numOfRows=100&inqryDiv=1&type=json&inqryBgnDt=${bgn}&inqryEndDt=${end}`;
  try {
    const r = await fetch(url); if (!r.ok) { console.log("g2b http", r.status); return []; }
    const j = await r.json();
    let it = j?.response?.body?.items;
    if (it?.item) it = it.item;
    return Array.isArray(it) ? it : (it ? [it] : []);
  } catch (e) { console.log("g2b error", e.message); return []; }
}

const items = await getItems();
let gh = 0, ax = 0, g2 = 0;

for (const [id, it] of Object.entries(items)) {
  try {
    if (it.cat === "github") {
      const rp = parseRepo(it.url); if (!rp) continue;
      const l = await ghLatest(rp.owner, rp.repo); if (!l) continue;
      if (await patchItem(id, { autoLatest: l.ver, autoDate: l.date, autoUrl: l.url, autoAt: now })) gh++;
    } else if (it.cat === "arxiv") {
      const kw = (it.name || "").replace(/["']/g, "").split("/")[0].trim();
      const l = await arxivLatest(kw); if (!l) continue;
      if (await patchItem(id, { autoLatest: l.ver, autoDate: l.date, autoUrl: l.url, autoAt: now })) ax++;
    }
  } catch (e) { console.log("item error", id, e.message); }
}

// 조달청: 최근 용역공고 중 AI 키워드 매칭 최신 1건 → g2b-keyword 항목에 표기
if (G2B_KEY && items["g2b-keyword"]) {
  const KW = ["생성형AI", "생성형 AI", "AI에이전트", "AI 에이전트", "LLM", "sLLM", "지능형민원", "내부지식", "챗봇", "인공지능"];
  const norm = s => (s || "").replace(/\s/g, "");
  const list = await g2bRecentServc();
  const hit = list.find(it => KW.some(k => norm(it.bidNtceNm).includes(norm(k))));
  if (hit) {
    await patchItem("g2b-keyword", {
      autoLatest: `${(hit.ntceInsttNm || "").slice(0, 12)} · ${(hit.bidNtceNm || "").slice(0, 45)}`,
      autoDate: (hit.bidNtceDt || "").slice(0, 10),
      autoUrl: hit.bidNtceDtlUrl || hit.bidNtceUrl || "",
      autoAt: now,
    });
    g2 = 1;
  } else {
    console.log(`g2b: 최근 용역공고 ${list.length}건 중 키워드 매칭 없음`);
  }
}

// ===== 나라장터 일일 스크리너 (성장축 자동 분류·점수화) =====
let naraCount = 0;
if (G2B_KEY) {
  // 우리 4축 + 실적 도메인 키워드 (모빌리티=현금·성장축 아님)
  const AX = [
    { t: "스마트팜",  type: "growth", kw: ["스마트팜","스마트농업","노지","생육","병해충","농업기상","조기경보","밭작물","축산","시설원예","농산물","스마트농","정밀농업"] },
    { t: "AI Agent",  type: "growth", kw: ["생성형","생성 AI","sLLM","LLM","RAG","에이전트","agent","챗봇","언어모델","초거대","지능형 민원","내부지식","지식검색","업무지원 AI","MCP","생성AI"] },
    { t: "피지컬AI",  type: "growth", kw: ["제조 AI","AI융합","스마트공장","스마트팩토리","불량","예지보전","이상탐지","머신비전","비전 검사","설비 진단","작업장 안전","안전관제","예측정비"] },
    { t: "모빌리티",  type: "cash",   kw: ["모빌리티","시내버스","노선버스","교통안전","교통 데이터","ITS","C-ITS","교통관제","자율주행","탄소저감","교통정보","교통약자"] },
  ];
  // 우리 사업과 무관한 공고 제외 (임차·렌탈·보험·청소·건설 등)
  const EXCLUDE = ["임차","렌탈","리스","보험","공제","청소","급식","경비용역","시설관리","조경","방역","인쇄","행사","홍보물","물품구매","유류","승강기","냉난방","건설","감리","전기공사","통신공사","제초","소독","경관","도색","보수공사","측량","지하시설물"];
  // 미보유 면허를 요구하는 공고 제외 — 참가자격 면허제한에 아래 키워드가 있으면 입찰 불가로 판단
  // (더아이엠씨 보유 업종: 소프트웨어·정보처리·데이터 계열. 측량업 등은 미등록)
  const LICENSE_EXCLUDE = ["측량","건설업","전기공사업","정보통신공사업","소방시설","엔지니어링사업자(건설","문화재수리"];
  const G2B_LIC = G2B_BASE.replace("getBidPblancListInfoServc", "getBidPblancListInfoLicenseLimit");
  async function requiresExcludedLicense(bidNo) {
    if (!bidNo) return false;
    try {
      const u = `${G2B_LIC}?serviceKey=${encodeURIComponent(G2B_KEY)}&pageNo=1&numOfRows=50&inqryDiv=2&type=json&bidNtceNo=${encodeURIComponent(bidNo)}`;
      const r = await fetch(u); if (!r.ok) { console.log("lic http", r.status, bidNo); return false; }
      const j = await r.json();
      let it = j?.response?.body?.items; if (it?.item) it = it.item;
      it = Array.isArray(it) ? it : (it ? [it] : []);
      const names = it.map(x => x.lcnsLmtNm || x.permsnIndstrytyNm || "").filter(Boolean);
      return names.some(n => LICENSE_EXCLUDE.some(k => norm(n).includes(norm(k))));
    } catch (e) { console.log("lic error", bidNo, e.message); return false; } // 조회 실패 시 유지(fail-open)
  }
  const norm = s => (s || "").replace(/\s/g, "");
  const won = n => { n = Number(n) || 0; if (n >= 1e8) return (n/1e8).toFixed(1).replace(/\.0$/,"")+"억"; if (n >= 1e4) return Math.round(n/1e4)+"만"; return n ? String(n) : ""; };
  const fmt = d => d.toISOString().slice(0,10).replace(/-/g,"")+"0000";
  const bgn = fmt(new Date(Date.now() - 7*864e5)), end = fmt(new Date());
  const todayISO = new Date().toISOString().slice(0,10);
  try {
    // 페이지네이션으로 최근 7일 용역공고 전체 수집 (999건 제한 우회 → 최근 공고 누락 방지)
    let list = [], page = 1, total = Infinity;
    while (list.length < total && page <= 6) {
      const u = `${G2B_BASE}?serviceKey=${encodeURIComponent(G2B_KEY)}&pageNo=${page}&numOfRows=999&inqryDiv=1&type=json&inqryBgnDt=${bgn}&inqryEndDt=${end}`;
      const rr = await fetch(u); if (!rr.ok) { console.log("nara http", rr.status); break; }
      const jj = await rr.json();
      total = Number(jj?.response?.body?.totalCount || 0);
      let it = jj?.response?.body?.items; if (it?.item) it = it.item;
      it = Array.isArray(it) ? it : (it ? [it] : []);
      if (!it.length) break;
      list = list.concat(it); page++;
    }
    console.log(`nara raw ${list.length}건 수신 (total ${total})`);
    const out = {};
    for (const it of list) {
      const nm = it.bidNtceNm || "", nn = norm(nm);
      let axis = null, type = null, hits = 0;
      for (const a of AX) { const h = a.kw.filter(k => nn.includes(norm(k))); if (h.length) { axis = a.t; type = a.type; hits = h.length; break; } }
      if (!axis) continue;                                          // 우리 4축 아니면 제외
      if (EXCLUDE.some(k => nn.includes(norm(k)))) continue;        // 무관 공고 제외
      const amt = Number(it.presmptPrce || it.asignBdgtAmt || 0);
      if (amt > 0 && amt < 2e8) continue;                           // 금액 2억 미만 제외 (미공개=유지)
      let dl = it.bidClseDt || "";
      dl = dl.includes("-") ? dl.slice(0,10) : (dl.length >= 8 ? `${dl.slice(0,4)}-${dl.slice(4,6)}-${dl.slice(6,8)}` : "");
      if (!dl || dl < todayISO) continue;                          // 마감일 없거나 이미 지난 공고 제외 (D-day 표기 위해)
      const cutoff = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
      if (dl < cutoff) continue;                                    // 마감 촉박(D-14 미만) 공고 제외
      let score = type === "growth" ? 60 : 40;                      // 모빌리티(현금)=40, 성장축=60
      if (amt >= 5e8) score += 25; else if (amt >= 1e8) score += 15; else if (amt > 0) score += 5;
      score = Math.min(score + Math.min(hits*3, 9), 100);
      const key = ((it.bidNtceNo || "") + "-" + (it.bidNtceOrd || "0")).replace(/[.#$\[\]\/]/g, "_") || ("k" + Object.keys(out).length);
      out[key] = { name: nm.slice(0,80), org: (it.ntceInsttNm||"").slice(0,20), amount: won(amt) || "미공개",
        deadline: dl, url: it.bidNtceDtlUrl || it.bidNtceUrl || "", axis, axisType: type, no: it.bidNtceNo || "",
        score, band: score >= 70 ? "전력" : score >= 40 ? "조건부" : "검토" };
    }
    // 점수순 상위 후보에 대해 면허제한 검사 → 미보유 면허 요구 공고 제외 후 30건 확정
    const ranked = Object.entries(out).sort((a,b) => b[1].score - a[1].score).slice(0, 45);
    const top = [];
    for (const [k, v] of ranked) {
      if (top.length >= 30) break;
      if (await requiresExcludedLicense(v.no)) { console.log(`면허제한 제외: ${v.name}`); continue; }
      top.push([k, v]);
    }
    const cand = {}; for (const [k,v] of top) cand[k] = v;
    naraCount = top.length;
    await fetch(`${DB}/narajangteo.json`, { method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ meta: { updatedAt: now, count: naraCount }, candidates: cand }) });
    console.log(`narajangteo: ${naraCount}건 스크리닝`);
  } catch (e) { console.log("nara error", e.message); }
}

await setMeta({ lastRun: now, github: gh, arxiv: ax, g2b: g2, nara: naraCount });
console.log(`done: github=${gh} arxiv=${ax} g2b=${g2} nara=${naraCount} at ${now}`);
