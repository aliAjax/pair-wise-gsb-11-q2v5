import { useMemo, useState } from "react";
import { AREAS, DEFAULT_REVIEW_HOURS, EQUIPMENT_BY_AREA, STAFF_SUGGESTIONS } from "../data/catalog";
import type { IssueDraft, RuleResult, ShiftRef } from "../data/types";
import { findOpenForEquipment, formatShift } from "../rules/handover";
import type { HandoverIssue } from "../data/types";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDeadline(): string {
  return toLocalInput(new Date(Date.now() + DEFAULT_REVIEW_HOURS * 60 * 60 * 1000).toISOString());
}

type Props = {
  shift: ShiftRef;
  issues: HandoverIssue[];
  onRegister: (draft: IssueDraft) => RuleResult;
};

export default function IssueForm({ shift, issues, onRegister }: Props) {
  const [equipment, setEquipment] = useState("");
  const [area, setArea] = useState<string>(AREAS[0]);
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState(STAFF_SUGGESTIONS[0]);
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const equipmentOptions = useMemo(() => {
    const values = new Set<string>(EQUIPMENT_BY_AREA[area] ?? []);
    Object.values(EQUIPMENT_BY_AREA).forEach((list) => list.forEach((v) => values.add(v)));
    return [...values];
  }, [area]);

  const duplicate = equipment.trim() ? findOpenForEquipment(issues, equipment) : undefined;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setDone(false);
    const result = onRegister({
      equipment,
      area,
      description,
      owner,
      deadline: new Date(deadline).toISOString()
    });
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError("");
    setDone(true);
    setEquipment("");
    setDescription("");
    setDeadline(defaultDeadline());
    window.setTimeout(() => setDone(false), 3000);
  }

  return (
    <form className="panel issue-form" onSubmit={submit}>
      <h2>登记异常</h2>
      <p className="form-shift">发现班次：{formatShift(shift)}</p>
      <div className="form-grid">
        <label>
          设备
          <input
            list="equipment-options"
            value={equipment}
            placeholder="如：加油机2号"
            onChange={(e) => setEquipment(e.target.value)}
            required
          />
          <datalist id="equipment-options">
            {equipmentOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        {duplicate && <p className="field-warn">该设备已有未销项异常（责任人：{duplicate.owner}），不能重复登记</p>}

        <label>
          区域
          <select value={area} onChange={(e) => setArea(e.target.value)} required>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>

        <label>
          异常情况
          <textarea
            value={description}
            placeholder="描述现场异常，如渗漏、异响、报警等"
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <label>
          责任人
          <input list="owner-options" value={owner} onChange={(e) => setOwner(e.target.value)} required />
          <datalist id="owner-options">
            {STAFF_SUGGESTIONS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label>
          复查时限
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
        </label>

        {error && <p className="field-error">{error}</p>}
        {done && <p className="field-ok">已登记，进入本班待处理</p>}

        <button type="submit">登记异常</button>
      </div>
    </form>
  );
}
