// 작은 표시 단위들. 전부 HTML 문자열을 돌려주는 순수 함수 (+ 드로어·토스트 제어)
import { AXIS_BY_ID, STAGE_BY, AREAS, CRITERIA } from "../config.js";
import { urgency, scoreCls, fmtWon, nextMilestone } from "../derive.js";

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function chipAxis(axis) {
  const a = AXIS_BY_ID[axis] || AXIS_BY_ID["기타"];
  return `<span class="chip dot" style="color:${a.color};background:color-mix(in srgb,${a.color} 12%,transparent)">${esc(a.id)}</span>`;
}
export function chipStage(stage) {
  const s = STAGE_BY[stage]; if (!s) return "";
  const c = { slate: "var(--slate)", amber: "var(--amber)", blue: "var(--blue)", violet: "var(--violet)", green: "var(--green)" }[s.color];
  const bg = { slate: "var(--slate-2)", amber: "var(--amber-2)", blue: "var(--blue-2)", violet: "var(--violet-2)", green: "var(--green-2)" }[s.color];
  return `<span class="chip" style="color:${c};background:${bg}">${esc(s.label)}</span>`;
}
export function chipKind(kind) { return kind ? `<span class="chip">${esc(kind)}</span>` : ""; }
export function ddayBadge(n, label = "") {
  if (n == null) return `<span class="dday">${esc(label || "일정 없음")}</span>`;
  const t = n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`;
  return `<span class="dday ${urgency(n)}" title="${esc(label)}">${t}</span>`;
}
export function scoreBadge(s) { return s == null ? "" : `<span class="score ${scoreCls(s)} num">${s}</span>`; }
// 판정 출처 표기: "AI 추천 9/16" (일일 판정 자동) / "신지영 입력 9/16" (보드에서 수기)
export function judgedBy(latest) {
  if (!latest || latest.score == null) return "";
  const d = latest.ymd ? `${+latest.ymd.slice(5, 7)}/${+latest.ymd.slice(8, 10)}` : "";
  const who = latest.manual ? `${esc(latest.by || "담당")} 입력` : "AI 추천";
  const v = latest.verdict ? `<span class="chip" style="color:${scoreCls(latest.score) === "go" ? "var(--green)" : scoreCls(latest.score) === "mid" ? "var(--amber)" : "var(--red)"};background:transparent;padding:0;font-size:11px">${esc(latest.verdict)}</span>` : "";
  return `<span class="xs mute" style="white-space:nowrap">${v} ${who} ${d}</span>`;
}
export function ownerDot(o) { return o.owner ? `<span class="xs mute"><i class="who-dot"></i>${esc(o.owner)}</span>` : ""; }
export function oursMark(o) { return o.ours ? `<span class="ours xs">★ 당사</span>` : ""; }
export function outcomeMark(o) { return o.outcome ? `<span class="chip" style="color:${o.outcome === "won" ? "var(--green)" : "var(--red)"};background:${o.outcome === "won" ? "var(--green-2)" : "var(--red-2)"}">${{ won: "낙찰", lost: "탈락", cancelled: "취소·유찰" }[o.outcome]}</span>` : ""; }

// 공통 사업 행 (오늘·축 화면)
export function oppRow(o, ms) {
  const m = ms || nextMilestone(o);
  return `<div class="row" data-open="${esc(o.id)}">
    <div class="d">${ddayBadge(m?.dday, m?.label)}</div>
    <div><div class="t">${esc(o.name)}</div>
      <div class="m">${chipAxis(o.axis)}${chipStage(o.stage)}${outcomeMark(o)}<span>${esc(o.dem || o.org)}</span><span class="num">${fmtWon(o.budget)}</span>${m ? `<span>${esc(m.label)}${(m.also || []).map(x => ` · ${esc(x.label)} ${esc(x.date.slice(5, 10).replace("-", "/"))}`).join("")}</span>` : ""}${oursMark(o)}</div></div>
    <div class="r">${scoreBadge(o.latest?.score)}${judgedBy(o.latest)}${ownerDot(o)}</div>
  </div>`;
}
// 12항목 → 6영역 막대
export function scoreBars(scores) {
  if (!Array.isArray(scores) || scores.length !== 12) return "";
  return `<div class="bars">${AREAS.map((a, i) => { const v = (Number(scores[i * 2]) || 0) + (Number(scores[i * 2 + 1]) || 0);
    return `<div class="bar"><span>${esc(a)}</span><div class="tr"><i style="width:${v * 10}%"></i></div><span class="v num">${v}</span></div>`; }).join("")}</div>
  <details><summary>항목별 점수</summary><ul class="bullets">${CRITERIA.map((c, i) => `<li>${esc(c[1])} <b class="num">${scores[i]}</b></li>`).join("")}</ul></details>`;
}
export const empty = t => `<div class="empty">${esc(t)}</div>`;

export function openDrawer(html) { const d = document.getElementById("drawer"); d.innerHTML = html; d.classList.add("on"); document.getElementById("backdrop").classList.add("on"); document.body.style.overflow = "hidden"; }
export function closeDrawer() { document.getElementById("drawer").classList.remove("on"); document.getElementById("backdrop").classList.remove("on"); document.body.style.overflow = ""; }
let toastT = null;
export function toast(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800); }
