// 데이터 계층 — Firebase 구독 + 액션. 화면은 여기 actions 로만 쓴다.
import { FIREBASE, NODE, FEED_NODE, STAGE_BY, verdictOf } from "./config.js";
import { keyOf, ymd } from "./derive.js";

export const state = { opps: {}, analyses: {}, log: {}, meta: {}, nara: {}, user: "", ready: false, error: null };
const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });

let db = null;
const nowIso = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const stamp = (o = {}) => Object.assign({ updatedAt: nowIso(), by: state.user || "?" }, o);

export function init() {
  try { state.user = localStorage.getItem("bidops_user") || ""; } catch (_) {}
  // 정적 주입(미리보기·테스트): window.__BIDOPS__ = {opps, analyses, log, meta}, window.__NARA__ = {items, meta}
  if (window.__BIDOPS__) {
    Object.assign(state, { opps: {}, analyses: {}, log: {}, meta: {} }, window.__BIDOPS__, { nara: window.__NARA__ || {}, ready: true, fixture: true });
    emit(); return;
  }
  if (!window.firebase) { state.error = "Firebase SDK 로드 실패"; emit(); return; }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE);
  db = firebase.database();
  db.ref(NODE).on("value", snap => {
    const v = snap.val() || {};
    state.opps = v.opps || {}; state.analyses = v.analyses || {}; state.log = v.log || {}; state.meta = v.meta || {};
    state.ready = true; state.error = null; emit();
  }, err => { state.error = err.message; state.ready = true; emit(); });
  db.ref(FEED_NODE).on("value", snap => { state.nara = snap.val() || {}; emit(); });
}
export function setUser(name) { state.user = name; try { localStorage.setItem("bidops_user", name); } catch (_) {} emit(); }

function ref(path) { return db.ref(`${NODE}/${path}`); }
function log(id, type, text) { return ref(`log/${id}`).push({ t: nowIso(), type, text, by: state.user || "?" }); }

export const actions = {
  setStage(id, stage) {
    const o = state.opps[id]; if (!o || o.stage === stage) return;
    ref(`opps/${id}`).update(stamp({ stage, stageBy: "user" }));
    log(id, "stage", `단계 ${STAGE_BY[o.stage]?.label || o.stage || "-"} → ${STAGE_BY[stage]?.label || stage}`);
  },
  setOutcome(id, outcome) {
    const patch = stamp({ outcome: outcome || null, stageBy: "user" });
    if (outcome) patch.stage = "result";
    ref(`opps/${id}`).update(patch);
    log(id, "decision", `결과 ${({ won: "낙찰", lost: "탈락", cancelled: "취소·유찰" })[outcome] || "미정"}`);
  },
  setOwner(id, owner) { ref(`opps/${id}`).update(stamp({ owner: owner || null })); },
  setAxis(id, axis) { ref(`opps/${id}`).update(stamp({ axis, axisBy: "user" })); },
  setDate(id, k, val) { ref(`opps/${id}/dates`).update({ [k]: val || null }); ref(`opps/${id}`).update(stamp()); },
  setField(id, field, val) { ref(`opps/${id}`).update(stamp({ [field]: val || null })); },
  setScore(id, score) {
    score = score === "" || score == null ? null : Math.max(0, Math.min(60, Number(score)));
    const verdict = verdictOf(score); const d = ymd();
    ref(`opps/${id}`).update(stamp({ latest: score == null ? null : { ymd: d, score, verdict, manual: true } }));
    if (score != null) { ref(`analyses/${id}/${d}`).update({ score, verdict, manual: true, by: state.user || "?" }); log(id, "decision", `판정 ${score}점 · ${verdict}`); }
  },
  addNote(id, text) { text = (text || "").trim(); if (!text) return; log(id, "note", text); ref(`opps/${id}`).update(stamp()); },
  addFromInbox(item) {
    const id = keyOf(item.no); if (!id || state.opps[id]) return id;
    const dates = {};
    if (item.deadline && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline)) dates[item.kind === "사전규격" ? "opinion" : "submit"] = item.deadline;
    ref(`opps/${id}`).set(stamp({
      name: item.name || "", org: item.org || "", dem: item.dem || "", kind: item.kind || "본공고", axis: item.axis || "기타", axisType: item.axisType || "",
      budget: Number(item.budget || 0), url: item.url || "", stage: "review", stageBy: "user", ours: false, dates, src: ["inbox"], createdAt: nowIso(),
    }));
    log(id, "stage", "신규 공고에서 검토 등록");
    return id;
  },
  createManual(name) {
    name = (name || "").trim(); if (!name) return null;
    const id = "M" + Date.now().toString(36);
    ref(`opps/${id}`).set(stamp({ name, org: "", kind: "수기", axis: "기타", budget: 0, stage: "review", stageBy: "user", dates: {}, src: ["manual"], createdAt: nowIso() }));
    log(id, "stage", "수기 등록");
    return id;
  },
};
