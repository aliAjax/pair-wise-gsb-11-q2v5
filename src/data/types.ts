// 异常交接台的数据模型

export type ShiftKind = "day" | "night";

/** 班次：日期 + 白/夜班 */
export interface ShiftRef {
  /** YYYY-MM-DD */
  date: string;
  kind: ShiftKind;
}

export type IssueStatus = "open" | "closed";

/** 一条异常交接记录 */
export interface HandoverIssue {
  id: string;
  /** 设备 */
  equipment: string;
  /** 区域 */
  area: string;
  /** 异常情况描述 */
  description: string;
  /** 发现班次 */
  foundShift: ShiftRef;
  /** 当前所在班次：交班后未销项会被带到下一班 */
  currentShift: ShiftRef;
  /** 责任人 */
  owner: string;
  /** 复查时限（ISO 时间） */
  deadline: string;
  status: IssueStatus;
  /** 已交接次数 */
  handoverCount: number;
  createdAt: string;
  /** 销项时填写的处理说明 */
  resolution?: string;
  /** 销项人 */
  closedBy?: string;
  closedAt?: string;
}

/** 当前操作人（用于销项权限判断） */
export type Role = "manager" | "staff";

export interface Operator {
  name: string;
  role: Role;
}

/** 登记表单提交内容 */
export interface IssueDraft {
  equipment: string;
  area: string;
  description: string;
  owner: string;
  /** 复查时限，ISO 字符串 */
  deadline: string;
}

export type RuleResult = { ok: true } | { ok: false; reason: string };
