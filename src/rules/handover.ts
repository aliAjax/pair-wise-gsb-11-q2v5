import { SHIFT_LABEL } from "../data/catalog";
import type { HandoverIssue, IssueDraft, Operator, RuleResult, ShiftKind, ShiftRef } from "../data/types";

// ---------- 班次时间规则 ----------

const DAY_START_HOUR = 8;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 按时间换算所在班次：
 * 白班 08:00–20:00，夜班 20:00–次日 08:00。
 * 夜间跨过零点时，归属前一天的夜班。
 */
export function shiftAt(date: Date): ShiftRef {
  const hour = date.getHours();
  if (hour >= DAY_START_HOUR && hour < 20) {
    return { date: dateKey(date), kind: "day" };
  }
  const owner = new Date(date);
  if (hour < DAY_START_HOUR) owner.setDate(owner.getDate() - 1);
  return { date: dateKey(owner), kind: "night" };
}

export function nextShift(shift: ShiftRef): ShiftRef {
  if (shift.kind === "day") {
    return { date: shift.date, kind: "night" };
  }
  const d = new Date(`${shift.date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return { date: dateKey(d), kind: "day" };
}

export function shiftKey(shift: ShiftRef): string {
  return `${shift.date}-${shift.kind}`;
}

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** "09-23 周二 白班" */
export function formatShift(shift: ShiftRef): string {
  const d = new Date(`${shift.date}T00:00:00`);
  const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${md} ${WEEK[d.getDay()]} ${SHIFT_LABEL[shift.kind]}`;
}

export function shortShift(shift: ShiftRef): string {
  return `${shift.date.slice(5)} ${SHIFT_LABEL[shift.kind]}`;
}

// ---------- 交接规则 ----------

export function isOpen(issue: HandoverIssue): boolean {
  return issue.status === "open";
}

/** 同一设备是否已有未销项异常（设备名比较时忽略首尾空格） */
export function findOpenForEquipment(issues: HandoverIssue[], equipment: string): HandoverIssue | undefined {
  const name = equipment.trim();
  return issues.find((i) => isOpen(i) && i.equipment.trim() === name);
}

/** 登记前校验：同一设备已有未销项时不能再建一条 */
export function canRegister(issues: HandoverIssue[], draft: IssueDraft): RuleResult {
  if (!draft.equipment.trim()) return { ok: false, reason: "请填写设备名称" };
  if (!draft.area.trim()) return { ok: false, reason: "请选择区域" };
  if (!draft.description.trim()) return { ok: false, reason: "请描述异常情况" };
  if (!draft.owner.trim()) return { ok: false, reason: "请填写责任人" };
  if (Number.isNaN(Date.parse(draft.deadline))) return { ok: false, reason: "请填写复查时限" };
  if (new Date(draft.deadline).getTime() < Date.now()) {
    return { ok: false, reason: "复查时限不能早于当前时间" };
  }
  const existing = findOpenForEquipment(issues, draft.equipment);
  if (existing) {
    return { ok: false, reason: `「${existing.equipment.trim()}」已有未销项异常，请先处理或销项后再登记` };
  }
  return { ok: true };
}

export function createIssue(draft: IssueDraft, shift: ShiftRef): HandoverIssue {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    equipment: draft.equipment.trim(),
    area: draft.area,
    description: draft.description.trim(),
    foundShift: shift,
    currentShift: shift,
    owner: draft.owner.trim(),
    deadline: new Date(draft.deadline).toISOString(),
    status: "open",
    handoverCount: 0,
    createdAt: now
  };
}

/** 交班：所有未销项直接带到下一班，已销项不动 */
export function carryOver(issues: HandoverIssue[], from: ShiftRef, to: ShiftRef): HandoverIssue[] {
  return issues.map((i) =>
    i.status === "open" && shiftKey(i.currentShift) === shiftKey(from)
      ? { ...i, currentShift: to, handoverCount: i.handoverCount + 1 }
      : i
  );
}

// ---------- 时限规则 ----------

export function isOverdue(issue: HandoverIssue, now: Date = new Date()): boolean {
  return issue.status === "open" && new Date(issue.deadline).getTime() < now.getTime();
}

/** 超过时限仍然排在待处理里；返回相对时限的文案与状态 */
export function deadlineState(issue: HandoverIssue, now: Date = new Date()): { label: string; tone: "overdue" | "soon" | "normal" } {
  if (issue.status === "closed") return { label: "已销项", tone: "normal" };
  const diffMs = new Date(issue.deadline).getTime() - now.getTime();
  if (diffMs < 0) return { label: `超期 ${formatDuration(-diffMs)}`, tone: "overdue" };
  if (diffMs < 2 * 60 * 60 * 1000) return { label: `剩余 ${formatDuration(diffMs)}`, tone: "soon" };
  return { label: `剩余 ${formatDuration(diffMs)}`, tone: "normal" };
}

export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时${mins % 60 ? `${mins % 60}分` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days}天${hours % 24 ? `${hours % 24}小时` : ""}`;
}

// ---------- 销项规则 ----------

/** 责任人本人或站长可以销项 */
export function canClose(issue: HandoverIssue, operator: Operator): boolean {
  if (issue.status !== "open") return false;
  return operator.role === "manager" || operator.name === issue.owner;
}

export function closeIssue(
  issue: HandoverIssue,
  operator: Operator,
  resolution: string,
  now: Date = new Date()
): RuleResult & { issue?: HandoverIssue } {
  if (issue.status === "closed") return { ok: false, reason: "该异常已销项" };
  if (!canClose(issue, operator)) return { ok: false, reason: "只有责任人本人或站长可以销项" };
  const note = resolution.trim();
  if (note.length < 2) return { ok: false, reason: "销项前请填写处理说明（至少 2 个字）" };
  return {
    ok: true,
    issue: {
      ...issue,
      status: "closed",
      resolution: note,
      closedBy: operator.name,
      closedAt: now.toISOString()
    }
  };
}

/** 待处理排序：超期优先，其次按复查时限升序 */
export function sortOpen(issues: HandoverIssue[], now: Date = new Date()): HandoverIssue[] {
  return [...issues].sort((a, b) => {
    const ao = isOverdue(a, now) ? 0 : 1;
    const bo = isOverdue(b, now) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
}

export function shiftKindLabel(kind: ShiftKind): string {
  return SHIFT_LABEL[kind];
}
