// 规则层：班次、重复登记校验、交班、销项、时限判断等纯函数
// 不接触 localStorage 与 React，便于单独推演与测试。

import {
  SHIFT_BOUNDARY_HOUR,
  SHIFT_DAY_START_HOUR,
  SHIFT_LENGTH_MS,
} from "../config/shiftConfig";
import type {
  Anomaly,
  CarryRecord,
  HandoverEvent,
  RegisterInput,
  ShiftKind,
  ShiftState,
} from "../data/types";

/** 20:00 交班的边界小时 */
export { SHIFT_BOUNDARY_HOUR, SHIFT_LENGTH_MS };

export type ShiftSnapshot = {
  kind: ShiftKind;
  label: string;
  /** 当前班次开始时间 */
  startedAt: Date;
  /** 当前班次结束时间 */
  endsAt: Date;
};

/** 由时间推算所属班次：08:00-20:00 白班，20:00-次日08:00 晚班 */
export function shiftAt(date: Date): ShiftSnapshot {
  const hour = date.getHours();
  const kind: ShiftKind = hour >= SHIFT_DAY_START_HOUR && hour < SHIFT_BOUNDARY_HOUR ? "day" : "night";
  const startedAt = new Date(date);
  if (kind === "day") {
    startedAt.setHours(SHIFT_DAY_START_HOUR, 0, 0, 0);
  } else if (hour >= SHIFT_BOUNDARY_HOUR) {
    startedAt.setHours(SHIFT_BOUNDARY_HOUR, 0, 0, 0);
  } else {
    // 凌晨时段属于前一晚 20:00 开始的晚班
    startedAt.setDate(startedAt.getDate() - 1);
    startedAt.setHours(SHIFT_BOUNDARY_HOUR, 0, 0, 0);
  }
  const endsAt = new Date(startedAt.getTime() + SHIFT_LENGTH_MS);
  return { kind, label: shiftLabel(kind, startedAt), startedAt, endsAt };
}

export function shiftLabel(kind: ShiftKind, startedAt: Date): string {
  const datePrefix = `${startedAt.getMonth() + 1}月${startedAt.getDate()}日`;
  return kind === "day" ? `${datePrefix}白班` : `${datePrefix}晚班`;
}

/** 当前班次序号：自 2026-01-01 起每班递增一次 */
export function shiftSeqAt(date: Date): number {
  const { startedAt } = shiftAt(date);
  return Math.floor((startedAt.getTime() - EPOCH_START.getTime()) / SHIFT_LENGTH_MS) + 1;
}

/** 由班次序号反推班次信息 */
export function shiftFromSeq(seq: number): { seq: number; kind: ShiftKind; label: string; startedAt: Date; endsAt: Date } {
  const startedAt = new Date(EPOCH_START.getTime() + (seq - 1) * SHIFT_LENGTH_MS);
  const kind: ShiftKind = seq % 2 === 1 ? "night" : "day";
  return { seq, kind, label: shiftLabel(kind, startedAt), startedAt, endsAt: new Date(startedAt.getTime() + SHIFT_LENGTH_MS) };
}

export function nextShift(shift: ShiftState): { seq: number; kind: ShiftKind; label: string; startedAt: string } {
  const next = shiftFromSeq(shift.seq + 1);
  return { seq: shift.seq + 1, kind: next.kind, label: next.label, startedAt: next.startedAt.toISOString() };
}

// 序号基准：2026-01-01 00:00 为第 1 个班次（凌晨，属于 2025-12-31 晚班），
// 这里以一个固定的晚班起点 2025-12-31 20:00 作为 seq=1。
export const EPOCH_START = new Date(2025, 11, 31, SHIFT_BOUNDARY_HOUR, 0, 0, 0);

/** 同一设备是否存在未销项异常（核心防重规则） */
export function findOpenForEquipment(anomalies: Anomaly[], equipment: string): Anomaly | undefined {
  const key = equipment.trim();
  return anomalies.find((item) => !item.closed && item.equipment.trim() === key);
}

export type RegisterResult =
  | { ok: true; anomaly: Anomaly }
  | { ok: false; reason: "duplicate"; existing: Anomaly };

/** 登记一条新异常；同设备有未销项时拒绝 */
export function registerAnomaly(
  anomalies: Anomaly[],
  input: RegisterInput,
  now: Date,
  genId: () => string
): RegisterResult {
  const equipment = input.equipment.trim();
  const existing = findOpenForEquipment(anomalies, equipment);
  if (existing) {
    return { ok: false, reason: "duplicate", existing };
  }
  const { label } = shiftAt(now);
  const seq = shiftSeqAt(now);
  const anomaly: Anomaly = {
    id: genId(),
    equipment,
    area: input.area,
    description: input.description.trim(),
    foundShiftSeq: seq,
    foundShiftLabel: label,
    foundAt: now.toISOString(),
    currentShiftSeq: seq,
    currentShiftLabel: label,
    owner: input.owner.trim(),
    deadline: new Date(input.deadlineAt).toISOString(),
    closed: false,
    carries: [],
  };
  return { ok: true, anomaly };
}

/** 交班：所有未销项直接带到下一班，返回新异常列表与交班事件 */
export function handover(
  anomalies: Anomaly[],
  shift: ShiftState,
  operator: string,
  now: Date,
  genId: () => string
): { anomalies: Anomaly[]; event: HandoverEvent } {
  return carryTo(anomalies, shift, shift.seq + 1, operator, now, genId);
}

/** 应用跨班次重新打开时，一次性把未销项追到当前实际班次（可能跨越多个班） */
export function catchUpToLive(
  anomalies: Anomaly[],
  shift: ShiftState,
  operator: string,
  now: Date,
  genId: () => string
): { anomalies: Anomaly[]; event: HandoverEvent } | null {
  const liveSeq = shiftSeqAt(now);
  if (liveSeq <= shift.seq) return null;
  return carryTo(anomalies, shift, liveSeq, operator, now, genId);
}

function carryTo(
  anomalies: Anomaly[],
  shift: ShiftState,
  toSeq: number,
  operator: string,
  now: Date,
  genId: () => string
): { anomalies: Anomaly[]; event: HandoverEvent } {
  const to = shiftFromSeq(toSeq);
  const carriedIds: string[] = [];
  const carryAt = now.toISOString();
  const nextAnomalies = anomalies.map((item) => {
    if (item.closed) return item;
    const carry: CarryRecord = {
      fromShiftSeq: item.currentShiftSeq,
      fromShiftLabel: item.currentShiftLabel,
      toShiftSeq: to.seq,
      toShiftLabel: to.label,
      handedOverAt: carryAt,
    };
    carriedIds.push(item.id);
    return {
      ...item,
      currentShiftSeq: to.seq,
      currentShiftLabel: to.label,
      carries: [...item.carries, carry],
    };
  });
  const event: HandoverEvent = {
    id: genId(),
    at: carryAt,
    operator,
    fromShiftSeq: shift.seq,
    fromShiftLabel: shift.label,
    toShiftSeq: to.seq,
    toShiftLabel: to.label,
    carriedCount: carriedIds.length,
    carriedIds,
  };
  return { anomalies: nextAnomalies, event };
}

export type CloseResult =
  | { ok: true; anomaly: Anomaly }
  | { ok: false; reason: "empty-resolution" | "forbidden" | "already-closed" };

/**
 * 销项：责任人本人或站长可销项，销项前必须填写处理说明。
 * 超过时限不影响销项，只作为超期标记继续展示。
 */
export function closeAnomaly(
  anomalies: Anomaly[],
  id: string,
  resolution: string,
  operator: { name: string; role: "staff" | "manager" },
  now: Date
): CloseResult {
  const target = anomalies.find((item) => item.id === id);
  if (!target) return { ok: false, reason: "already-closed" };
  if (target.closed) return { ok: false, reason: "already-closed" };
  if (operator.role !== "manager" && operator.name !== target.owner) {
    return { ok: false, reason: "forbidden" };
  }
  if (!resolution.trim()) return { ok: false, reason: "empty-resolution" };
  const closed: Anomaly = {
    ...target,
    closed: true,
    resolution: resolution.trim(),
    closedBy: operator.name,
    closedAsRole: operator.role,
    closedAt: now.toISOString(),
  };
  return { ok: true, anomaly: closed };
}

/** 超期但未销项：仍然排在待处理里，页面据此标红 */
export function isOverdue(anomaly: Anomaly, now: Date): boolean {
  return !anomaly.closed && new Date(anomaly.deadline).getTime() < now.getTime();
}

export function isOpen(anomaly: Anomaly): boolean {
  return !anomaly.closed;
}

/** 距离复查时限剩余毫秒（负数表示已超期） */
export function remainingMs(anomaly: Anomaly, now: Date): number {
  return new Date(anomaly.deadline).getTime() - now.getTime();
}

/** 当前班次初始状态（首次进入应用时） */
export function currentShiftState(now: Date): ShiftState {
  const { kind, label, startedAt } = shiftAt(now);
  return { startedAt: startedAt.toISOString(), seq: shiftSeqAt(now), kind, label };
}
