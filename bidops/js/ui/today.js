// 「오늘」 — 첫 화면. 마감이 먼저, 그다음 변경 알림, 그다음 신규 공고(아직 검토 등록 안 한 건).
import { oppsArray, dueList, groupByDay, recentChanges, recentJudged, inboxItems, isActive, fmtDate, fmtWon, dday } from "../derive.js";
import { esc, oppRow, chipAxis, chipKind, ddayBadge, empty } from "./components.js";

export function render(state) {
  const opps = oppsArray(state);
  const week = dueList(opps, 0, 7), later = dueList(opps, 8, 30), changes = recentChanges(opps, 3), inbox = inboxItems(state), judged = recentJudged(opps, 7);
  const active = opps.filter(o => isActive(o) && ["go", "submitted"].includes(o.stage)).length;
  const review = opps.filter(o => o.stage === "review").length;
  const overdue = dueList(opps, -3650, -1).filter(x => x.ms.k === "submit" && ["go", "review"].includes(x.opp.stage)).length;
  const kpi = [
    ["#/pipeline", week.length, "이번 주 마감", week.some(x => x.ms.dday <= 1) ? "warn" : ""],
    ["#/pipeline", active, "참여·작성·제출 중", ""],
    ["#/pipeline", review, "검토 대기", ""],
    ["#/today", inbox.length, "신규 공고 (검토 전)", ""],
  ];
  return `
  <div class="page-h"><div><h1>오늘</h1><div class="sub">${esc(fmtDate(new Date().toISOString().slice(0, 10)))} · 마감 → 변경 → 새 후보 순</div></div>
    <div class="toolbar"><a class="btn sm" href="#/calendar">캘린더</a>${overdue ? `<span class="chip" style="color:var(--red);background:var(--red-2)">마감 지났는데 검토 중 ${overdue}건</span>` : ""}</div></div>
  <div class="grid kpi" style="margin-bottom:16px">${kpi.map(([h, n, l, c]) => `<a class="card kpi-tile ${c}" href="${h}"><b class="num">${n}</b><span>${l}</span></a>`).join("")}</div>
  <div class="grid two">
    <div>
      <div class="card" style="margin-bottom:16px"><div class="hd"><h2>최근 판정</h2><span class="cnt">7일 이내 AI 판정 ${judged.length}건 · 점수순 · 마감이 멀어도 표시 · 「AI 추천」 = 일일 판정, 「입력」 = 팀원 수기</span></div><div class="bd">
        ${judged.length ? `<div class="rows">${judged.slice(0, 8).map(o => oppRow(o)).join("")}</div>${judged.length > 8 ? `<div class="xs mute" style="margin-top:8px">상위 8건 · 나머지는 파이프라인 「검토」</div>` : ""}` : empty("최근 7일 판정이 없습니다")}
      </div></div>
      <div class="card"><div class="hd"><h2>이번 주 마감</h2><span class="cnt">7일 이내 ${week.length}건</span></div><div class="bd">
        ${week.length ? groupByDay(week).map(([d, its]) => `<div class="daygroup"><h3>${esc(fmtDate(d))}</h3><div class="rows">${its.map(x => oppRow(x.opp, x.ms)).join("")}</div></div>`).join("") : empty("7일 이내 마감이 없습니다")}
      </div></div>
      <div class="card" style="margin-top:16px"><div class="hd"><h2>다가오는 마감</h2><span class="cnt">8~30일 ${later.length}건</span></div><div class="bd">
        ${later.length ? `<div class="rows">${later.map(x => oppRow(x.opp, x.ms)).join("")}</div>` : empty("30일 이내 예정된 이정표가 없습니다")}
      </div></div>
    </div>
    <div>
      <div class="card"><div class="hd"><h2>변경 알림</h2><span class="cnt">최근 3일 추적기</span></div><div class="bd">
        ${changes.length ? `<div class="rows">${changes.map(o => `<div class="row" data-open="${esc(o.id)}"><div class="d">${ddayBadge(dday(o.dates?.submit), "제안서")}</div>
          <div><div class="t">${esc(o.name)}</div><div class="m" style="color:var(--red)">${esc(o.track.changes[0])}${o.track.changes.length > 1 ? ` 외 ${o.track.changes.length - 1}` : ""}</div></div></div>`).join("")}</div>` : empty("추적기가 감지한 변경이 없습니다 (재공고·취소·개찰은 여기 뜹니다)")}
      </div></div>
      <div class="card" style="margin-top:16px"><div class="hd"><h2>신규 공고</h2><span class="cnt">아직 검토 등록 안 한 ${inbox.length}건 · 나라장터 수집 ${esc(state.nara?.meta?.updatedAt || "-")}</span></div><div class="bd">
        ${inbox.length ? `<div class="rows">${inbox.slice(0, 12).map(c => `<div class="row" style="cursor:default"><div class="d">${ddayBadge(dday(c.deadline), c.dlLabel)}</div>
          <div><div class="t"><a href="${esc(c.url || "#")}" target="_blank" rel="noopener">${esc(c.name)}</a></div><div class="m">${chipAxis(c.axis)}${chipKind(c.kind)}<span>${esc(c.dem || c.org)}</span><span class="num">${esc(c.amount || fmtWon(c.budget))}</span></div></div>
          <div class="r"><button class="btn sm" data-action="inbox-add" data-no="${esc(c.no)}">검토 등록</button></div></div>`).join("")}</div>
          ${inbox.length > 12 ? `<div class="xs mute" style="margin-top:8px">상위 12건만 표시 · 나머지는 팀 현황보드 「오늘의 나라장터」</div>` : ""}` : empty("새로 뜬 공고가 없습니다 · 나라장터 수집은 매일 11:00")}
      </div></div>
    </div>
  </div>`;
}
