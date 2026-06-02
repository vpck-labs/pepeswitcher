import { useEffect, useState } from "react";
import * as api from "./api";
import type { AudioDevice } from "./types";

/** Form body for adding or editing an audio preset, shown inside the modal. */
export default function AddAudio(props: {
  initial?: { id: string; name: string; deviceId: string };
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!props.initial;
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [deviceId, setDeviceId] = useState(props.initial?.deviceId ?? "");
  const [name, setName] = useState(props.initial?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAudioDevices()
      .then((devs) => {
        setDevices(devs);
        setDeviceId((cur) => {
          if (cur && devs.some((d) => d.id === cur)) return cur;
          return (devs.find((d) => d.isDefault) ?? devs[0])?.id ?? "";
        });
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
      if (isEdit) {
        await api.updateAudioPreset(props.initial!.id, trimmed, dev.id, dev.name);
      } else {
        await api.saveAudioPreset(trimmed, dev.id, dev.name);
      }
      props.onDone();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="dialog">
      <h2>{isEdit ? "Edit audio preset" : "Add audio preset"}</h2>
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
          {isEdit ? "Save" : "Save preset"}
        </button>
      </div>
    </div>
  );
}
