import { MANAGERS, STAFF } from "../data/catalog";
import type { Role } from "../data/types";
import { useDeskStore } from "../store/deskStore";
import { shiftFromSeq } from "../rules/handover";
import { formatDateTime } from "../utils/format";

export default function ShiftHeader({ openCount, overdueCount }: { openCount: number; overdueCount: number }) {
  const operator = useDeskStore((state) => state.currentOperator);
  const shift = useDeskStore((state) => state.shift);
  const setOperator = useDeskStore((state) => state.setOperator);
  const doHandover = useDeskStore((state) => state.doHandover);

  const next = shiftFromSeq(shift.seq + 1);

  function handleOperatorChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const [name, role] = event.target.value.split("|") as [string, Role];
    setOperator({ name, role });
  }

  function handleHandover() {
    const word = openCount === 0 ? "当前没有未销项异常" : `当前有 ${openCount} 条未销项异常将全部带到「${next.label}」`;
    const confirmed = window.confirm(`确认交班？\n${word}。交班后跟进班次自动更新。`);
    if (!confirmed) return;
    const event = doHandover();
    window.alert(
      event.carriedCount === 0
        ? `已交班至「${event.toShiftLabel}」，本班无遗留异常。`
        : `已交班至「${event.toShiftLabel}」，${event.carriedCount} 条未销项异常已带入下一班跟进。`
    );
  }

  return (
    <header className="topbar desk-topbar">
      <div className="topbar-main">
        <p className="eyebrow">石油行业 · 异常交接闭环</p>
        <h1>油站异常交接台</h1>
        <p className="subtitle">
          登记设备异常、责任人与复查时限；同设备未销项不可重复建条，交班未销项自动带入下一班，超期仍挂待处理。
        </p>
      </div>

      <div className="shift-card">
        <div className="shift-line">
          <span className="shift-badge">{shift.kind === "day" ? "白班" : "晚班"}</span>
          <strong>{shift.label}</strong>
        </div>
        <p className="shift-time">班次起 {formatDateTime(shift.startedAt)}</p>
        <p className="shift-time shift-next">下一班：{next.label}</p>

        <label className="operator-line">
          当前操作人
          <select value={`${operator.name}|${operator.role}`} onChange={handleOperatorChange}>
            {STAFF.map((name) => (
              <option key={name} value={`${name}|staff`}>
                {name}（值班员）
              </option>
            ))}
            {MANAGERS.map((name) => (
              <option key={name} value={`${name}|manager`}>
                {name}（站长）
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="handover-btn" onClick={handleHandover}>
          交班到{next.kind === "day" ? "白班" : "晚班"}
        </button>

        <div className="topbar-counts">
          <span className={overdueCount > 0 ? "count danger-text" : "count"}>
            待处理 {openCount}
          </span>
          {overdueCount > 0 && <span className="count danger-text">超期 {overdueCount}</span>}
        </div>
      </div>
    </header>
  );
}
