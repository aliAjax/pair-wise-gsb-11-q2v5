import type { Anomaly } from "../data/types";
import { useDeskStore } from "../store/deskStore";
import { isOverdue, remainingMs } from "../rules/handover";
import { formatDateTime, formatRemaining } from "../utils/format";

export default function AnomalyCard({
  anomaly,
  now,
  onCloseClick,
}: {
  anomaly: Anomaly;
  now: Date;
  onCloseClick: (anomaly: Anomaly) => void;
}) {
  const operator = useDeskStore((state) => state.currentOperator);
  const overdue = isOverdue(anomaly, now);
  const remaining = remainingMs(anomaly, now);
  const canClose = !anomaly.closed && (operator.role === "manager" || operator.name === anomaly.owner);
  const carriedOver = anomaly.currentShiftSeq !== anomaly.foundShiftSeq;

  return (
    <article className={`anomaly-card ${anomaly.closed ? "closed" : overdue ? "overdue" : ""}`}>
      <div className="card-head">
        <div>
          <p className="card-title">{anomaly.equipment}</p>
          <p className="card-area">{anomaly.area}</p>
        </div>
        {anomaly.closed ? (
          <span className="badge badge-closed">已销项</span>
        ) : overdue ? (
          <span className="badge badge-overdue">超期未处理</span>
        ) : (
          <span className="badge badge-open">待处理</span>
        )}
      </div>

      <p className="card-desc">{anomaly.description}</p>

      <div className="card-grid">
        <span>发现班次：{anomaly.foundShiftLabel}</span>
        <span>发现时间：{formatDateTime(anomaly.foundAt)}</span>
        <span>责任人：{anomaly.owner}</span>
        <span>
          复查时限：{formatDateTime(anomaly.deadline)}
          {!anomaly.closed && <em className={overdue ? "danger-text" : "ok-text"}>（{formatRemaining(remaining)}）</em>}
        </span>
        <span>跟进班次：{anomaly.currentShiftLabel}</span>
        {carriedOver && !anomaly.closed && (
          <span className="carry-mark">已跨班 {anomaly.carries.length} 次 · 最近由 {anomaly.carries[anomaly.carries.length - 1]?.fromShiftLabel} 带入</span>
        )}
      </div>

      {anomaly.closed ? (
        <div className="resolution-box">
          <p>
            <strong>处理说明：</strong>
            {anomaly.resolution}
          </p>
          <p className="resolution-meta">
            {anomaly.closedBy}
            {anomaly.closedAsRole === "manager" ? "（站长）" : "（责任人）"} 于 {formatDateTime(anomaly.closedAt!)} 销项
          </p>
        </div>
      ) : (
        <div className="card-actions">
          <button type="button" onClick={() => onCloseClick(anomaly)} disabled={!canClose} title={canClose ? "" : "仅责任人本人或站长可销项"}>
            {canClose ? "销项并填处理说明" : "仅责任人或站长可销项"}
          </button>
        </div>
      )}
    </article>
  );
}
