import { useMemo, useState } from "react";
import type { Anomaly } from "../data/types";
import { areaNames } from "../data/catalog";
import { isOverdue, remainingMs } from "../rules/handover";
import AnomalyCard from "./AnomalyCard";

const AREA_FILTERS = ["全部区域", ...areaNames()];

export default function Board({
  anomalies,
  now,
  onCloseClick,
}: {
  anomalies: Anomaly[];
  now: Date;
  onCloseClick: (anomaly: Anomaly) => void;
}) {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [areaFilter, setAreaFilter] = useState(AREA_FILTERS[0]);
  const [equipmentKeyword, setEquipmentKeyword] = useState("");

  const visible = useMemo(() => {
    const rows = anomalies.filter((item) => {
      if (item.closed !== (tab === "closed")) return false;
      if (areaFilter !== "全部区域" && item.area !== areaFilter) return false;
      if (equipmentKeyword.trim() && !item.equipment.includes(equipmentKeyword.trim())) return false;
      return true;
    });
    if (tab === "open") {
      // 超期优先，其次时限最近优先
      return rows.sort((a, b) => {
        const ao = isOverdue(a, now) ? 0 : 1;
        const bo = isOverdue(b, now) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return remainingMs(a, now) - remainingMs(b, now);
      });
    }
    return rows.sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
  }, [anomalies, tab, areaFilter, equipmentKeyword, now]);

  const openCount = anomalies.filter((item) => !item.closed).length;
  const closedCount = anomalies.length - openCount;

  return (
    <section className="list-panel board">
      <div className="board-tabs">
        <button type="button" className={tab === "open" ? "tab active" : "tab"} onClick={() => setTab("open")}>
          待处理（{openCount}）
        </button>
        <button type="button" className={tab === "closed" ? "tab active" : "tab"} onClick={() => setTab("closed")}>
          已销项（{closedCount}）
        </button>
      </div>

      <div className="board-filters">
        <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
          {AREA_FILTERS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          placeholder="按设备名筛选"
          value={equipmentKeyword}
          onChange={(event) => setEquipmentKeyword(event.target.value)}
        />
      </div>

      {tab === "open" && (
        <p className="board-note">超期未销项仍排在待处理最前面；交班后未销项会自动带到下一班跟进。</p>
      )}

      <div className="record-grid">
        {visible.length === 0 ? (
          <div className="empty">{tab === "open" ? "当前没有待处理异常" : "暂无已销项记录"}</div>
        ) : (
          visible.map((anomaly) => (
            <AnomalyCard key={anomaly.id} anomaly={anomaly} now={now} onCloseClick={onCloseClick} />
          ))
        )}
      </div>
    </section>
  );
}
