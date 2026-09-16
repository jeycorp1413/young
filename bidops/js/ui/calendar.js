// 캘린더 — 월간 이정표. 색 = 이정표 종류(제안서 빨강 · 개찰 보라 · 발표 앰버 · 의견 청록)
import { oppsArray, calendarCells } from "../derive.js";
import { esc } from "./components.js";

export function render(state, ui) {
  const [y, m] = ui.calMonth.split("-").map(Number);
  const cells = calendarCells(y, m - 1, oppsArray(state));
  const n = cells.reduce((a, c) => a + (c.off ? 0 : c.items.length), 0);
  return `
  <div class="page-h"><div><h1>${y}년 ${m}월</h1><div class="sub">이정표 ${n}건 · 클릭하면 사업 상세</div></div>
    <div class="toolbar"><div class="seg"><button data-action="cal" data-v="-1">‹</button><button data-action="cal" data-v="0">오늘</button><button data-action="cal" data-v="1">›</button></div>
      <span class="xs mute"><span class="chip" style="color:var(--red);background:var(--red-2)">제안서</span> <span class="chip" style="color:var(--violet);background:var(--violet-2)">개찰</span> <span class="chip" style="color:var(--amber);background:var(--amber-2)">발표</span> <span class="chip" style="color:var(--teal);background:var(--teal-2)">의견</span> <span class="chip" style="color:var(--blue);background:var(--blue-2)">자격·협정</span></span></div></div>
  <div class="cal">${"일월화수목금토".split("").map(d => `<div class="wd">${d}</div>`).join("")}
    ${cells.map(c => `<div class="cell ${c.off ? "off" : ""} ${c.today ? "today" : ""}"><span class="dn num">${c.date.getDate()}</span>
      ${c.items.map(it => `<div class="ev ${it.ms.cls}" data-open="${esc(it.opp.id)}" title="${esc(it.ms.label)} · ${esc(it.opp.name)}">${esc(it.ms.label)} ${esc(it.opp.name)}</div>`).join("")}</div>`).join("")}
  </div>`;
}
