// 경쟁사 — 개찰 상세·낙찰·수의계약을 누적한 경쟁사 지도. "누가 어느 분야에 어떤 점수로 들어오는가"
import { LEDGER_TAGS } from "../config.js";
import { ledgerCorps, ledgerBids } from "../derive.js";
import { esc, empty } from "./components.js";

export function render(state, ui) {
  const L = state.tracking?.ledger;
  if (!L || L.error) return `<div class="page-h"><div><h1>경쟁사</h1></div></div>${empty(L?.error ? "원장 오류: " + L.error : "경쟁사 원장이 아직 없습니다")}`;
  const corps = ledgerCorps(state, ui.ledgerTag, ui.ledgerQ);
  const bids = ledgerBids(state);
  const fmtN = v => (v == null || v === "") ? "" : Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  const cell = (b, i) => { const p = (b.parts || [])[i]; return p ? `${esc(p.corp)}${p.total ? ` <span class="xs mute num">${fmtN(p.total)}</span>` : ""}` : ""; };
  const tagsAll = LEDGER_TAGS.filter(t => (L.corps || []).some(c => (c.tags || []).includes(t)));
  return `
  <div class="page-h"><div><h1>경쟁사</h1><div class="sub">사업 ${L.n_bids}건 · 업체 ${L.n_corps}개 · 기록 ${L.n_records}건 — 개찰 참가업체·점수, 낙찰 목록, 수의계약을 누적한 경쟁사 지도</div></div>
    <div class="toolbar"><input class="searchbox" type="search" placeholder="업체·발주기관·사업명 검색" value="${esc(ui.ledgerQ)}" data-action="ledger-q"><a class="btn sm" href="#/tracking">추적 현황 →</a></div></div>
  <div class="card" style="margin-bottom:16px"><div class="hd"><h2>분야별 자주 만나는 업체</h2><span class="cnt">표기 = 참가 사업 수 / 1위·낙찰 수 · 평균 기술점수</span></div><div class="bd">
    ${tagsAll.map(t => { const top = (L.corps || []).filter(c => (c.tags || []).includes(t)).slice(0, 8);
      return `<div class="axis"><b>${esc(t)}</b>${top.map(c => `<span>${esc(c.corp)} ${c.n}/${c.wins}${c.tech ? ` · ${c.tech}` : ""}</span>`).join("")}</div>`; }).join("")}
    <div class="xs mute" style="margin-top:6px">분야는 사업명 키워드로 자동 분류됩니다. 한 업체가 여러 분야에 나올 수 있습니다.</div>
  </div></div>
  <div class="card" style="margin-bottom:16px"><div class="hd"><h2>업체별</h2><span class="cnt">${corps.length}개 표시</span></div><div class="bd">
    <div class="chips" style="margin-bottom:10px">${[["", "전체"], ...tagsAll.map(t => [t, t])].map(([k, l]) => `<span class="chip" style="cursor:pointer;${ui.ledgerTag === k ? "background:var(--ink);color:var(--card)" : ""}" data-action="ledger-tag" data-v="${esc(k)}">${esc(l)}</span>`).join("")}</div>
    ${corps.length ? `<div class="tbl"><table class="stack"><thead><tr><th>업체</th><th>참가 사업</th><th>1위·낙찰</th><th>평균 기술</th><th>분야</th><th>주요 발주기관</th><th>최근 사업</th><th>수의·현행</th></tr></thead><tbody>
      ${corps.map(c => `<tr><td data-l="업체" class="full"><b>${esc(c.corp)}</b></td><td data-l="참가 사업" class="num">${c.n}</td><td data-l="1위·낙찰" class="num">${c.wins}</td><td data-l="평균 기술" class="num">${c.tech ?? ""}</td>
        <td data-l="분야">${(c.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join(" ")}</td><td data-l="발주기관">${(c.orgs || []).map(esc).join(", ")}</td><td data-l="최근 사업" class="small">${(c.recent || []).map(esc).join(" / ")}</td><td data-l="수의·현행">${c.sole ? `${c.sole}건` : ""}</td></tr>`).join("")}
    </tbody></table></div>` : empty("조건에 맞는 업체가 없습니다")}
  </div></div>
  <div class="card"><div class="hd"><h2>개찰 결과 (점수 공개 사업)</h2><span class="cnt">${bids.length}건 · 협상계약 개찰 상세가 등록된 사업</span></div><div class="bd">
    ${bids.length ? `<div class="tbl"><table class="stack"><thead><tr><th>개찰</th><th>사업</th><th>기관</th><th>예산</th><th>참가</th><th>1위</th><th>2위</th><th>3위</th><th>당사</th></tr></thead><tbody>
      ${bids.map(b => `<tr class="${b.ours ? "ours" : ""}" data-open="${esc(b.no)}"><td data-l="개찰" class="num">${esc(b.open || "")}</td><td data-l="사업" class="full"><b>${esc(b.name)}</b><div class="xs mute num">${esc(b.no)}</div></td><td data-l="기관">${esc(b.org)}</td><td data-l="예산" class="num">${esc(b.budget)}</td><td data-l="참가" class="num">${b.n}</td><td data-l="1위">${cell(b, 0)}</td><td data-l="2위">${cell(b, 1)}</td><td data-l="3위">${cell(b, 2)}</td><td data-l="당사">${b.ours ? "★" : ""}</td></tr>`).join("")}
    </tbody></table></div>` : empty("아직 점수가 공개된 개찰이 없습니다")}
    <div class="xs mute" style="margin-top:8px">행을 누르면 참가업체 전체 순위·기술·가격·종합 점수가 열립니다. 원장은 추적기가 개찰 상세를 잡을 때마다 자동으로 쌓입니다(경쟁사_원장.py).</div>
  </div></div>`;
}
