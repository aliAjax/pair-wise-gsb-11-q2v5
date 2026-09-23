// 持久化层：异常交接台状态的浏览器本地读写（localStorage）
// 只负责序列化/反序列化与种子数据，不含交接规则。

import { DEFAULT_OPERATOR, STORAGE_KEY, STORAGE_VERSION } from "../config/shiftConfig";
import { currentShiftState, shiftAt, shiftFromSeq } from "../rules/handover";
import type { Anomaly, DeskState, ShiftState } from "../data/types";

function isValidState(value: unknown): value is DeskState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<DeskState>;
  return (
    typeof state.version === "number" &&
    Array.isArray(state.anomalies) &&
    Array.isArray(state.handovers) &&
    typeof state.shift === "object" &&
    state.shift !== null &&
    typeof state.currentOperator === "object" &&
    state.currentOperator !== null
  );
}

/** 构造演示数据：含本班超期未销项、上一班带入项和已销项，覆盖三种典型状态 */
export function buildSeed(now: Date = new Date()): DeskState {
  const shift: ShiftState = currentShiftState(now);
  const prev = shiftFromSeq(shift.seq - 1);
  const iso = (date: Date) => date.toISOString();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);
  const hoursAhead = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

  const anomalies: Anomaly[] = [
    {
      id: "seed-1",
      equipment: "卸油口",
      area: "油罐区",
      description: "密封圈老化，接口处有油迹，需更换密封件",
      foundShiftSeq: shift.seq,
      foundShiftLabel: shift.label,
      foundAt: iso(hoursAgo(3)),
      currentShiftSeq: shift.seq,
      currentShiftLabel: shift.label,
      owner: "何鑫",
      deadline: iso(hoursAgo(1)),
      closed: false,
      carries: [],
    },
    {
      id: "seed-2",
      equipment: "1号加油机",
      area: "加油区",
      description: "油枪自封跳枪迟滞，连续加油后不自动停机",
      foundShiftSeq: prev.seq,
      foundShiftLabel: prev.label,
      foundAt: iso(new Date(prev.startedAt.getTime() + 2 * 3600 * 1000)),
      currentShiftSeq: shift.seq,
      currentShiftLabel: shift.label,
      owner: "李伟",
      deadline: iso(hoursAhead(6)),
      closed: false,
      carries: [
        {
          fromShiftSeq: prev.seq,
          fromShiftLabel: prev.label,
          toShiftSeq: shift.seq,
          toShiftLabel: shift.label,
          handedOverAt: iso(new Date(shift.startedAt)),
        },
      ],
    },
    {
      id: "seed-3",
      equipment: "灭火器",
      area: "收银区",
      description: "灭火器压力指针进入红区",
      foundShiftSeq: prev.seq,
      foundShiftLabel: prev.label,
      foundAt: iso(new Date(prev.startedAt.getTime() + 3 * 3600 * 1000)),
      currentShiftSeq: prev.seq,
      currentShiftLabel: prev.label,
      owner: "王芳",
      deadline: iso(new Date(prev.startedAt.getTime() + 8 * 3600 * 1000)),
      closed: true,
      resolution: "已更换同型号干粉灭火器，压力正常并贴复检标签",
      closedBy: "周站长",
      closedAsRole: "manager",
      closedAt: iso(new Date(new Date(shift.startedAt).getTime() + 1 * 3600 * 1000)),
      carries: [],
    },
  ];

  return {
    version: STORAGE_VERSION,
    currentOperator: { ...DEFAULT_OPERATOR },
    shift,
    anomalies,
    handovers: [
      {
        id: "seed-handover-1",
        at: iso(new Date(shift.startedAt)),
        operator: "周站长",
        fromShiftSeq: prev.seq,
        fromShiftLabel: prev.label,
        toShiftSeq: shift.seq,
        toShiftLabel: shift.label,
        carriedCount: 1,
        carriedIds: ["seed-2"],
      },
    ],
  };
}

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadState(storage: SimpleStorage = localStorage, now: Date = new Date()): DeskState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed(now);
      saveState(seed, storage);
      return seed;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      const seed = buildSeed(now);
      saveState(seed, storage);
      return seed;
    }
    return parsed;
  } catch {
    return buildSeed(now);
  }
}

export function saveState(state: DeskState, storage: SimpleStorage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 隐私模式或配额受限时静默失败，不影响当次操作
  }
}

export function clearState(storage: SimpleStorage = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略
  }
}

/** 交班后若应用跨班次重新打开，依据系统时间给出是否处于更新班次的提示信息 */
export function shiftDriftInfo(state: DeskState, now: Date = new Date()): { drifted: boolean; liveLabel: string } {
  const live = shiftAt(now);
  return { drifted: live.label !== state.shift.label, liveLabel: live.label };
}
