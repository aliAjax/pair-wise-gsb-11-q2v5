import { useEffect, useMemo, useState } from "react";
import ShiftHeader from "./components/ShiftHeader";
import RegisterForm from "./components/RegisterForm";
import Board from "./components/Board";
import HandoverLog from "./components/HandoverLog";
import CloseDialog from "./components/CloseDialog";
import { useDeskStore } from "./store/deskStore";
import { isOverdue } from "./rules/handover";
import { useNow } from "./hooks/useNow";
import type { Anomaly } from "./data/types";

export default function App() {
  const anomalies = useDeskStore((state) => state.anomalies);
  const init = useDeskStore((state) => state.init);
  const resetDemo = useDeskStore((state) => state.resetDemo);
  const [closing, setClosing] = useState<Anomaly | null>(null);
  const now = useNow();

  // 跨班次重新打开应用时，自动把未销项追到当前实际班次
  useEffect(() => {
    init();
  }, [init]);

  const open = useMemo(() => anomalies.filter((item) => !item.closed), [anomalies]);
  const overdueCount = useMemo(() => open.filter((item) => isOverdue(item, now)).length, [open, now]);

  // 弹窗目标可能在交班/刷新后已销项，始终取最新数据
  const closingLive = closing ? anomalies.find((item) => item.id === closing.id) ?? null : null;

  return (
    <main className="app">
      <div className="shell">
        <ShiftHeader openCount={open.length} overdueCount={overdueCount} />

        <section className="metrics">
          <article className="metric">
            <span>待处理异常</span>
            <strong>{open.length}</strong>
          </article>
          <article className={`metric ${overdueCount > 0 ? "metric-alert" : ""}`}>
            <span>超期未销项</span>
            <strong>{overdueCount}</strong>
          </article>
          <article className="metric">
            <span>已销项</span>
            <strong>{anomalies.length - open.length}</strong>
          </article>
        </section>

        <section className="workspace desk-workspace">
          <div className="side-column">
            <RegisterForm />
            <HandoverLog />
          </div>
          <Board anomalies={anomalies} now={now} onCloseClick={setClosing} />
        </section>

        <footer className="page-footer">
          <span>数据仅保存在本浏览器 localStorage，刷新不丢失。</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              if (window.confirm("恢复为演示数据？当前登记与交班记录将被清空。")) resetDemo();
            }}
          >
            重置演示数据
          </button>
        </footer>
      </div>

      {closingLive && !closingLive.closed && (
        <CloseDialog anomaly={closingLive} onClose={() => setClosing(null)} />
      )}
    </main>
  );
}
