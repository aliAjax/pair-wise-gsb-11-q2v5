import { buildSeedIssues } from "../data/seed";
import type { HandoverIssue, Operator, ShiftRef } from "../data/types";
import { shiftAt } from "../rules/handover";

export const STORAGE_KEY = "dfwlfront-10-handover-v1";
const LEGACY_KEY = "dfwlfront-10-inspection";
const OPERATOR_KEY = "dfwlfront-10-operator";

function isShiftRef(value: unknown): value is ShiftRef {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.date === "string" && (v.kind === "day" || v.kind === "night");
}

function isIssue(value: unknown): value is HandoverIssue {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.equipment === "string" &&
    typeof v.area === "string" &&
    typeof v.description === "string" &&
    isShiftRef(v.foundShift) &&
    isShiftRef(v.currentShift) &&
    typeof v.owner === "string" &&
    typeof v.deadline === "string" &&
    (v.status === "open" || v.status === "closed") &&
    typeof v.handoverCount === "number" &&
    typeof v.createdAt === "string"
  );
}

/**
 * 旧版「巡检清单」迁移：异常项转为未销项交接记录，
 * 正常/未检项不进入交接台；迁移后移除旧 key。
 */
function migrateLegacy(): HandoverIssue[] | null {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  let legacy: unknown;
  try {
    legacy = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(legacy)) return null;

  const shift = shiftAt(new Date());
  const issues: HandoverIssue[] = [];
  for (const [index, item] of legacy.entries()) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (rec.status !== "异常") continue;
    const equipment = typeof rec.item === "string" ? rec.item : "";
    if (!equipment) continue;
    const foundShift: ShiftRef =
      typeof rec.checkedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rec.checkedAt)
        ? { date: rec.checkedAt, kind: "day" }
        : shift;
    issues.push({
      id: typeof rec.id === "string" ? rec.id : `legacy-${index + 1}`,
      equipment,
      area: typeof rec.area === "string" ? rec.area : "加油区",
      description: typeof rec.notes === "string" && rec.notes ? rec.notes : "由旧巡检清单迁移的异常项",
      foundShift,
      currentShift: shift,
      owner: typeof rec.inspector === "string" && rec.inspector ? rec.inspector : "未指派",
      deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      status: "open",
      handoverCount: 0,
      createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString()
    });
  }
  localStorage.removeItem(LEGACY_KEY);
  return issues;
}

export function loadIssues(): HandoverIssue[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isIssue);
    } catch {
      // 数据损坏时回落到空列表
    }
    return [];
  }

  if (typeof localStorage !== "undefined") {
    const migrated = migrateLegacy();
    if (migrated) {
      // 立即落盘，避免迁移后旧 key 已删除、重复加载时丢失结果
      saveIssues(migrated);
      return migrated;
    }
  }
  return buildSeedIssues();
}

export function saveIssues(issues: HandoverIssue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

export function loadOperator(): Operator | null {
  const raw = localStorage.getItem(OPERATOR_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { name?: unknown; role?: unknown };
    if (typeof v.name === "string" && v.name && (v.role === "manager" || v.role === "staff")) {
      return { name: v.name, role: v.role };
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveOperator(operator: Operator): void {
  localStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
}
