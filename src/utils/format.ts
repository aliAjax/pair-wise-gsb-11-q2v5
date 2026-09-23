// 页面工具：时间与时限文案格式化

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "09-23 14:05" */
export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "14:05" */
export function formatTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local 控件需要的本地时间值 */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 剩余/超期文案，如 "剩余 3小时05分"、"已超期 2天1小时"、"剩余 42分钟" */
export function formatRemaining(deltaMs: number): string {
  const overdue = deltaMs < 0;
  const abs = Math.abs(deltaMs);
  const minutes = Math.floor(abs / 60000);
  const days = Math.floor(minutes / 60 / 24);
  const hours = Math.floor((minutes - days * 24 * 60) / 60);
  const mins = minutes - days * 24 * 60 - hours * 60;

  let span: string;
  if (days > 0) span = `${days}天${hours}小时`;
  else if (hours > 0) span = `${hours}小时${pad(mins)}分`;
  else span = `${mins}分钟`;

  return overdue ? `已超期 ${span}` : `剩余 ${span}`;
}
