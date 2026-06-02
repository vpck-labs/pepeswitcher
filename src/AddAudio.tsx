import { useEffect, useState } from "react";
import * as api from "./api";
import type { AudioDevice } from "./types";

/** Form body for adding an audio preset, shown inside the modal. */
export default function AddAudio(props: { onDone: () => void; onCancel: () => void }) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAudioDevices()
      .then((devs) => {
        setDevices(devs);
        const def = devs.find((d) => d.isDefault) ?? devs[0];
        if (def) setDeviceId(def.id);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const save = async () => {
    const trimmed = name.trim();
    const dev = devices.find((d) => d.id === deviceId);
    if (!trimmed || !dev) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveAudioPreset(trimmed, dev.id, dev.name);
      props.onDone();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="dialog">
      <h2>Add audio preset</h2>
      <label className="field">
        <span>Output device</span>
        <select
          value={deviceId}
          disabled={busy}
          onChange={(e) => setDeviceId(e.currentTarget.value)}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.isDefault ? "  (current default)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Preset name</span>
        <input
          placeholder="e.g. Headset, Speakers"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") props.onCancel();
          }}
        />
      </label>
      {error && <div className="status err">{error}</div>}
      <div className="dialog-actions">
        <button className="ghost" disabled={busy} onClick={props.onCancel}>
          Cancel
        </button>
        <button disabled={busy || !name.trim() || !deviceId} onClick={save}>
          Save preset
        </button>
      </div>
    </div>
  );
}
