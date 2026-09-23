import { useCallback, useEffect, useMemo, useState } from "react";
import type { HandoverIssue, IssueDraft, Operator, RuleResult, ShiftRef } from "../data/types";
import {
  canRegister,
  carryOver,
  closeIssue,
  createIssue,
  nextShift,
  shiftAt,
  shiftKey
} from "../rules/handover";
import { loadIssues, loadOperator, saveIssues, saveOperator } from "../storage/repo";

const SHIFT_MARKER_KEY = "dfwlfront-10-shift";

function loadShiftMarker(): ShiftRef | null {
  const raw = localStorage.getItem(SHIFT_MARKER_KEY);
  if (!raw) return null;
  const [date, kind] = raw.split(":");
  if (date && (kind === "day" || kind === "night")) return { date, kind };
  return null;
}

function saveShiftMarker(shift: ShiftRef) {
  localStorage.setItem(SHIFT_MARKER_KEY, `${shift.date}:${shift.kind}`);
}

/** 若真实班次已超过记录的班次，自动逐班带入未销项（页面长期打开也生效） */
function catchUpShift(issues: HandoverIssue[], marker: ShiftRef | null): { issues: HandoverIssue[]; shift: ShiftRef } {
  const real = shiftAt(new Date());
  let current = marker ?? real;
  let next = issues;
  let guard = 0;
  while (shiftKey(current) !== shiftKey(real) && guard < 8) {
    next = carryOver(next, current, nextShift(current));
    current = nextShift(current);
    guard += 1;
  }
  if (marker && shiftKey(marker) !== shiftKey(current)) saveIssues(next);
  saveShiftMarker(current);
  return { issues: next, shift: current };
}

export function useHandoverDesk() {
  const initial = useMemo(() => {
    const issues = loadIssues();
    return catchUpShift(issues, loadShiftMarker());
    // 仅初始化时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [issues, setIssues] = useState<HandoverIssue[]>(initial.issues);
  const [shift, setShift] = useState<ShiftRef>(initial.shift);
  const [now, setNow] = useState(() => new Date());
  const [operator, setOperatorState] = useState<Operator | null>(() => loadOperator());

  // 每 30 秒刷新一次，超期倒计时随之更新
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
      const real = shiftAt(new Date());
      setShift((prev) => {
        if (shiftKey(prev) === shiftKey(real)) return prev;
        const caught = catchUpShift(issues, prev);
        setIssues(caught.issues);
        return caught.shift;
      });
    }, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [issues]);

  const persist = useCallback((next: HandoverIssue[]) => {
    setIssues(next);
    saveIssues(next);
  }, []);

  const register = useCallback(
    (draft: IssueDraft): RuleResult => {
      const check = canRegister(issues, draft);
      if (!check.ok) return check;
      const issue = createIssue(draft, shift);
      persist([issue, ...issues]);
      return { ok: true };
    },
    [issues, persist, shift]
  );

  const handover = useCallback(() => {
    const to = nextShift(shift);
    persist(carryOver(issues, shift, to));
    setShift(to);
    saveShiftMarker(to);
    return to;
  }, [issues, persist, shift]);

  const close = useCallback(
    (id: string, resolution: string): RuleResult => {
      if (!operator) return { ok: false, reason: "请先在右上角选择当前操作人" };
      const target = issues.find((i) => i.id === id);
      if (!target) return { ok: false, reason: "未找到该异常记录" };
      const result = closeIssue(target, operator, resolution);
      if (!result.ok || !result.issue) return result;
      persist(issues.map((i) => (i.id === id ? result.issue! : i)));
      return { ok: true };
    },
    [issues, operator, persist]
  );

  const setOperator = useCallback((next: Operator | null) => {
    setOperatorState(next);
    if (next) saveOperator(next);
    else localStorage.removeItem("dfwlfront-10-operator");
  }, []);

  return { issues, shift, now, operator, setOperator, register, handover, close };
}
