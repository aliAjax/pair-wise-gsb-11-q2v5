import { useMemo, useState } from "react";
import { DEADLINE_PRESETS, STAFF, areaNames, equipmentOf } from "../data/catalog";
import type { RegisterInput } from "../data/types";
import { useDeskStore } from "../store/deskStore";
import { toLocalInputValue } from "../utils/format";

export default function RegisterForm() {
  const register = useDeskStore((state) => state.register);
  const anomalies = useDeskStore((state) => state.anomalies);

  const [area, setArea] = useState(areaNames()[0]);
  const [equipment, setEquipment] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState(STAFF[0]);
  const [deadlineAt, setDeadlineAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + DEADLINE_PRESETS[1].ms))
  );
  const [error, setError] = useState<string | null>(null);

  const equipmentOptions = useMemo(() => equipmentOf(area), [area]);

  const effectiveEquipment = useCustom ? customEquipment.trim() : equipment;

  function applyPreset(ms: number) {
    setDeadlineAt(toLocalInputValue(new Date(Date.now() + ms)));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!effectiveEquipment) {
      setError("请选择或填写设备");
      return;
    }
    if (!description.trim()) {
      setError("请填写异常现象");
      return;
    }
    if (!deadlineAt) {
      setError("请设置复查时限");
      return;
    }
    const input: RegisterInput = {
      area,
      equipment: effectiveEquipment,
      description,
      owner,
      deadlineAt: new Date(deadlineAt).toISOString(),
    };
    const result = register(input);
    if (!result.ok) {
      setError(`「${result.existing.equipment}」已有未销项异常（${result.existing.currentShiftLabel}登记），请先销项或更新跟进，不能重复建条。`);
      return;
    }
    setError(null);
    setEquipment("");
    setCustomEquipment("");
    setDescription("");
    setUseCustom(false);
  }

  const openOnEquipment = anomalies.some(
    (item) => !item.closed && item.equipment.trim() === effectiveEquipment.trim() && effectiveEquipment.trim() !== ""
  );

  return (
    <form className="panel register-form" onSubmit={handleSubmit}>
      <h2>登记异常</h2>
      <p className="panel-hint">同一设备存在未销项异常时不能重复登记，交班后未销项自动带入下一班。</p>

      <label>
        区域
        <select
          value={area}
          onChange={(event) => {
            setArea(event.target.value);
            setEquipment("");
            setUseCustom(false);
          }}
        >
          {areaNames().map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>

      <label>
        设备
        <select value={useCustom ? "__custom__" : equipment} onChange={(event) => {
          if (event.target.value === "__custom__") {
            setUseCustom(true);
          } else {
            setUseCustom(false);
            setEquipment(event.target.value);
          }
        }}>
          <option value="">请选择设备</option>
          {equipmentOptions.map((name) => (
            <option key={name}>{name}</option>
          ))}
          <option value="__custom__">其他设备（手工填写）</option>
        </select>
      </label>

      {useCustom && (
        <label>
          设备名称
          <input
            value={customEquipment}
            onChange={(event) => setCustomEquipment(event.target.value)}
            placeholder="如：油气回收装置"
          />
        </label>
      )}

      <label>
        异常现象
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="描述异常部位、现象与风险"
        />
      </label>

      <label>
        责任人
        <select value={owner} onChange={(event) => setOwner(event.target.value)}>
          {STAFF.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>

      <div className="deadline-block">
        <label>
          复查时限
          <input type="datetime-local" value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} />
        </label>
        <div className="preset-row">
          {DEADLINE_PRESETS.map((preset) => (
            <button type="button" className="chip" key={preset.key} onClick={() => applyPreset(preset.ms)}>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {openOnEquipment && <p className="field-warning">该设备已有未销项异常，提交将被拦截。</p>}
      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="primary-block" disabled={openOnEquipment}>
        登记并跟进
      </button>
    </form>
  );
}
