import { useState } from "react";
import type { Anomaly } from "../data/types";
import { useDeskStore } from "../store/deskStore";

export default function CloseDialog({ anomaly, onClose }: { anomaly: Anomaly; onClose: () => void }) {
  const operator = useDeskStore((state) => state.currentOperator);
  const close = useDeskStore((state) => state.close);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canClose = operator.role === "manager" || operator.name === anomaly.owner;
  const scope = operator.role === "manager" ? "站长" : "值班员";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!resolution.trim()) {
      setError("销项前必须填写处理说明");
      return;
    }
    const result = close(anomaly.id, resolution);
    if (!result.ok) {
      if (result.reason === "forbidden") setError("只有责任人本人或站长可以销项");
      else if (result.reason === "empty-resolution") setError("销项前必须填写处理说明");
      else setError("该异常已被销项");
      return;
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <h3>销项确认</h3>
        <p className="modal-target">
          {anomaly.equipment} · {anomaly.area}
        </p>
        <p className="modal-meta">
          责任人：{anomaly.owner} ｜ 当前操作人：{operator.name}（{scope}）
        </p>

        {!canClose ? (
          <>
            <p className="form-error">你不是该异常的责任人，也不是站长，无权销项。可联系责任人 {anomaly.owner} 或站长处理。</p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              处理说明（必填）
              <textarea
                autoFocus
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                placeholder="说明处理措施、更换部件、复查结果等，作为交接留痕"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="danger">
                确认销项
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
