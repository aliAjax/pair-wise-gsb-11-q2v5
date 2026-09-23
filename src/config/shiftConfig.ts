// 配置层：班次时间与持久化参数
// 08:00-20:00 为白班，20:00-次日08:00 为晚班；不增加任何依赖。

export const SHIFT_DAY_START_HOUR = 8;
export const SHIFT_BOUNDARY_HOUR = 20;
export const SHIFT_LENGTH_MS = 12 * 60 * 60 * 1000;

export const STORAGE_KEY = "dfwlfront-10-handover-desk";
export const STORAGE_VERSION = 1;

/** 首次进入应用时的默认当班人 */
export const DEFAULT_OPERATOR = { name: "何鑫", role: "staff" as const };
