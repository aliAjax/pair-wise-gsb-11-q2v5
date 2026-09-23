import { useState } from "react";
import { ROLE_LABEL, STAFF_SUGGESTIONS } from "../data/catalog";
import type { Operator } from "../data/types";

type Props = {
  operator: Operator | null;
  onChange: (operator: Operator | null) => void;
};

export default function OperatorBar({ operator, onChange }: Props) {
  const [name, setName] = useState(operator?.name ?? STAFF_SUGGESTIONS[0]);
  const [role, setRole] = useState<Operator["role"]>(operator?.role ?? "staff");

  function apply() {
    if (!name.trim()) return;
    onChange({ name: name.trim(), role });
  }

  if (operator) {
    return (
      <div className="operator-bar">
        <span className="operator-chip">
          {operator.name} · {ROLE_LABEL[operator.role]}
        </span>
        <button type="button" className="secondary small" onClick={() => onChange(null)}>
          切换
        </button>
      </div>
    );
  }

  return (
    <div className="operator-bar operator-edit">
      <input list="operator-options" value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" />
      <datalist id="operator-options">
        {STAFF_SUGGESTIONS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <select value={role} onChange={(e) => setRole(e.target.value as Operator["role"])}>
        <option value="staff">{ROLE_LABEL.staff}</option>
        <option value="manager">{ROLE_LABEL.manager}</option>
      </select>
      <button type="button" className="small" onClick={apply}>
        确定
      </button>
    </div>
  );
}
