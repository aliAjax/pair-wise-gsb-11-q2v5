import type { Role, ShiftKind } from "./types";

/** 区域目录 */
export const AREAS = ["加油区", "油罐区", "收银区"] as const;

/** 各区域的常见设备（登记时作为候选，仍可手填其他设备） */
export const EQUIPMENT_BY_AREA: Record<string, string[]> = {
  加油区: ["加油机1号", "加油机2号", "加油枪胶管", "紧急切断阀", "静电释放柱"],
  油罐区: ["卸油口密封", "人孔井", "油罐液位仪", "静电接地报警器", "呼吸阀"],
  收银区: ["POS收银机", "监控主机", "灭火器", "应急照明"]
};

/** 责任人候选 */
export const STAFF_SUGGESTIONS = ["何鑫", "李坚", "周敏", "高志远"];

export const SHIFT_LABEL: Record<ShiftKind, string> = {
  day: "白班",
  night: "夜班"
};

export const ROLE_LABEL: Record<Role, string> = {
  manager: "站长",
  staff: "值班员"
};

/** 登记时复查时限的默认值：当前时间 +8 小时 */
export const DEFAULT_REVIEW_HOURS = 8;
