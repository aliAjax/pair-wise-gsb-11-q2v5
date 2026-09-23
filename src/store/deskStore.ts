// 状态层：用 Zustand 把规则层与持久化层串起来
// 页面只调用这里的动作，不直接碰 localStorage。

import { create } from "zustand";
import type { Anomaly, DeskState, HandoverEvent, Operator, RegisterInput } from "../data/types";
import { clearState, loadState, saveState } from "../storage/deskStorage";
import {
  catchUpToLive,
  closeAnomaly,
  handover,
  nextShift,
  registerAnomaly,
  shiftFromSeq,
} from "../rules/handover";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type CloseError = "empty-resolution" | "forbidden" | "already-closed";

type DeskStore = DeskState & {
  /** 初始化（含跨班次自动结转） */
  init: () => void;
  setOperator: (operator: Operator) => void;
  register: (input: RegisterInput) => { ok: true } | { ok: false; existing: Anomaly };
  /** 手动交班：未销项全部带到下一班 */
  doHandover: () => HandoverEvent;
  /** 销项：责任人或站长可操作，必须填写处理说明 */
  close: (id: string, resolution: string) => { ok: true } | { ok: false; reason: CloseError };
  resetDemo: () => void;
};

function persist(state: DeskState) {
  saveState(state);
}

export const useDeskStore = create<DeskStore>((set, get) => ({
  ...loadState(),

  init: () => {
    const state = get();
    const now = new Date();
    const result = catchUpToLive(state.anomalies, state.shift, state.currentOperator.name, now, uid);
    if (!result) return;
    const to = shiftFromSeq(result.event.toShiftSeq);
    const next: DeskState = {
      ...state,
      shift: { seq: to.seq, kind: to.kind, label: to.label, startedAt: to.startedAt.toISOString() },
      anomalies: result.anomalies,
      handovers: [...state.handovers, result.event],
    };
    persist(next);
    set(next);
  },

  setOperator: (operator) => {
    const next = { ...get(), currentOperator: operator };
    persist(next);
    set({ currentOperator: operator });
  },

  register: (input) => {
    const state = get();
    const result = registerAnomaly(state.anomalies, input, new Date(), uid);
    if (!result.ok) return { ok: false, existing: result.existing };
    const anomalies = [result.anomaly, ...state.anomalies];
    const next = { ...state, anomalies };
    persist(next);
    set({ anomalies });
    return { ok: true };
  },

  doHandover: () => {
    const state = get();
    const now = new Date();
    const result = handover(state.anomalies, state.shift, state.currentOperator.name, now, uid);
    const to = nextShift(state.shift);
    const nextState: DeskState = {
      ...state,
      shift: { ...state.shift, ...to },
      anomalies: result.anomalies,
      handovers: [...state.handovers, result.event],
    };
    persist(nextState);
    set(nextState);
    return result.event;
  },

  close: (id, resolution) => {
    const state = get();
    const result = closeAnomaly(state.anomalies, id, resolution, state.currentOperator, new Date());
    if (!result.ok) return { ok: false, reason: result.reason };
    const anomalies = state.anomalies.map((item) => (item.id === id ? result.anomaly : item));
    const next = { ...state, anomalies };
    persist(next);
    set({ anomalies });
    return { ok: true };
  },

  resetDemo: () => {
    clearState();
    set(loadState());
  },
}));
