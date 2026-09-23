// 数据层：异常交接台领域模型定义

/** 班次：白班 08:00-20:00，晚班 20:00-次日08:00 */
export type ShiftKind = "day" | "night";

/** 角色：值班员、站长（站长可跨责任人销项） */
export type Role = "staff" | "manager";

export type Operator = {
  name: string;
  role: Role;
};

export type Area = {
  name: string;
  equipment: string[];
};

/** 复查时限快捷项（相对发现时间） */
export type DeadlinePreset = {
  key: string;
  label: string;
  /** 毫秒数 */
  ms: number;
};

/** 异常记录 */
export type Anomaly = {
  id: string;
  /** 设备名称 */
  equipment: string;
  /** 区域名称 */
  area: string;
  /** 异常描述 */
  description: string;
  /** 发现班次的唯一序号（即首次登记时当班序号） */
  foundShiftSeq: number;
  /** 发现时的班次标签快照 */
  foundShiftLabel: string;
  /** 发现时间 ISO 字符串 */
  foundAt: string;
  /** 当前跟进班次（交班后自动带到下一班） */
  currentShiftSeq: number;
  /** 当前跟进班次标签快照 */
  currentShiftLabel: string;
  /** 责任人姓名 */
  owner: string;
  /** 复查时限 ISO 字符串 */
  deadline: string;
  /** 是否已销项 */
  closed: boolean;
  /** 处理说明（销项前必填） */
  resolution?: string;
  /** 销项人 */
  closedBy?: string;
  /** 销项时间 */
  closedAt?: string;
  /** 销项人角色 */
  closedAsRole?: Role;
  /** 随交班流转的历史，从最早到最新 */
  carries: CarryRecord[];
};

export type CarryRecord = {
  fromShiftSeq: number;
  fromShiftLabel: string;
  toShiftSeq: number;
  toShiftLabel: string;
  handedOverAt: string;
};

/** 交班记录 */
export type HandoverEvent = {
  id: string;
  at: string;
  operator: string;
  fromShiftSeq: number;
  fromShiftLabel: string;
  toShiftSeq: number;
  toShiftLabel: string;
  /** 本次带到下一班的未销项数量 */
  carriedCount: number;
  /** 本次带到下一班的未销项 id */
  carriedIds: string[];
};

export type ShiftState = {
  /** 本班次开始时间 ISO 字符串 */
  startedAt: string;
  /** 班次序号，每班 +1 */
  seq: number;
  kind: ShiftKind;
  label: string;
};

/** 持久化根对象 */
export type DeskState = {
  version: number;
  currentOperator: Operator;
  shift: ShiftState;
  anomalies: Anomaly[];
  handovers: HandoverEvent[];
};

/** 登记异常的表单输入 */
export type RegisterInput = {
  equipment: string;
  area: string;
  description: string;
  owner: string;
  deadlineAt: string;
};
