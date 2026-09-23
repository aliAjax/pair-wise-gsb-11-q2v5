import { useState } from "react";
import type { ShiftRef } from "../data/types";
import { formatShift, nextShift } from "../rules/handover";

type Props = {
  shift: ShiftRef;
  openCount: number;
  carriedCount: number;
  onHandover: () => void;
};

export default function ShiftBar({ shift, openCount, carriedCount, onHandover }: Props) {
  const [confirming, setConfirming] = useState(false);

  function doHandover() {
    onHandover();
    setConfirming(false);
  }

  return (
    <div className="shift-bar">
      <div className="shift-info">
        <span className="shift-label">当前班次</span>
        <strong>{formatShift(shift)}</strong>
        <span className="shift-meta">本班待处理 {openCount} 项 · 交班带入 {carriedCount} 项</span>
      </div>
      {confirming ? (
        <div className="shift-confirm">
          <span>交班至「{formatShift(nextShift(shift))}」，未销项将全部带入下一班，确认？</span>
          <button type="button" onClick={doHandover}>确认交班</button>
          <button type="button" className="secondary" onClick={() => setConfirming(false)}>
            取消
          </button>
        </div>
      ) : (
        <button type="button" className="secondary" onClick={() => setConfirming(true)}>
          交班给下一班
        </button>
      )}
    </div>
  );
}
