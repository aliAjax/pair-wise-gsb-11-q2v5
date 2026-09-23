import { shiftAt } from "../rules/handover";
import type { HandoverIssue } from "./types";

/** 首次打开时的演示数据：包含一条超期、已交接一次的夜班异常 */
export function buildSeedIssues(now: Date = new Date()): HandoverIssue[] {
  const current = shiftAt(now);
  const last = shiftAt(new Date(now.getTime() - 12 * 60 * 60 * 1000));

  return [
    {
      id: "seed-1",
      equipment: "卸油口密封",
      area: "油罐区",
      description: "密封圈老化，卸油时有轻微渗漏迹象，需更换密封件",
      foundShift: last,
      currentShift: current,
      owner: "何鑫",
      deadline: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      status: "open",
      handoverCount: 1,
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "seed-2",
      equipment: "加油机1号",
      area: "加油区",
      description: "油枪胶管接头渗油，暂停使用该枪位",
      foundShift: current,
      currentShift: current,
      owner: "李坚",
      deadline: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      status: "open",
      handoverCount: 0,
      createdAt: new Date(now.getTime() - 40 * 60 * 1000).toISOString()
    },
    {
      id: "seed-3",
      equipment: "静电接地报警器",
      area: "油罐区",
      description: "夜班测试时报警声偏小",
      foundShift: last,
      currentShift: current,
      owner: "周敏",
      deadline: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      status: "closed",
      handoverCount: 0,
      createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      resolution: "已更换蜂鸣器并复测，音量恢复正常",
      closedBy: "高志远",
      closedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    }
  ];
}
