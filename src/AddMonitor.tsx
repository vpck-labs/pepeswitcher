import { useState } from "react";
import * as api from "./api";

/** Form body for adding or renaming a monitor preset, shown inside the modal. */
export default function AddMonitor(props: {
  initial?: { id: string; name: string };
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!props.initial;
  const [name, setName] = useState(props.initial?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateMonitorPreset(props.initial!.id, trimmed);
      } else {
        await api.saveMonitorPreset(trimmed);
      }
      props.onDone();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="dialog">
      <h2>{isEdit ? "Edit monitor preset" : "Add monitor preset"}</h2>
      <p className="hint">
        {isEdit
          ? "Rename this preset. The saved display arrangement is unchanged."
          : "Arrange your displays the way you want, then name and save the current arrangement."}
      </p>
      <input
        autoFocus
        placeholder="Name (e.g. Desk, Couch, Solo)"
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") props.onCancel();
        }}
      />
      {error && <div className="status err">{error}</div>}
      <div className="dialog-actions">
        <button className="ghost" disabled={busy} onClick={props.onCancel}>
          Cancel
        </button>
        <button disabled={busy || !name.trim()} onClick={save}>
          {isEdit ? "Save" : "Save current"}
        </button>
      </div>
    </div>
  );
}
