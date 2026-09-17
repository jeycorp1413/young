// 순수 함수만. 상태를 바꾸지 않고 파생값을 계산한다 (D-day · 이정표 · 정렬 · 통계 · 신규 공고).
import { MILESTONES, STAGE_BY, AXES, AXIS_TAGS } from "./config.js";

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

// ── 경쟁 구도 · 내정 가늠 (드로어) ──
// 원장(같은 발주처 이력·같은 분야 업체) + 추적기 신호 + 판정문에 지목된 현행사를 규칙으로 합산한다. 확정이 아니라 가늠이다.
const orgKey = s => String(s || "").replace(/\(.*?\)/g, "").replace(/[\s·]/g, "").slice(0, 8);
const sameOrg = (a, b) => { const x = orgKey(a), y = orgKey(b); return !!x && !!y && (x.startsWith(y.slice(0, 6)) || y.startsWith(x.slice(0, 6))); };
const corpShort = c => String(c || "").replace(/^(㈜|\(주\)|주식회사)\s*/, "").replace(/\s*(㈜|\(주\)|주식회사)$/, "").trim();
// 판정문을 문장으로 (드로어 표시와 같은 규칙)
export const splitSentences = text => String(text || "").replace(/([다요음함임됨였됐]\.)\s+(?=[가-힣A-Za-z0-9「(①-⑳\d])/g, "$1\u0001").split("\u0001").map(x => x.trim()).filter(Boolean);
const INCUMBENT_RX = /(?:현행|기존|현재)\s*(?:고도화\s*|운영\s*|유지관리\s*|구축\s*|시스템\s*)?(?:수행사|운영사|사업자|용역사|개발사|유지관리사)\s*(?:는|은|인|:|=)?\s*((?:㈜|\(주\)|주식회사\s?)?[가-힣A-Za-z0-9&]{2,20})/g;
export function competitorProfile(state, id) {
  const o = state.opps[id] || {}; const tr = trackRow(state, id); const L = state.tracking?.ledger || {};
  const an = state.analyses[id] || {}; const days = Object.keys(an).sort(); const latest = days.length ? an[days[days.length - 1]] : null;
  const fields = latest ? [["한 줄 요약", latest.oneline], ["승부처", latest.edge], ["메모", latest.note], ...(latest.gates || []).map(x => ["탈락요건", x]), ...(latest.pros || []).map(x => ["강점", x]), ...(latest.risks || []).map(x => ["리스크", x]), ...(latest.actions || []).map(x => ["액션", x])].filter(f => f[1]) : [];
  const text = fields.map(f => f[1]).join(" ");
  // 이름이 들어간 문장만 뽑는다 (근거 펼침용)
  const sentWith = names => { const out = []; for (const [src, t] of fields) for (const sent of splitSentences(t)) { const hit = names.filter(nm => sent.includes(corpShort(nm))); if (hit.length) out.push({ src, text: sent, hl: hit.map(corpShort) }); } return out; };
  const org = o.dem || o.org || tr?.org || "";
  const corps = L.corps || [];
  const orgCorps = org ? corps.filter(c => (c.orgs || []).some(x => sameOrg(x, org))).sort((a, b) => (b.wins - a.wins) || (b.n - a.n)) : [];
  const orgBids = org ? (L.bids || []).filter(b => b.no !== id && sameOrg(b.org, org)) : [];
  const tags = AXIS_TAGS[o.axis] || [];   // 주 태그 우선, 모자라면 보조 태그로 채운다 (데이터플랫폼 같은 넓은 태그가 목록을 덮지 않게)
  const byTag = t => corps.filter(c => (c.tags || []).includes(t) && !orgCorps.includes(c) && c.n >= 2).sort((a, b) => (b.wins - a.wins) || (b.n - a.n));
  const axisCorps = []; for (const t of tags) { for (const c of byTag(t)) if (!axisCorps.includes(c) && axisCorps.length < 6) axisCorps.push(c); if (axisCorps.length >= 4) break; }
  // 판정문의 「현행 수행사 ○○」 — 회사명처럼 보이는 것만 (㈜·주식회사 표기, 원장에 있는 이름, 흔한 회사명 어미)
  const STOP = /^(협조|협력|지원|확인|선정|변경|참여|배제|유리|우위|대비|여부|기준|없음|있음|경우|등|및|또는|외|중|측|와|과)$/;
  const looksCorp = nm => /^(㈜|\(주\)|주식회사)/.test(nm) || corps.some(c => corpShort(c.corp) === corpShort(nm)) || /(소프트|테크|시스템|시스템즈|넷|정보|아이티|IT|랩|랩스|데이터|솔루션|솔루션즈|컨설팅|글로벌|노트|웍스|웨어|닉스|텍|링크|온|원)$/.test(nm);
  const mentioned = []; let m; INCUMBENT_RX.lastIndex = 0;
  while ((m = INCUMBENT_RX.exec(text))) { const nm = m[1].replace(/(이|가|는|은|을|를|와|과|의|에|에서|로|으로)$/, ""); if (nm.length >= 2 && !STOP.test(nm) && looksCorp(nm) && !mentioned.includes(nm)) mentioned.push(nm); }
  const cited = corps.map(c => c.corp).filter(c => { const sh = corpShort(c); return sh.length >= 2 && text.includes(sh) && !mentioned.some(x => x.includes(sh) || sh.includes(x)); });
  const parts = tr?.participants?.length ? tr.participants : (o.track?.participants || []);
  const signals = tr?.signals || o.track?.signals || []; const prev = tr?.prev || null;
  // 규격 의견 제출자 — 발주기관 자신·진흥원 답변은 빼고 업체만, 중복 제거
  const opinions = [...new Map((tr?.opinions || []).filter(x => x.corp && !sameOrg(x.corp, org) && !/진흥원|조달청$/.test(x.corp)).map(x => [x.corp, x])).values()];
  // 근거 한 줄마다 ev(펼치면 보이는 실제 문장·이력)를 붙인다. ev.type: sent(판정문 문장) · corps(업체 이력) · bids(개찰) · parts(참가업체) · list(문자열)
  const reasons = []; let pts = 0;
  const R = (w, t, ev) => reasons.push({ w, t, ev });
  if (mentioned.length) { pts += 2; R("+2", `판정문이 현행 수행사를 지목 — ${mentioned.join(", ")}`, { type: "sent", items: sentWith(mentioned) }); }
  const repeat = orgCorps.filter(c => c.wins >= 2);
  const corpEv = list => ({ type: "corps", items: list.map(c => ({ corp: c.corp, n: c.n, wins: c.wins, sole: c.sole, tech: c.tech, recent: c.recent || [], orgs: c.orgs || [], won: orgBids.filter(b => (b.parts || [])[0]?.corp === c.corp).map(b => `${b.open || ""} ${b.name}`) })) });
  if (repeat.length) { const w = repeat.some(c => c.wins >= 3) ? 2 : 1; pts += w; R(`+${w}`, `같은 발주처에서 반복 낙찰 — ${repeat.slice(0, 4).map(c => `${c.corp} ${c.wins}승/${c.n}건${c.sole ? ` (수의 ${c.sole})` : ""}`).join(", ")}`, corpEv(repeat)); }
  else if (orgCorps.length) R("·", `같은 발주처 이력 업체 ${orgCorps.length}개 — 반복 낙찰은 없음`, corpEv(orgCorps));
  const sole = orgCorps.filter(c => c.sole && !repeat.includes(c));
  if (sole.length) { pts += 1; R("+1", `같은 발주처 수의계약 이력 — ${sole.slice(0, 3).map(c => c.corp).join(", ")}`, corpEv(sole)); }
  const sig = signals.join(" ");
  const strong = signals.filter(x => /단독\s*(응찰|참가|입찰)|참가\s*1개사|참가 1\b|1개사\s*(참가|응찰|입찰)|단독/.test(x) && !/부적격/.test(x));
  if (strong.length) { pts += 2; R("+2", `추적기 신호 — ${strong.join(" / ")}`, { type: "list", items: [...signals.map(x => `신호: ${x}`), tr?.status ? `상태: ${tr.status}` : ""].filter(Boolean) }); }
  const nobody = signals.filter(x => /참가 0|유찰/.test(x) && !/단독|1개사/.test(x));
  if (nobody.length) { pts -= 1; R("−1", `원공고 유찰·참가 0 — 관심 업체가 없었다는 뜻이라 내정보다는 무관심 신호 (${nobody[0]})`, { type: "list", items: signals.map(x => `신호: ${x}`) }); }
  if (/의견\s*0건|규격의견\s*0|의견 없음/.test(sig)) { pts += 1; R("+1", "사전규격 의견 0건 — 내용을 이미 아는 업체가 있거나 관심 업체가 적다는 뜻일 수 있음", { type: "list", items: signals.map(x => `신호: ${x}`) }); }
  if (opinions.length) R("·", `사전규격 의견 제출 ${opinions.length}개사 — ${opinions.map(x => x.corp).join(", ")} (참여 의사 노출)`, { type: "list", items: opinions.map(x => `${x.corp}${x.date ? ` · ${x.date}` : ""}${x.title ? ` · ${x.title}` : ""}`) });
  if (parts.length >= 3) { pts -= 2; R("−2", `개찰 참가 ${parts.length}개사 — 실제 경쟁이 성립함`, { type: "parts", items: parts }); }
  else if (parts.length) { pts += 2; R("+2", `개찰 참가 ${parts.length}개사 — ${parts.map(p => p.corp).join(", ")}`, { type: "parts", items: parts }); }
  if (prev?.participants?.length) { const n = prev.participants.length; if (n <= 1) pts += 1; R(n <= 1 ? "+1" : "·", `원공고 ${prev.no} 참가 ${n}개사 — ${prev.participants.map(p => p.corp).join(", ")}`, { type: "parts", items: prev.participants }); }
  const compBids = orgBids.filter(b => Number(b.n) >= 3);
  if (compBids.length) { pts -= 1; R("−1", `같은 발주처 최근 개찰이 3개사 이상 경쟁 — ${compBids.slice(0, 2).map(b => `${String(b.name).slice(0, 20)}${String(b.name).length > 20 ? "…" : ""} ${b.n}개사`).join(", ")}`, { type: "bids", items: compBids }); }
  const hasData = reasons.length > 0 || cited.length > 0;
  const level = !hasData ? "none" : pts >= 4 ? "high" : pts >= 2 ? "mid" : "low";
  return { o, tr, latest, org, orgCorps: orgCorps.slice(0, 6), orgBids: orgBids.slice(0, 4), axisCorps, mentioned, cited: cited.slice(0, 8), parts, signals, opinions, reasons, pts, level, team: o.incumbent || null };
}
