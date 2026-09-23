import { useState } from "react";
import type { HandoverIssue, Operator, RuleResult, ShiftRef } from "../data/types";
import { canClose, deadlineState, shortShift } from "../rules/handover";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  issue: HandoverIssue;
  now: Date;
  shift: ShiftRef;
  operator: Operator | null;
  onClose: (id: string, resolution: string) => RuleResult;
};

export default function IssueCard({ issue, now, shift, operator, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");

  const dl = deadlineState(issue, now);
  const isCurrent = issue.currentShift.date === shift.date && issue.currentShift.kind === shift.kind;
  const carriedHere = issue.status === "open" && isCurrent && issue.handoverCount > 0;

  function submitClose(event: React.FormEvent) {
    event.preventDefault();
    const result = onClose(issue.id, resolution);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError("");
    setResolution("");
    setClosing(false);
  }

  return (
    <article className={`issue ${issue.status === "closed" ? "is-closed" : dl.tone === "overdue" ? "is-overdue" : ""}`}>
      <div className="record-head">
        <p className="record-title">{issue.equipment}</p>
        <div className="badges">
          {issue.status === "open" ? (
            <>
              {dl.tone === "overdue" && <span className="badge badge-overdue">超期</span>}
              {carriedHere && <span className="badge badge-carry">已交接 {issue.handoverCount} 次</span>}
              <span className="badge badge-open">待处理</span>
            </>
          ) : (
            <span className="badge badge-done">已销项</span>
          )}
        </div>
      </div>

      <div className="details">
        <span>区域：{issue.area}</span>
        <span>责任人：{issue.owner}</span>
        <span>发现班次：{shortShift(issue.foundShift)}</span>
        <span>当前所在：{shortShift(issue.currentShift)}</span>
        <span>复查时限：{formatDateTime(issue.deadline)}</span>
        <span className={dl.tone === "overdue" ? "text-overdue" : dl.tone === "soon" ? "text-soon" : ""}>
          {dl.label}
        </span>
      </div>

      <p className="note">{issue.description}</p>

      {issue.status === "closed" ? (
        <div className="resolution-box">
          <p className="resolution-head">处理说明（{issue.closedBy} 销项 · {formatDateTime(issue.closedAt ?? "")}）</p>
          <p className="resolution-text">{issue.resolution}</p>
        </div>
      ) : (
        <>
          {closing ? (
            <form className="close-form" onSubmit={submitClose}>
              <label>
                处理说明（销项必填）
                <textarea
                  value={resolution}
                  placeholder="填写处理过程、更换部件、复查结果等"
                  onChange={(e) => setResolution(e.target.value)}
                  required
                />
              </label>
              {error && <p className="field-error">{error}</p>}
              <div className="actions">
                <button type="submit">确认销项</button>
                <button type="button" className="secondary" onClick={() => { setClosing(false); setError(""); }}>
                  取消
                </button>
              </div>
            </form>
          ) : (
            <div className="actions">
              <button
                type="button"
                onClick={() => (operator ? setClosing(true) : setError("请先在右上角选择当前操作人"))}
                disabled={!!operator && !canClose(issue, operator)}
                title={operator && !canClose(issue, operator) ? "只有责任人本人或站长可以销项" : ""}
              >
                销项
              </button>
              {operator && !canClose(issue, operator) && (
                <span className="action-hint">仅责任人 {issue.owner} 或站长可销项</span>
              )}
              {error && !operator && <span className="field-error">{error}</span>}
            </div>
          )}
        </>
      )}
    </article>
  );
}
