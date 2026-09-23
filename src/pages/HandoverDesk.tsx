import { useMemo, useState } from "react";
import { AREAS } from "../data/catalog";
import type { HandoverIssue, ShiftRef } from "../data/types";
import { isOverdue, shiftKey, sortOpen } from "../rules/handover";
import IssueCard from "../components/IssueCard";
import IssueForm from "../components/IssueForm";
import OperatorBar from "../components/OperatorBar";
import ShiftBar from "../components/ShiftBar";
import { useHandoverDesk } from "../hooks/useHandoverDesk";

type AreaFilter = string;

function inCurrentShift(issue: HandoverIssue, shift: ShiftRef): boolean {
  return shiftKey(issue.currentShift) === shiftKey(shift);
}

export default function HandoverDesk() {
  const { issues, shift, now, operator, setOperator, register, handover, close } = useHandoverDesk();
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("全部区域");
  const [keyword, setKeyword] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  const openIssues = useMemo(() => issues.filter((i) => i.status === "open"), [issues]);
  const closedIssues = useMemo(
    () =>
      issues
        .filter((i) => i.status === "closed")
        .sort((a, b) => new Date(b.closedAt ?? 0).getTime() - new Date(a.closedAt ?? 0).getTime()),
    [issues]
  );

  const overdueCount = openIssues.filter((i) => isOverdue(i, now)).length;
  const currentShiftOpen = openIssues.filter((i) => inCurrentShift(i, shift));
  const carriedCount = currentShiftOpen.filter((i) => i.handoverCount > 0).length;
  const foundThisShift = issues.filter(
    (i) => shiftKey(i.foundShift) === shiftKey(shift) && i.status === "open"
  ).length;

  const matches = (issue: HandoverIssue) => {
    if (areaFilter !== "全部区域" && issue.area !== areaFilter) return false;
    if (keyword.trim()) {
      const kw = keyword.trim();
      return issue.equipment.includes(kw) || issue.description.includes(kw) || issue.owner.includes(kw);
    }
    return true;
  };

  const visibleOpen = sortOpen(currentShiftOpen.filter(matches), now);
  const visibleClosed = closedIssues.filter(matches);

  return (
    <main className="app">
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">石油行业 · 异常闭环交接</p>
            <h1>油站异常交接台</h1>
            <p className="subtitle">
              登记设备异常与复查时限，交班时未销项自动带入下一班；超期项始终置顶待处理，责任人或站长填写处理说明后销项。
            </p>
          </div>
          <div className="topbar-side">
            <OperatorBar operator={operator} onChange={setOperator} />
            <div className="stack">
              {["React", "Vite", "TypeScript", "浏览器存储"].map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="metrics">
          <article className="metric">
            <span>本班待处理</span>
            <strong>{currentShiftOpen.length}</strong>
          </article>
          <article className="metric">
            <span>其中已超期</span>
            <strong className={overdueCount > 0 ? "num-danger" : ""}>{overdueCount}</strong>
          </article>
          <article className="metric">
            <span>交班带入</span>
            <strong>{carriedCount}</strong>
          </article>
          <article className="metric">
            <span>本班新登记 / 累计销项</span>
            <strong>
              {foundThisShift} / {closedIssues.length}
            </strong>
          </article>
        </section>

        <ShiftBar
          shift={shift}
          openCount={currentShiftOpen.length}
          carriedCount={carriedCount}
          onHandover={handover}
        />

        <section className="workspace">
          <IssueForm shift={shift} issues={openIssues} onRegister={register} />

          <section className="list-panel">
            <div className="toolbar">
              <div className="tabs">
                <button
                  type="button"
                  className={!showClosed ? "tab active" : "tab"}
                  onClick={() => setShowClosed(false)}
                >
                  待处理（{visibleOpen.length}）
                </button>
                <button
                  type="button"
                  className={showClosed ? "tab active" : "tab"}
                  onClick={() => setShowClosed(true)}
                >
                  已销项（{visibleClosed.length}）
                </button>
              </div>
              <div className="filters">
                <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                  <option>全部区域</option>
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <input
                  className="search"
                  placeholder="搜设备 / 描述 / 责任人"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            <div className="record-grid">
              {!showClosed ? (
                visibleOpen.length === 0 ? (
                  <div className="empty">本班暂无待处理异常，可以安心交班</div>
                ) : (
                  visibleOpen.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      now={now}
                      shift={shift}
                      operator={operator}
                      onClose={close}
                    />
                  ))
                )
              ) : visibleClosed.length === 0 ? (
                <div className="empty">暂无已销项记录</div>
              ) : (
                visibleClosed.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    now={now}
                    shift={shift}
                    operator={operator}
                    onClose={close}
                  />
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
