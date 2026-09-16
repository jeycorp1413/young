// 추적 — 등록해 둔 공고·사전규격·이름 감시 건의 상태 (재공고·취소 → 개찰 → 낙찰 → 계약)와 눈여겨볼 점
import { TRACK_KIND } from "../config.js";
import { trackingRows, trackCls, trackFilter, trackSort, dday } from "../derive.js";
import { esc, ddayBadge, empty } from "./components.js";

const STATUS_LABEL = { done: "개찰·낙찰 완료", open: "공고 중", wait: "본공고 대기" };

export function render(state, ui) {
  const all = trackingRows(state);
  const rows = trackSort(trackFilter(all.slice(), ui.trackFilter));
  const m = state.tracking?.meta || {};
  const n = k => all.filter(r => trackCls(r) === k).length;
  const kpi = [
    ["all", all.length, "등록 건"], ["ours", all.filter(r => r.ours).length, "★ 당사 참여"], ["open", n("open"), "공고 중"],
    ["done", n("done"), "개찰·낙찰 완료"], ["wait", n("wait"), "사전규격·이름 감시"], ["changed", all.filter(r => (r.changes || []).length).length, "지난 점검과 달라짐"],
  ];
  if (!all.length) return `<div class="page-h"><div><h1>추적</h1></div></div>${empty("추적기 데이터가 아직 없습니다 · PC 예약작업 08:40 이후 표시됩니다")}`;
  return `
  <div class="page-h"><div><h1>추적</h1><div class="sub">점검 ${esc(m.updatedAt || "-")} · ${esc(m.schedule || "")} · 등록한 건의 재공고·취소·개찰·낙찰·계약을 매일 확인합니다</div></div>
    <div class="toolbar"><a class="btn sm" href="#/competitors">경쟁사 원장 →</a></div></div>
  <div class="grid kpi" style="grid-template-columns:repeat(6,minmax(0,1fr));margin-bottom:16px">${kpi.map(([k, v, l]) => `<div class="card kpi-tile ${ui.trackFilter === k ? "on" : ""} ${k === "changed" && v ? "warn" : ""}" data-action="track-filter" data-v="${k}"><b class="num">${v}</b><span>${l}</span></div>`).join("")}</div>
  <div class="card"><div class="hd"><h2>추적 현황</h2><span class="cnt">${rows.length}건 표시 · ★ 노란 행 = 당사 참여 · 빨간 글씨 = 지난 점검과 달라진 것</span></div><div class="bd">
    <div class="tbl"><table class="stack"><thead><tr><th>구분</th><th>사업</th><th>기관</th><th>예산</th><th>개찰</th><th>상태</th><th>참가</th><th>1위·낙찰</th><th>눈여겨볼 점</th></tr></thead><tbody>
    ${rows.map(r => { const c = trackCls(r); const d = dday(r.open);
      return `<tr class="${r.ours ? "ours" : ""}" data-open="${esc(r.id)}">
        <td data-l="구분"><span class="chip">${esc(TRACK_KIND[r.kind] || r.kind)}</span>${r.ours ? ' <span class="ours xs">★ 당사</span>' : ""}</td>
        <td data-l="사업" class="full"><b>${esc(r.name || r.memo)}</b><div class="xs mute num">${esc(r.bid_no || r.no)}${r.kind === "kw" && r.bid_no ? ` · ${esc(r.no)}` : ""}</div></td>
        <td data-l="기관">${esc(r.org || "")}</td>
        <td data-l="예산" class="num">${esc(r.budget_fmt === "-" ? "" : r.budget_fmt || "")}</td>
        <td data-l="개찰" class="num">${r.open ? `${esc(String(r.open).slice(0, 10))} ${c === "open" ? ddayBadge(d, "개찰") : ""}` : ""}</td>
        <td data-l="상태"><span class="st ${c}">${esc(r.status)}</span>${(r.changes || []).length ? `<div class="chg">${esc(r.changes[0])}${r.changes.length > 1 ? ` 외 ${r.changes.length - 1}` : ""}</div>` : ""}</td>
        <td data-l="참가" class="num">${r.n_part == null ? "" : esc(r.n_part)}</td>
        <td data-l="1위·낙찰">${esc(r.winner || "")}</td>
        <td data-l="눈여겨볼 점" class="sig">${(r.signals || []).map(esc).join(" / ")}</td>
      </tr>`; }).join("")}
    </tbody></table></div>
  </div></div>
  <div class="xs mute" style="margin-top:10px">구분 — 본공고: 나라장터 공고 · 사전규격: 본공고 전 단계(의견 제출 업체 확인) · 이름 감시: 사업명으로 본공고 등록을 기다리는 건 · 국방 D2B: 국방전자조달(나라장터 밖). 눈여겨볼 점은 단독 응찰, 1·2위 격차, 낙찰률, 규격의견 제출사 = 낙찰자 같은 내정 의심 신호입니다. 행을 누르면 참가업체·점수·의견 제출사가 열립니다.</div>`;
}
