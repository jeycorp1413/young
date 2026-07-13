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

// 조달청 나라장터 입찰공고(용역) 키워드 검색 — best effort (API 스펙 상이 시 G2B_ENDPOINT로 조정)
async function g2bLatest(keyword) {
  if (!G2B_KEY) return null;
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, "") + "0000";
  const bgn = fmt(new Date(Date.now() - 90 * 864e5));
  const end = fmt(new Date());
  const base = process.env.G2B_ENDPOINT ||
    "https://apis.data.go.kr/1230000/ao/BidPublicInfoService/getBidPblancListInfoServcPPSSrch";
  const url = `${base}?serviceKey=${encodeURIComponent(G2B_KEY)}&pageNo=1&numOfRows=1&inqryDiv=1&type=json&inqryBgnDt=${bgn}&inqryEndDt=${end}&bidNtceNm=${encodeURIComponent(keyword)}`;
  try {
    const r = await fetch(url); if (!r.ok) { console.log("g2b http", r.status); return null; }
    const j = await r.json();
    let item = j?.response?.body?.items;
    if (item?.item) item = item.item;
    const it = Array.isArray(item) ? item[0] : item;
    if (!it) return null;
    return { ver: (it.bidNtceNm || "").slice(0, 55), date: (it.bidNtceDt || "").slice(0, 10),
             url: it.bidNtceDtlUrl || it.bidNtceUrl || "", org: it.ntceInsttNm || "" };
  } catch (e) { console.log("g2b error", e.message); return null; }
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

// 조달청: 고정 키워드로 최신 공고 1건 → g2b-keyword 항목에 표기
if (G2B_KEY && items["g2b-keyword"]) {
  for (const kw of ["생성형 AI", "AI 에이전트", "지능형 민원", "내부지식 검색"]) {
    const l = await g2bLatest(kw);
    if (l) {
      await patchItem("g2b-keyword", { autoLatest: `[${kw}] ${l.ver}`, autoDate: l.date, autoUrl: l.url, autoAt: now });
      g2++; break;
    }
  }
}

await setMeta({ lastRun: now, github: gh, arxiv: ax, g2b: g2 });
console.log(`done: github=${gh} arxiv=${ax} g2b=${g2} at ${now}`);
