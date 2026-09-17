// 사업 상세 드로어 — 기본정보 · 결정(단계/결과/담당/판정/축) · 일정 · 판정 근거 · 추적(추적기 원본 포함) · 로그
import { STAGES, OUTCOMES, MEMBERS, MILESTONES, GATES, LINKS, AXES, TRACK_KIND, INCUMBENT_LEVELS, INCUMBENT_BY } from "../config.js";
import { milestones, fmtWon, trackRow, competitorProfile } from "../derive.js";
import { esc, chipAxis, chipStage, chipKind, ddayBadge, scoreBadge, oursMark, outcomeMark, scoreBars, empty } from "./components.js";

const fmtN = v => (v == null || v === "") ? "" : Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 2 });

// 긴 판정문을 문장 단위로 끊는다. "…다. " 뒤에서 나누고, ①②③ 열거는 줄을 바꿔 들여쓴다.
function sentences(text) {
  return String(text || "").replace(/([다요음함임됨였됐]\.)\s+(?=[가-힣A-Za-z0-9「(①-⑳\d])/g, "$1\u0001").split("\u0001").map(x => x.trim()).filter(Boolean);
}
function lines(sent) {   // 한 문장 안의 ①…②… 열거를 줄로
  const n = (sent.match(/[①-⑳]/g) || []).length;
  if (n < 2) return esc(sent);
  const parts = sent.split(/\s(?=[①-⑳])/);
  return esc(parts[0]) + parts.slice(1).map(p => `<span class="sub">${esc(p)}</span>`).join("");
}
const prose = text => text ? `<div class="prose">${sentences(text).map(x => `<p>${lines(x)}</p>`).join("")}</div>` : "";
const li = arr => Array.isArray(arr) && arr.length ? `<ul class="bullets">${arr.map(x => `<li>${sentences(x).map(lines).join("<br>")}</li>`).join("")}</ul>` : "";

// 근거 펼침 — 어떤 문장·이력이 신호였는지 그대로 보여준다 (이름은 형광)
function hl(text, names) { let h = esc(text); for (const nm of names || []) { const e = esc(nm); if (e) h = h.split(e).join(`<mark>${e}</mark>`); } return h; }
function evidenceHtml(ev) {
  if (!ev || !ev.items?.length) return `<div class="xs mute">세부 근거 없음</div>`;
  if (ev.type === "sent") return ev.items.map(x => `<p><span class="src">${esc(x.src)}</span>${hl(x.text, x.hl)}</p>`).join("");
  if (ev.type === "corps") return ev.items.map(x => `<p><b>${esc(x.corp)}</b> — 이 발주처 참가 ${x.n}건 · 1위·낙찰 ${x.wins}건${x.sole ? ` · 수의계약 ${x.sole}건` : ""}${x.tech ? ` · 평균 기술 ${x.tech}` : ""}${x.won?.length ? `<br><span class="src">1위</span>${x.won.map(esc).join(" / ")}` : ""}${x.recent?.length ? `<br><span class="src">최근 사업</span>${x.recent.map(esc).join(" / ")}` : ""}</p>`).join("");
  if (ev.type === "bids") return ev.items.map(b => `<p><b>${esc(b.name)}</b> <span class="mute">${esc(b.open || "")} · 참가 ${esc(b.n ?? "")}</span><br>${(b.parts || []).slice(0, 5).map(p => `${esc(p.rank)}위 ${esc(p.corp)}${p.total ? ` <span class="num mute">${fmtN(p.total)}</span>` : ""}`).join(" · ")}</p>`).join("");
  if (ev.type === "parts") return `<p>${ev.items.map(p => `${p.rank ? `${esc(p.rank)}위 ` : ""}${esc(p.corp)}${p.total ? ` <span class="num mute">${fmtN(p.total)}</span>` : ""}${p.result ? ` <span class="mute">${esc(p.result)}</span>` : ""}`).join(" · ")}</p>`;
  return ev.items.map(x => `<p>${esc(x)}</p>`).join("");
}

// 경쟁 구도 · 내정 가늠 — 원장·추적기·판정문 신호를 합산한 자동 가늠 + 팀 판단
function competitionHtml(state, id) {
  const c = competitorProfile(state, id); const team = c.team;
  const chip = (corp, meta) => `<span><b>${esc(corp)}</b>${meta ? ` ${esc(meta)}` : ""}</span>`;
  return `
    <div class="inc ${c.level}"><b>${esc(INCUMBENT_BY[c.level])}</b><span class="pts">자동 가늠 ${c.pts > 0 ? "+" : ""}${c.pts}점 · 근거 ${c.reasons.length}건</span>${team?.level ? `<span class="chip" style="margin-left:auto">팀 판단 ${esc(INCUMBENT_BY[team.level] || "")}</span>` : ""}</div>
    ${c.reasons.length ? `<div class="reasons">${c.reasons.map(r => `<details class="rs"><summary><span class="w ${r.w.startsWith("+") ? "up" : r.w.startsWith("−") ? "down" : ""}">${esc(r.w)}</span><span>${esc(r.t)}<span class="more">근거 보기</span></span></summary><div class="ev">${evidenceHtml(r.ev)}</div></details>`).join("")}</div>` : `<div class="xs mute">원장·추적기·판정문 어디에도 이 발주처의 이력 신호가 없습니다. 개찰 후 참가업체로 확인됩니다.</div>`}
    ${c.orgCorps.length ? `<div class="lbl">같은 발주처(${esc(c.org)}) 이력 업체 — 참가/1위·낙찰</div><div class="corps">${c.orgCorps.map(x => chip(x.corp, `${x.n}/${x.wins}${x.sole ? ` · 수의 ${x.sole}` : ""}`)).join("")}</div>` : ""}
    ${c.orgBids.length ? `<div class="lbl">같은 발주처 개찰 이력</div><table class="tb"><thead><tr><th>개찰</th><th>사업</th><th>참가</th><th>1위</th></tr></thead><tbody>${c.orgBids.map(b => `<tr data-open="${esc(b.no)}" style="cursor:pointer"><td class="num">${esc(b.open || "")}</td><td>${esc(b.name)}</td><td class="num">${esc(b.n ?? "")}</td><td>${esc((b.parts || [])[0]?.corp || "")}</td></tr>`).join("")}</tbody></table>` : ""}
    ${c.mentioned.length || c.cited.length ? `<div class="lbl">판정문에 등장한 업체</div><div class="corps">${c.mentioned.map(x => chip(x, "현행 수행사")).join("")}${c.cited.map(x => chip(x, "언급")).join("")}</div>` : ""}
    ${c.axisCorps.length ? `<div class="lbl">같은 분야(${esc(c.o.axis || "")})에서 자주 만나는 업체</div><div class="corps">${c.axisCorps.map(x => chip(x.corp, `${x.n}/${x.wins}`)).join("")}</div>` : ""}
    <div class="lbl">팀 판단</div>
    <form class="incform" data-action="inc-memo" data-id="${esc(id)}">
      <select data-action="inc-level" data-id="${esc(id)}"><option value="">미정</option>${INCUMBENT_LEVELS.filter(([v]) => v !== "none").map(([v, l]) => `<option value="${v}" ${team?.level === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <input name="memo" value="${esc(team?.memo || "")}" placeholder="내정 여부 근거 · 현행사 · 확인한 사실" autocomplete="off"><button class="btn primary sm" type="submit">저장</button>
    </form>
    ${team?.memo ? `<div class="small" style="margin-top:6px">${esc(team.memo)} <span class="xs mute">· ${esc(team.by || "")} ${esc((team.at || "").slice(5, 10))}</span></div>` : ""}
    <div class="xs mute" style="margin-top:8px">자동 가늠은 경쟁사 원장(같은 발주처 낙찰·수의 이력)·추적기 신호·판정문의 현행사 언급을 규칙으로 더한 값입니다. 확정은 개찰 참가업체로 합니다.</div>`;
}

// 추적기 원본(참가업체 전체·규격의견·낙찰·계약·원공고)을 그린다. o.track(동기화 요약)보다 자세하다.
function trackingHtml(tr, o) {
  const t = tr || {}; const parts = t.participants?.length ? t.participants : (o?.track?.participants || []);
  const status = t.status || o?.track?.status; const signals = t.signals || o?.track?.signals || []; const changes = t.changes || o?.track?.changes || [];
  let h = "";
  if (status) h += `<dl class="kv"><dt>상태</dt><dd>${esc(status)}</dd>${t.kind ? `<dt>등록 구분</dt><dd>${esc(TRACK_KIND[t.kind] || t.kind)}${t.memo ? ` · ${esc(t.memo)}` : ""}</dd>` : ""}${signals.length ? `<dt>눈여겨볼 점</dt><dd style="color:var(--amber)">${signals.map(esc).join(" / ")}</dd>` : ""}${changes.length ? `<dt>달라진 것</dt><dd style="color:var(--red)">${changes.map(esc).join("<br>")}</dd>` : ""}${t.kw_found ? `<dt>이름 감시</dt><dd>${esc(t.kw_found)}</dd>` : ""}</dl>`;
  if (parts.length) h += `<div class="lbl small" style="font-weight:700;margin:10px 0 4px">참가업체 ${parts.length}개사 (개찰 상세)</div><table class="tb"><thead><tr><th>순위</th><th>업체</th><th>대표</th><th>기술</th><th>가격</th><th>종합</th><th>결과</th></tr></thead><tbody>
    ${parts.map(p => `<tr class="${String(p.rank).trim() === "1" ? "top" : ""}"><td class="num">${esc(p.rank)}</td><td>${esc(p.corp)}</td><td>${esc(p.ceo || "")}</td><td class="num">${fmtN(p.tech)}</td><td class="num">${fmtN(p.price)}</td><td class="num">${fmtN(p.total)}</td><td>${esc(p.result || "")}</td></tr>`).join("")}</tbody></table>`;
  if (t.prev?.participants?.length) h += `<div class="small" style="margin-top:8px"><b>원공고 ${esc(t.prev.no)} 참가</b> — ${t.prev.participants.map(p => `${esc(p.rank)}위 ${esc(p.corp)}${p.total ? ` ${fmtN(p.total)}` : ""}`).join(" · ")}</div>`;
  if (t.opinions?.length) h += `<div class="small" style="margin-top:8px"><b>사전규격 의견 제출</b> — ${t.opinions.map(x => `${esc(x.corp)}${x.date ? `(${esc(x.date)})` : ""}`).join(", ")}</div>`;
  if (t.award) h += `<div class="small" style="margin-top:8px"><b>낙찰</b> — ${esc(t.award.corp)} · ${fmtN(t.award.amt)}원 · 낙찰률 ${fmtN(t.award.rate)}% · 참가 ${esc(t.award.n)} · ${esc(t.award.date)}</div>`;
  if (t.contract?.length) h += `<div class="small" style="margin-top:8px"><b>계약</b> — ${t.contract.map(c => `${esc(c.corp)} · ${fmtN(c.amt)}원 · ${esc(c.date)} · ${esc(c.method)}`).join("<br>")}</div>`;
  return h;
}

export function render(state, id) {
  const o = state.opps[id]; const tr = trackRow(state, id);
  if (!o && !tr) return `<div class="dh"><h2>사업을 찾을 수 없습니다</h2><button class="x" data-action="close">✕</button></div>`;
  if (!o) {   // 추적기에만 있고 아직 동기화되지 않은 건 — 읽기 전용
    return `<div class="dh"><div style="min-width:0"><div class="tags" style="margin-bottom:4px"><span class="chip">${esc(TRACK_KIND[tr.kind] || tr.kind)}</span>${tr.ours ? '<span class="ours xs">★ 당사</span>' : ""}</div>
      <h2>${esc(tr.name || tr.memo)}</h2><div class="small mute">${esc(tr.org || "")} · <span class="num">${esc(tr.budget_fmt || "")}</span> · <span class="num">${esc(id)}</span></div></div><button class="x" data-action="close">✕</button></div>
      <div class="db"><div class="sec"><h3>추적 <span class="xs" style="text-transform:none;font-weight:500">점검 ${esc(tr.checked || "")}</span></h3>${trackingHtml(tr, null)}</div>
      <div class="xs mute">추적기에만 등록된 건입니다. 11:10 동기화 뒤 단계·판정·일정을 편집할 수 있습니다.${tr.url ? ` · <a href="${esc(tr.url)}" target="_blank" rel="noopener">나라장터 ↗</a>` : ""}</div></div>`;
  }
  const an = state.analyses[id] || {}; const days = Object.keys(an).sort(); const latest = days.length ? an[days[days.length - 1]] : null;
  const logs = Object.values(state.log[id] || {}).sort((a, b) => (b.t || "").localeCompare(a.t || ""));
  const ms = milestones(o); const next = ms.find(m => m.dday >= 0) || ms[ms.length - 1];
  const tracked = tr || o.track?.status;
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
      <div class="small" style="margin-top:8px">${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">나라장터 ↗</a>` : "<span class=\"mute\">나라장터 링크 없음</span>"} · <a href="${LINKS.tracking}">추적 현황</a> · <a href="${LINKS.competitors}">경쟁사 원장</a></div>
      ${o.stageBy === "auto" ? `<div class="xs mute" style="margin-top:6px">단계는 동기화가 자동 추정한 값입니다. 바꾸면 이후 자동 갱신에서 덮이지 않습니다.</div>` : ""}
    </div>
    <div class="sec"><h3>일정 <span class="xs h3m">${next ? `${next.dday >= 0 ? "다음" : "마지막"} ${esc(next.label)} ${ddayBadge(next.dday)}` : "등록된 이정표 없음"}</span></h3>
      <div class="date-grid">${MILESTONES.map(m => `<div><label>${esc(m.label)}</label><input type="datetime-local" value="${esc((o.dates?.[m.k] || "").replace(" ", "T").slice(0, 16))}" data-action="date" data-id="${esc(id)}" data-k="${m.k}"></div>`).join("")}</div>
    </div>
    <div class="sec"><h3>경쟁 구도 · 내정 가늠 <span class="xs h3m">원장 · 추적기 · 판정문 합산</span></h3>
      ${competitionHtml(state, id)}
    </div>
    <div class="sec"><h3>판정 ${latest ? `<span class="xs h3m">${esc(latest.ymd || days[days.length - 1])} · ${scoreBadge(latest.score)} ${esc(latest.verdict || "")} · ${latest.manual ? `${esc(latest.by || "담당")} 입력` : "AI 추천(일일 판정)"}${days.length > 1 ? ` · 이력 ${days.length}회` : ""}</span>` : ""}</h3>
      ${latest ? `${prose(latest.oneline)}
        ${scoreBars(latest.scores)}
        ${Array.isArray(latest.gates) && latest.gates.length ? `<details><summary>탈락요건 6항목 확인</summary><ul class="bullets">${latest.gates.map((g, i) => `<li><b>${esc(GATES[i] || "")}</b> — ${esc(g)}</li>`).join("")}</ul></details>` : ""}
        ${latest.edge ? `<details open><summary>승부처</summary>${prose(latest.edge)}</details>` : ""}
        ${latest.pros?.length ? `<details><summary>강점 ${latest.pros.length}</summary>${li(latest.pros)}</details>` : ""}
        ${latest.risks?.length ? `<details open><summary>리스크 ${latest.risks.length}</summary>${li(latest.risks)}</details>` : ""}
        ${latest.actions?.length ? `<details open><summary>액션 ${latest.actions.length}</summary>${li(latest.actions)}</details>` : ""}
        ${latest.docs?.length ? `<details><summary>분석 문서 ${latest.docs.length} (PC 프로젝트1 폴더)</summary>${li(latest.docs)}</details>` : ""}`
      : empty("아직 판정이 없습니다. 위 「판정 점수」에 점수를 넣거나 일일 판정 파일을 동기화하세요.")}
    </div>
    <div class="sec"><h3>추적 <span class="xs h3m">${tracked ? `점검 ${esc(tr?.checked || o.track?.checked || "")}` : "추적기 미등록"}</span></h3>
      ${tracked ? trackingHtml(tr, o) : `<div class="xs mute">추적기에 등록하려면 PC에서 <code>python 나라장터_추적.py add ${esc(id)}</code></div>`}
    </div>
    <div class="sec"><h3>로그 <span class="xs h3m">${logs.length}건</span></h3>
      <form class="noteform" data-action="note" data-id="${esc(id)}"><input name="text" placeholder="메모 · 통화 내용 · 결정 근거" autocomplete="off"><button class="btn primary sm" type="submit">기록</button></form>
      <div class="log" style="margin-top:10px">${logs.length ? logs.map(l => `<div class="it ${esc(l.type)}"><span class="t num">${esc((l.t || "").slice(5, 16))}</span><span>${esc(l.text)}<span class="xs mute"> · ${esc(l.by || "")}</span></span></div>`).join("") : `<div class="xs mute">기록 없음</div>`}</div>
    </div>
    <div class="xs mute">등록 ${esc(o.createdAt || "")} · 갱신 ${esc(o.updatedAt || "")} ${o.by ? `· ${esc(o.by)}` : ""} · 출처 ${esc((o.src || []).join(", "))}</div>
  </div>`;
}
