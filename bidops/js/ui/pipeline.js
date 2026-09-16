// 파이프라인 — 단계별 칸반. 카드 = 축·사업명·기관·예산·다음 이정표·판정·담당
import { STAGES, AXES } from "../config.js";
import { oppsArray, sortPipeline, nextMilestone, fmtWon, filterOpps } from "../derive.js";
import { esc, chipAxis, ddayBadge, scoreBadge, judgedBy, oursMark, outcomeMark, empty } from "./components.js";

export function render(state, ui) {
  let opps = filterOpps(oppsArray(state), ui.q);
  if (ui.axisFilter) opps = opps.filter(o => o.axis === ui.axisFilter);
  const cols = STAGES.filter(s => s.flow || ui.showExtra);
  const card = o => { const m = nextMilestone(o); return `<div class="kcard" data-open="${esc(o.id)}">
      <div class="km"><span>${chipAxis(o.axis)}</span>${ddayBadge(m?.dday, m?.label)}</div>
      <div class="kt">${esc(o.name)}</div>
      <div class="km"><span class="l">${esc(o.dem || o.org)} · <span class="num">${fmtWon(o.budget)}</span></span><span>${outcomeMark(o)}${oursMark(o)}${scoreBadge(o.latest?.score)}</span></div>
      <div class="xs mute" style="margin-top:4px;display:flex;justify-content:space-between;gap:6px"><span>${m ? `${esc(m.label)} ${esc(m.date.slice(5, 16))}` : ""}${o.owner ? ` · ${esc(o.owner)}` : ""}</span>${judgedBy(o.latest)}</div>
    </div>`; };
  return `
  <div class="page-h"><div><h1>파이프라인</h1><div class="sub">${opps.length}건 · 다음 마감이 가까운 순</div></div>
    <div class="toolbar">
      <input class="searchbox" type="search" placeholder="사업·기관·담당 검색" value="${esc(ui.q)}" data-action="search">
      <select class="who" data-action="axis-filter"><option value="">모든 축</option>${AXES.map(a => `<option value="${esc(a.id)}" ${ui.axisFilter === a.id ? "selected" : ""}>${esc(a.id)}</option>`).join("")}</select>
      <div class="seg"><button class="${ui.showExtra ? "" : "on"}" data-action="extra" data-v="0">진행</button><button class="${ui.showExtra ? "on" : ""}" data-action="extra" data-v="1">관찰·보류·불참 포함</button></div>
      <button class="btn sm" data-action="new">+ 수기 등록</button>
    </div></div>
  <div class="kanban">${cols.map(s => { const items = sortPipeline(opps.filter(o => o.stage === s.id));
    return `<div class="col"><div class="ch"><span>${esc(s.label)}</span><span class="n num">${items.length}</span></div><div class="cb">${items.length ? items.map(card).join("") : empty("없음")}</div></div>`; }).join("")}</div>`;
}
