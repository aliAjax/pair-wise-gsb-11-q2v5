// 数据层：油站区域与设备目录（仅提供候选清单，可手工录入其他设备）

import type { Area, DeadlinePreset } from "./types";

export const AREAS: Area[] = [
  {
    name: "加油区",
    equipment: ["1号加油机", "2号加油机", "3号加油机", "4号加油机", "加油枪", "静电接地夹"],
  },
  {
    name: "油罐区",
    equipment: ["1号储油罐", "2号储油罐", "卸油口", "呼吸阀", "量油孔", "密封围堰"],
  },
  {
    name: "收银区",
    equipment: ["收银台", "监控主机", "消防沙箱", "灭火器"],
  },
];

/** 候选责任人 */
export const STAFF = ["何鑫", "李伟", "王芳", "赵强"];

/** 站长（可跨责任人销项） */
export const MANAGERS = ["周站长"];

/** 复查时限快捷项 */
export const DEADLINE_PRESETS: DeadlinePreset[] = [
  { key: "2h", label: "2小时内", ms: 2 * 60 * 60 * 1000 },
  { key: "shift", label: "本班结束前", ms: 12 * 60 * 60 * 1000 },
  { key: "24h", label: "24小时内", ms: 24 * 60 * 60 * 1000 },
];

export function areaNames(): string[] {
  return AREAS.map((area) => area.name);
}

export function equipmentOf(area: string): string[] {
  return AREAS.find((item) => item.name === area)?.equipment ?? [];
}
