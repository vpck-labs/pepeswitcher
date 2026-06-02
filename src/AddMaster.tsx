import { useState } from "react";
import * as api from "./api";
import { accelFromEvent, prettyAccel } from "./hotkey";

export interface CurrentSelection {
  monitorId: string | null;
  monitorName: string | null;
  audioId: string | null;
  audioName: string | null;
}

/** Form body for creating or editing a master preset, shown inside the modal. */
export default function AddMaster(props: {
  current: CurrentSelection;
  initial?: { id: string; name: string; hotkey: string | null };
  onDone: () => void;
  onCancel: () => void;
}) {
  const { current } = props;
  const isEdit = !!props.initial;
  const [name, setName] = useState(props.initial?.name ?? "");
  const [hotkey, setHotkey] = useState<string | null>(props.initial?.hotkey ?? null);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only relevant when creating: there must be an active selection to snapshot.
  const nothingSelected = !isEdit && !current.monitorId && !current.audioId;

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || nothingSelected) return;
    setBusy(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateMasterPreset(props.initial!.id, trimmed, hotkey);
      } else {
        await api.saveMasterPreset(trimmed, current.monitorId, current.audioId, hotkey);
      }
      props.onDone();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  const onHotkeyKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.key === "Escape") {
      setCapturing(false);
      return;
    }
    const accel = accelFromEvent(e);
    if (accel) {
      setHotkey(accel);
      setCapturing(false);
    }
  };

  return (
    <div className="dialog">
      <h2>{isEdit ? "Edit master preset" : "New master preset"}</h2>
      {!isEdit && (
        <p className="hint">Snapshots your current selection so one click (or a hotkey) restores both.</p>
      )}

      <div className="snapshot">
        <div>
          <span className="snapshot-label">Monitor</span>
          <span className={current.monitorName ? "" : "muted"}>
            {current.monitorName ?? "none"}
          </span>
        </div>
        <div>
          <span className="snapshot-label">Audio</span>
          <span className={current.audioName ? "" : "muted"}>
            {current.audioName ?? "none"}
          </span>
        </div>
      </div>

      <label className="field">
        <span>Name</span>
        <input
          autoFocus
          placeholder="e.g. Movie night, Work"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") props.onCancel();
          }}
        />
      </label>

      <label className="field">
        <span>Global hotkey (optional)</span>
        {capturing ? (
          <input
            autoFocus
            readOnly
            className="capturing"
            value="Press a shortcut…  (Esc to cancel)"
            onKeyDown={onHotkeyKeyDown}
            onBlur={() => setCapturing(false)}
          />
        ) : (
          <div className="hotkey-row">
            <button type="button" className="ghost" disabled={busy} onClick={() => setCapturing(true)}>
              {hotkey ? prettyAccel(hotkey) : "Click to set"}
            </button>
            {hotkey && (
              <button type="button" className="ghost icon" disabled={busy} onClick={() => setHotkey(null)} title="Clear">
                ✕
              </button>
            )}
          </div>
        )}
      </label>

      {nothingSelected && (
        <div className="status err">
          No preset is currently active to snapshot. Apply a monitor and/or audio preset first.
        </div>
      )}
      {error && <div className="status err">{error}</div>}

      <div className="dialog-actions">
        <button className="ghost" disabled={busy} onClick={props.onCancel}>
          Cancel
        </button>
        <button disabled={busy || !name.trim() || nothingSelected} onClick={save}>
          {isEdit ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
