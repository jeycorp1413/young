// 사업 상세 드로어 — 기본정보 · 결정(단계/결과/담당/판정) · 일정 · 판정 근거 · 추적 · 로그
import { STAGES, OUTCOMES, MEMBERS, MILESTONES, GATES, LINKS, AXES } from "../config.js";
import { milestones, fmtWon, fmtDate } from "../derive.js";
import { esc, chipAxis, chipStage, chipKind, ddayBadge, scoreBadge, oursMark, outcomeMark, scoreBars, empty } from "./components.js";

export function render(state, id) {
  const o = state.opps[id]; if (!o) return `<div class="dh"><h2>사업을 찾을 수 없습니다</h2><button class="x" data-action="close">✕</button></div>`;
  const an = state.analyses[id] || {}; const days = Object.keys(an).sort(); const latest = days.length ? an[days[days.length - 1]] : null;
  const logs = Object.entries(state.log[id] || {}).map(([k, v]) => v).sort((a, b) => (b.t || "").localeCompare(a.t || ""));
  const tr = o.track || {};
  const ms = milestones(o);
  const li = arr => Array.isArray(arr) && arr.length ? `<ul class="bullets">${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  return `
  <div class="dh"><div style="min-width:0">
      <div class="tags" style="margin-bottom:4px">${chipAxis(o.axis)}${chipStage(o.stage)}${outcomeMark(o)}${chipKind(o.kind)}${oursMark(o)}</div>
      <h2>${esc(o.name)}</h2>
      <div class="small mute">${esc(o.dem || o.org)}${o.dem && o.org && o.dem !== o.org ? ` · 공고 ${esc(o.org)}` : ""} · <span class="num">${fmtWon(o.budget)}</span> · <span class="num">${esc(id)}</span>${o.alias ? ` <span class="xs">(前 ${esc(o.alias)})</span>` : ""}</div>
    </div><button class="x" data-action="close" aria-label="닫기">✕</button></div>
  <div class="db">
    <div class="sec"><h3>결정</h3>
      <div class="ctrl">
        <div><label>단계</label><select data-action="stage" data-id="${esc(id)}">${STAGES.map(s => `<option value="${s.id}" ${o.stage === s.id ? "selected" : ""}>${esc(s.label)}</option>`).join("")}</select></div>
        <div><label>결과</label><select data-action="outcome" data-id="${esc(id)}">${OUTCOMES.map(([v, l]) => `<option value="${v}" ${(o.outcome || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div><label>담당</label><select data-action="owner" data-id="${esc(id)}"><option value="">-</option>${MEMBERS.map(m => `<option ${o.owner === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
        <div><label>판정 점수 (60)</label><input type="number" min="0" max="60" value="${o.latest?.score ?? ""}" data-action="score" data-id="${esc(id)}" placeholder="-"></div>
        <div><label>당사 입찰</label><select data-action="ours" data-id="${esc(id)}"><option value="" ${!o.ours ? "selected" : ""}>아니오</option><option value="1" ${o.ours ? "selected" : ""}>예</option></select></div>
        <div><label>사업 축</label><select data-action="axis" data-id="${esc(id)}">${AXES.map(a => `<option ${o.axis === a.id ? "selected" : ""}>${esc(a.id)}</option>`).join("")}</select></div>
      </div>
      <div class="small" style="margin-top:8px">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">나라장터 ↗</a>` : "<span class=\"mute\">나라장터 링크 없음</span>"} · <a href="${LINKS.tracker}" target="_blank">추적기·경쟁사 원장</a></div>
      ${o.stageBy === "auto" ? `<div class="xs mute" style="margin-top:6px">단계는 동기화가 자동 추정한 값입니다. 바꾸면 이후 자동 갱신에서 덮이지 않습니다.</div>` : ""}
    </div>
    <div class="sec"><h3>일정 <span class="xs" style="text-transform:none;font-weight:500">${ms.length ? `다음 ${esc((ms.find(m => m.dday >= 0) || ms[ms.length - 1]).label)} ${ddayBadge((ms.find(m => m.dday >= 0) || ms[ms.length - 1]).dday)}` : "등록된 이정표 없음"}</span></h3>
      <div class="date-grid">${MILESTONES.map(m => `<div><label>${esc(m.label)}</label><input type="datetime-local" value="${esc((o.dates?.[m.k] || "").replace(" ", "T").slice(0, 16))}" data-action="date" data-id="${esc(id)}" data-k="${m.k}"></div>`).join("")}</div>
    </div>
    <div class="sec"><h3>판정 ${latest ? `<span class="xs" style="text-transform:none;font-weight:500">${esc(latest.ymd || days[days.length - 1])} · ${scoreBadge(latest.score)} ${esc(latest.verdict || "")}${days.length > 1 ? ` · 이력 ${days.length}회` : ""}</span>` : ""}</h3>
      ${latest ? `${latest.oneline ? `<p class="small" style="margin:0 0 10px">${esc(latest.oneline)}</p>` : ""}
        ${scoreBars(latest.scores)}
        ${Array.isArray(latest.gates) && latest.gates.length ? `<details><summary>탈락요건 6항목 확인</summary><ul class="bullets">${latest.gates.map((g, i) => `<li><b>${esc(GATES[i] || "")}</b> — ${esc(g)}</li>`).join("")}</ul></details>` : ""}
        ${latest.edge ? `<details open><summary>승부처</summary><p class="small" style="margin:4px 0">${esc(latest.edge)}</p></details>` : ""}
        ${latest.pros?.length ? `<details><summary>강점 ${latest.pros.length}</summary>${li(latest.pros)}</details>` : ""}
        ${latest.risks?.length ? `<details open><summary>리스크 ${latest.risks.length}</summary>${li(latest.risks)}</details>` : ""}
        ${latest.actions?.length ? `<details open><summary>액션 ${latest.actions.length}</summary>${li(latest.actions)}</details>` : ""}
        ${latest.docs?.length ? `<details><summary>분석 문서 ${latest.docs.length} (PC 프로젝트1 폴더)</summary>${li(latest.docs)}</details>` : ""}`
      : empty("아직 판정이 없습니다. 위 「판정 점수」에 점수를 넣거나 일일 판정 파일을 동기화하세요.")}
    </div>
    <div class="sec"><h3>추적 <span class="xs" style="text-transform:none;font-weight:500">${tr.checked ? `점검 ${esc(tr.checked)}` : "추적기 미등록"}</span></h3>
      ${tr.status ? `<dl class="kv"><dt>상태</dt><dd>${esc(tr.status)}</dd>${tr.signals?.length ? `<dt>신호</dt><dd style="color:var(--amber)">${tr.signals.map(esc).join(" / ")}</dd>` : ""}${tr.changes?.length ? `<dt>변경</dt><dd style="color:var(--red)">${tr.changes.map(esc).join("<br>")}</dd>` : ""}</dl>` : `<div class="xs mute">추적기에 등록하려면 PC에서 <code>python 나라장터_추적.py add ${esc(id)}</code></div>`}
      ${tr.participants?.length ? `<table class="tb" style="margin-top:8px"><thead><tr><th>순위</th><th>업체</th><th>기술</th><th>가격</th><th>종합</th><th>결과</th></tr></thead><tbody>
        ${tr.participants.map(p => `<tr class="${String(p.rank).trim() === "1" ? "top" : ""}"><td class="num">${esc(p.rank)}</td><td>${esc(p.corp)}</td><td class="num">${p.tech ?? ""}</td><td class="num">${p.price ?? ""}</td><td class="num">${p.total ?? ""}</td><td>${esc(p.result || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    </div>
    <div class="sec"><h3>로그 <span class="xs" style="text-transform:none;font-weight:500">${logs.length}건</span></h3>
      <form class="noteform" data-action="note" data-id="${esc(id)}"><input name="text" placeholder="메모 · 통화 내용 · 결정 근거" autocomplete="off"><button class="btn primary sm" type="submit">기록</button></form>
      <div class="log" style="margin-top:10px">${logs.length ? logs.map(l => `<div class="it ${esc(l.type)}"><span class="t num">${esc((l.t || "").slice(5, 16))}</span><span>${esc(l.text)}<span class="xs mute"> · ${esc(l.by || "")}</span></span></div>`).join("") : `<div class="xs mute">기록 없음</div>`}</div>
    </div>
    <div class="xs mute">등록 ${esc(o.createdAt || "")} · 갱신 ${esc(o.updatedAt || "")} ${o.by ? `· ${esc(o.by)}` : ""} · 출처 ${esc((o.src || []).join(", "))}</div>
  </div>`;
}
