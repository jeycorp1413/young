// 축 — 승산 축별로 기회·판정·마감·경쟁사·보유 자산을 한 카드에
import { STAGES } from "../config.js";
import { oppsArray, axisStats } from "../derive.js";
import { esc, empty } from "./components.js";

export function render(state) {
  const st = axisStats(oppsArray(state));
  const flow = STAGES.filter(s => s.flow);
  return `
  <div class="page-h"><div><h1>사업 축</h1><div class="sub">축별 파이프라인 · 평균 판정 · 30일 내 마감 · 개찰에서 만난 경쟁사 · 우리가 들고 갈 자산</div></div></div>
  <div class="axis-grid">${Object.values(st).filter(s => s.total || s.axis.id !== "기타").map(s => `
    <div class="card axis-card">
      <div class="top"><h2><i style="background:${s.axis.color}"></i>${esc(s.axis.id)}</h2><button class="btn sm" data-action="axis-go" data-v="${esc(s.axis.id)}">파이프라인 →</button></div>
      <div class="stat-row"><div><b class="num">${s.total}</b><span>기회</span></div><div><b class="num">${(s.byStage.go || 0) + (s.byStage.submitted || 0)}</b><span>참여 중</span></div><div><b class="num">${s.avg == null ? "-" : s.avg}</b><span>평균 판정</span></div><div><b class="num">${s.ours}</b><span>당사 입찰</span></div></div>
      <div class="mini">
        <div class="tags">${flow.map(f => s.byStage[f.id] ? `<span class="tag">${esc(f.label)} ${s.byStage[f.id]}</span>` : "").join("")}</div>
        <h4>30일 내 마감</h4>${s.due.length ? s.due.slice(0, 4).map(x => `<div class="li" data-open="${esc(x.opp.id)}"><span>${esc(x.opp.name)}</span><span class="num mute">${esc(x.ms.label)} D-${x.ms.dday}</span></div>`).join("") : `<div class="xs mute">없음</div>`}
        <h4>경쟁사 (개찰 참가 · 1위 횟수)</h4>${s.corps.length ? `<div class="tags">${s.corps.map(c => `<span class="tag">${esc(c.corp)} ${c.n}${c.wins ? `·${c.wins}승` : ""}</span>`).join("")}</div>` : `<div class="xs mute">아직 개찰 데이터 없음</div>`}
        <h4>보유 자산</h4>${s.axis.assets.length ? `<div class="tags">${s.axis.assets.map(a => `<span class="tag">${esc(a)}</span>`).join("")}</div>` : `<div class="xs mute">-</div>`}
      </div>
    </div>`).join("")}</div>`;
}
