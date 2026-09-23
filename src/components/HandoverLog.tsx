import { useState } from "react";
import { useDeskStore } from "../store/deskStore";
import { formatDateTime } from "../utils/format";

export default function HandoverLog() {
  const handovers = useDeskStore((state) => state.handovers);
  const [expanded, setExpanded] = useState(false);

  const ordered = [...handovers].sort((a, b) => b.at.localeCompare(a.at));
  const visible = expanded ? ordered : ordered.slice(0, 3);

  return (
    <section className="panel log-panel">
      <h2>交班记录</h2>
      {ordered.length === 0 ? (
        <p className="empty">尚无交班记录</p>
      ) : (
        <ul className="log-list">
          {visible.map((event) => (
            <li key={event.id} className="log-item">
              <div className="log-main">
                <strong>
                  {event.fromShiftLabel} → {event.toShiftLabel}
                </strong>
                <span className="log-meta">
                  {formatDateTime(event.at)} · {event.operator} 操作
                </span>
              </div>
              <span className={event.carriedCount > 0 ? "carry-pill" : "carry-pill zero"}>
                {event.carriedCount > 0 ? `带入 ${event.carriedCount} 条` : "无遗留"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {ordered.length > 3 && (
        <button type="button" className="link-btn" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "收起" : `展开全部 ${ordered.length} 条`}
        </button>
      )}
    </section>
  );
}
