// 라우터 + 이벤트 위임. 뷰는 HTML만 만들고, 여기서 data-action 을 store.actions 로 연결한다.
import { MEMBERS } from "./config.js";
import { state, subscribe, init, setUser, actions } from "./store.js";
import { ymd, inboxItems } from "./derive.js";
import * as today from "./ui/today.js";
import * as pipeline from "./ui/pipeline.js";
import * as calendar from "./ui/calendar.js";
import * as axis from "./ui/axis.js";
import * as detail from "./ui/detail.js";
import { openDrawer, closeDrawer, toast, esc } from "./ui/components.js";

const ROUTES = { today, pipeline, calendar, axis };
const ui = { calMonth: ymd().slice(0, 7), showExtra: false, axisFilter: "", q: "" };
const $ = s => document.querySelector(s);

function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const m = h.match(/^opp\/(.+)$/);
  if (m) return { view: ui.lastView || "today", opp: decodeURIComponent(m[1]) };
  return { view: ROUTES[h] ? h : "today", opp: null };
}
function render() {
  const r = route(); ui.lastView = r.view;
  document.querySelectorAll(".tabs a").forEach(a => a.classList.toggle("on", a.dataset.view === r.view));
  const main = $("main");
  if (state.error) main.innerHTML = `<div class="card"><div class="bd" style="color:var(--red)">데이터 연결 실패: ${esc(state.error)}</div></div>`;
  else if (!state.ready) main.innerHTML = `<div class="empty">불러오는 중…</div>`;
  else main.innerHTML = ROUTES[r.view].render(state, ui);
  if (r.opp && state.ready) { const sc = $("#drawer .db")?.scrollTop; openDrawer(detail.render(state, r.opp)); if (sc) $("#drawer .db").scrollTop = sc; } else closeDrawer();
  const m = state.meta || {};
  $("#meta").textContent = m.updatedAt ? `동기화 ${m.updatedAt}` : "";
  const who = $("#who"); if (who.value !== state.user) who.value = state.user;
}
function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }
function open(id) { go(`#/opp/${encodeURIComponent(id)}`); }
function close() { go(`#/${ui.lastView || "today"}`); }

document.addEventListener("click", e => {
  const el = e.target.closest("[data-open],[data-action]"); if (!el) return;
  if (el.dataset.open) { if (e.target.closest("a")) return; open(el.dataset.open); return; }
  const a = el.dataset.action, v = el.dataset.v;
  if (a === "close") close();
  else if (a === "cal") { if (v === "0") ui.calMonth = ymd().slice(0, 7); else { const [y, m] = ui.calMonth.split("-").map(Number); const d = new Date(y, m - 1 + Number(v), 1); ui.calMonth = ymd(d).slice(0, 7); } render(); }
  else if (a === "extra") { ui.showExtra = v === "1"; render(); }
  else if (a === "axis-go") { ui.axisFilter = v; go("#/pipeline"); }
  else if (a === "inbox-add") { const it = inboxItems(state).find(c => c.no === el.dataset.no); if (it) { const id = actions.addFromInbox(it); toast("검토 단계로 등록했습니다"); open(id); } }
  else if (a === "new") { const name = prompt("사업명을 입력하세요"); const id = actions.createManual(name); if (id) open(id); }
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-action]"); if (!el) return;
  const a = el.dataset.action, id = el.dataset.id, v = el.value;
  if (a === "stage") { actions.setStage(id, v); toast("단계 변경"); }
  else if (a === "outcome") { actions.setOutcome(id, v); toast("결과 기록"); }
  else if (a === "owner") actions.setOwner(id, v);
  else if (a === "axis") { actions.setAxis(id, v); toast("축 변경"); }
  else if (a === "ours") actions.setField(id, "ours", v ? true : null);
  else if (a === "score") { actions.setScore(id, v); toast("판정 저장"); }
  else if (a === "date") { actions.setDate(id, el.dataset.k, v ? v.replace("T", " ") : ""); toast("일정 저장"); }
  else if (a === "axis-filter") { ui.axisFilter = v; render(); }
  else if (a === "who") setUser(v);
});
document.addEventListener("input", e => { const el = e.target.closest("[data-action=search]"); if (el) { ui.q = el.value; const pos = el.selectionStart; render(); const n = $("[data-action=search]"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-action=note]"); if (!f) return; e.preventDefault();
  actions.addNote(f.dataset.id, f.text.value); f.text.value = ""; toast("기록했습니다");
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && location.hash.startsWith("#/opp/")) close(); });
$("#backdrop").addEventListener("click", close);
window.addEventListener("hashchange", render);

$("#who").innerHTML = `<option value="">담당자</option>${MEMBERS.map(m => `<option>${esc(m)}</option>`).join("")}`;
subscribe(render);
init();
render();
