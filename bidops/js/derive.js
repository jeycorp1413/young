// 순수 함수만. 상태를 바꾸지 않고 파생값을 계산한다 (D-day · 이정표 · 정렬 · 통계 · 신규 공고).
import { MILESTONES, STAGE_BY, AXES } from "./config.js";

export function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
export function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}
export function dday(s) {
  const d = parseDate(s); if (!d) return null;
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return Math.round((x - today()) / 864e5);
}
export function urgency(n) { return n == null ? "" : n < 0 ? "over" : n === 0 ? "today" : n <= 3 ? "soon" : n <= 7 ? "week" : "later"; }
export function fmtDate(s, withTime = false) {
  const d = parseDate(s); if (!d) return s || "";
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const wd = "일월화수목금토"[d.getDay()];
  const t = withTime && /\d{2}:\d{2}/.test(String(s)) ? ` ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
  return `${md}(${wd})${t}`;
}
export function fmtWon(n) {
  n = Number(n || 0); if (!n) return "미공개";
  if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "억";
  return Math.round(n / 1e6) + "백만";
}
export function ymd(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export function oppsArray(state) { return Object.entries(state.opps || {}).map(([id, o]) => Object.assign({ id }, o)); }
export function milestones(opp) {
  const ds = opp.dates || {};
  return MILESTONES.filter(m => ds[m.k]).map(m => ({ k: m.k, label: m.label, cls: m.cls, date: ds[m.k], dday: dday(ds[m.k]) }))
    .sort((a, b) => (parseDate(a.date) || 0) - (parseDate(b.date) || 0));
}
export function nextMilestone(opp) {
  const ms = milestones(opp);
  return ms.find(m => m.dday != null && m.dday >= 0) || ms[ms.length - 1] || null;
}
export function isActive(o) { return !["drop", "hold"].includes(o.stage) && o.outcome !== "cancelled"; }
export function scoreCls(s) { return s == null ? "" : s >= 48 ? "go" : s >= 30 ? "mid" : "no"; }

// 마감 목록: days 이내 이정표를 사업당 1행(가장 가까운 것)으로, 같은 창의 나머지 이정표는 also 에 붙인다.
// 관찰(watch) 사업은 우리가 내는 게 아니므로 개찰·낙찰만 본다.
export function dueList(opps, from = 0, to = 7) {
  const out = [];
  for (const o of opps) {
    if (!isActive(o) || o.stage === "result") continue;
    const hit = milestones(o).filter(m => m.dday != null && m.dday >= from && m.dday <= to && (o.stage !== "watch" || ["open", "award"].includes(m.k)));
    if (!hit.length) continue;
    const ms = Object.assign({}, hit[0], { also: hit.slice(1) });
    out.push({ opp: o, ms });
  }
  return out.sort((a, b) => a.ms.dday - b.ms.dday || (b.opp.latest?.score || 0) - (a.opp.latest?.score || 0));
}
export function groupByDay(list) {
  const g = new Map();
  for (const it of list) { const k = it.ms.date.slice(0, 10); if (!g.has(k)) g.set(k, []); g.get(k).push(it); }
  return [...g.entries()];
}
// 최근 판정: N일 안에 판정(점수)이 붙은 사업을 점수 높은 순으로 — 마감이 멀어도 첫 화면에 보이게
export function recentJudged(opps, days = 7) {
  const lim = ymd(new Date(Date.now() - days * 864e5));
  return opps.filter(o => o.latest?.score != null && (o.latest.ymd || "") >= lim && o.stage !== "drop")   // 취소된 것도 배지 달아 보여준다
    .sort((a, b) => (b.latest.score - a.latest.score) || (b.latest.ymd || "").localeCompare(a.latest.ymd || ""));
}
export function recentChanges(opps, days = 3) {
  const lim = ymd(new Date(Date.now() - days * 864e5));
  return opps.filter(o => (o.track?.changes || []).length && (o.track?.checked || "") >= lim);
}
// 신규 공고: 나라장터 피드(/nara)에 있으나 아직 검토 등록되지 않은 건
export function inboxItems(state) {
  const have = new Set(Object.keys(state.opps || {}));
  const alias = new Set(Object.values(state.opps || {}).map(o => o.alias).filter(Boolean));
  return Object.values(state.nara?.items || {})
    .filter(c => c.no && !have.has(keyOf(c.no)) && !alias.has(c.no))
    .filter(c => { const d = dday(c.deadline); return d == null || d >= 0; })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}
export function keyOf(no) { return String(no || "").replace(/[.#$\[\]\/]/g, "_").trim(); }
export function sortPipeline(list) {
  return list.sort((a, b) => {
    const da = nextMilestone(a)?.dday, db = nextMilestone(b)?.dday;
    const ua = da == null || da < 0 ? 9e4 : da, ub = db == null || db < 0 ? 9e4 : db;
    return ua - ub || (b.latest?.score || 0) - (a.latest?.score || 0);
  });
}
export function filterOpps(list, q) {
  if (!q) return list; q = q.toLowerCase();
  return list.filter(o => [o.name, o.org, o.dem, o.id, o.axis, o.owner].some(v => String(v || "").toLowerCase().includes(q)));
}
// 축 통계: 파이프라인 분포·평균 판정·마감 임박·경쟁사(개찰 참가업체 합산)
export function axisStats(opps) {
  const out = {};
  for (const a of AXES) out[a.id] = { axis: a, total: 0, byStage: {}, scores: [], due: [], corps: new Map(), ours: 0 };
  for (const o of opps) {
    const s = out[o.axis] || out["기타"]; s.total++;
    s.byStage[o.stage] = (s.byStage[o.stage] || 0) + 1;
    if (o.latest?.score != null) s.scores.push(o.latest.score);
    if (o.ours) s.ours++;
    const nm = nextMilestone(o); if (isActive(o) && nm && nm.dday != null && nm.dday >= 0 && nm.dday <= 30) s.due.push({ opp: o, ms: nm });
    for (const p of o.track?.participants || []) {
      if (!p.corp || /더아이엠씨/.test(p.corp)) continue;
      const c = s.corps.get(p.corp) || { corp: p.corp, n: 0, wins: 0 }; c.n++; if (String(p.rank).trim() === "1") c.wins++; s.corps.set(p.corp, c);
    }
  }
  for (const s of Object.values(out)) {
    s.avg = s.scores.length ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : null;
    s.due.sort((a, b) => a.ms.dday - b.ms.dday);
    s.corps = [...s.corps.values()].sort((a, b) => b.wins - a.wins || b.n - a.n).slice(0, 6);
  }
  return out;
}
// 캘린더 셀: 해당 월 6주 그리드에 이정표를 배치
export function calendarCells(y, m, opps) {
  const first = new Date(y, m, 1); const start = new Date(first); start.setDate(1 - first.getDay());
  const ev = new Map();
  for (const o of opps) { if (!isActive(o)) continue; for (const ms of milestones(o)) { const k = ms.date.slice(0, 10); if (!ev.has(k)) ev.set(k, []); ev.get(k).push({ opp: o, ms }); } }
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = ymd(d);
    cells.push({ date: d, key: k, off: d.getMonth() !== m, today: k === ymd(today()), items: ev.get(k) || [] });
  }
  return cells;
}
export function stageLabel(id) { return STAGE_BY[id]?.label || id || ""; }

// ── 추적기(/nara_tracking) ──
export function trackingRows(state) { return (state.tracking?.rows || []).map(r => Object.assign({ id: keyOf(r.bid_no || r.no) }, r)); }
export function trackRow(state, id) { return trackingRows(state).find(r => r.id === id) || null; }
export function trackCls(r) { const st = r.status || ""; if (/계약|낙찰:|개찰 완료/.test(st)) return "done"; if (/공고 중/.test(st)) return "open"; return "wait"; }
export function trackFilter(rows, f) {
  if (!f || f === "all") return rows;
  if (f === "ours") return rows.filter(r => r.ours);
  if (f === "changed") return rows.filter(r => (r.changes || []).length);
  return rows.filter(r => trackCls(r) === f);
}
// 정렬: 달라진 것 → 당사 → 개찰이 가까운 순(지난 것은 뒤로)
export function trackSort(rows) {
  const key = r => { const d = dday(r.open); return d == null ? 9e4 : d < 0 ? 5e4 - d : d; };
  return rows.sort((a, b) => ((b.changes || []).length ? 1 : 0) - ((a.changes || []).length ? 1 : 0) || (b.ours ? 1 : 0) - (a.ours ? 1 : 0) || key(a) - key(b));
}
export function ledgerCorps(state, tag, q) {
  let c = state.tracking?.ledger?.corps || [];
  if (tag) c = c.filter(x => (x.tags || []).includes(tag));
  if (q) { q = q.toLowerCase(); c = c.filter(x => [x.corp, ...(x.orgs || []), ...(x.recent || [])].some(v => String(v || "").toLowerCase().includes(q))); }
  return c;
}
export function ledgerBids(state) { return state.tracking?.ledger?.bids || []; }
