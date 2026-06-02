import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import type { AppConfig, AudioDevice } from "./types";
import AddMonitor from "./AddMonitor";
import AddAudio from "./AddAudio";
import "./App.css";

const EMPTY: AppConfig = { monitorPresets: [], audioPresets: [] };

function App() {
  const [config, setConfig] = useState<AppConfig>(EMPTY);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [activeMonitorIds, setActiveMonitorIds] = useState<string[]>([]);
  const [autostart, setAutostartState] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "monitor" | "audio">(null);

  const flash = (kind: "ok" | "err", text: string) => {
    setStatus({ kind, text });
    window.setTimeout(() => setStatus(null), 3500);
  };

  // Load each piece independently — a failure in one (e.g. audio) must not
  // blank the others.
  const refresh = useCallback(async () => {
    try {
      setConfig(await api.getConfig());
    } catch (e) {
      flash("err", `Couldn't load presets: ${e}`);
    }
    try {
      setDevices(await api.listAudioDevices());
    } catch (e) {
      flash("err", `Couldn't list audio devices: ${e}`);
    }
    try {
      setActiveMonitorIds(await api.activeMonitorPresets());
    } catch {
      setActiveMonitorIds([]);
    }
    try {
      setAutostartState(await api.getAutostart());
    } catch {
      // Non-critical; leave the toggle as-is.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Called when an add-dialog saves: close it and reload the lists.
  const onDialogDone = () => {
    setDialog(null);
    refresh();
  };

  // Run an action, showing a busy state and surfacing errors.
  const run = async (label: string, fn: () => Promise<unknown>, reload = true) => {
    setBusy(true);
    try {
      await fn();
      if (reload) await refresh();
      flash("ok", label);
    } catch (e) {
      flash("err", String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleAutostart = (next: boolean) =>
    run(next ? "Launch on startup enabled" : "Launch on startup disabled", async () => {
      await api.setAutostart(next);
    });

  const reloadMonitors = () =>
    run(
      "Monitor presets reloaded",
      async () => {
        setConfig(await api.getConfig());
        setActiveMonitorIds(await api.activeMonitorPresets());
      },
      false,
    );

  const reloadAudio = () =>
    run(
      "Audio devices reloaded",
      async () => {
        const [cfg, devs] = await Promise.all([api.getConfig(), api.listAudioDevices()]);
        setConfig(cfg);
        setDevices(devs);
      },
      false,
    );

  // The active audio preset is whichever one points at the current default
  // output device — derived live from the device list.
  const defaultDeviceId = devices.find((d) => d.isDefault)?.id;
  const activeAudioIds = new Set(
    defaultDeviceId
      ? config.audioPresets.filter((p) => p.deviceId === defaultDeviceId).map((p) => p.id)
      : [],
  );
  const activeMonitorSet = new Set(activeMonitorIds);

  return (
    <main className="app">
      <header className="app-head">
        <h1>PepeTools</h1>
        <div className="head-right">
          <label className="autostart">
            <input
              type="checkbox"
              checked={autostart}
              disabled={busy}
              onChange={(e) => toggleAutostart(e.currentTarget.checked)}
            />
            Startup
          </label>
          <button className="ghost icon" onClick={() => api.hideWindow()} title="Hide">
            ✕
          </button>
        </div>
      </header>

      {status && <div className={`status ${status.kind}`}>{status.text}</div>}

      <section className="card">
        <div className="card-head">
          <h2>Monitor presets</h2>
          <div className="card-actions">
            <button className="ghost icon" onClick={reloadMonitors} disabled={busy} title="Reload">
              ↻
            </button>
            <button className="ghost" onClick={() => setDialog("monitor")} disabled={busy}>
              + Add
            </button>
          </div>
        </div>
        <PresetList
          empty="No monitor presets yet. Click + Add to save your current arrangement."
          items={config.monitorPresets.map((p) => ({ id: p.id, primary: p.name }))}
          activeIds={activeMonitorSet}
          busy={busy}
          onApply={(id) => run("Applied monitor preset", () => api.applyMonitorPreset(id))}
          onDelete={(id) => run("Deleted monitor preset", () => api.deleteMonitorPreset(id))}
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Audio output presets</h2>
          <div className="card-actions">
            <button className="ghost icon" onClick={reloadAudio} disabled={busy} title="Reload devices">
              ↻
            </button>
            <button className="ghost" onClick={() => setDialog("audio")} disabled={busy}>
              + Add
            </button>
          </div>
        </div>
        <PresetList
          empty="No audio presets yet. Click + Add to save an output device."
          items={config.audioPresets.map((p) => ({
            id: p.id,
            primary: p.name,
            secondary: p.deviceName,
          }))}
          activeIds={activeAudioIds}
          busy={busy}
          onApply={(id) => run("Switched audio output", () => api.applyAudioPreset(id))}
          onDelete={(id) => run("Deleted audio preset", () => api.deleteAudioPreset(id))}
        />
      </section>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => setDialog(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            {dialog === "monitor" ? (
              <AddMonitor onDone={onDialogDone} onCancel={() => setDialog(null)} />
            ) : (
              <AddAudio onDone={onDialogDone} onCancel={() => setDialog(null)} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

interface Row {
  id: string;
  primary: string;
  secondary?: string;
}

function PresetList(props: {
  items: Row[];
  empty: string;
  busy: boolean;
  activeIds: Set<string>;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (props.items.length === 0) {
    return <p className="empty">{props.empty}</p>;
  }
  return (
    <ul className="presets">
      {props.items.map((it) => {
        const active = props.activeIds.has(it.id);
        return (
          <li key={it.id} className={active ? "active" : ""}>
            <span className="preset-name">
              {it.primary}
              {it.secondary && <small>{it.secondary}</small>}
            </span>
            <span className="preset-actions">
              {active && <span className="badge">Active</span>}
              <button disabled={props.busy} onClick={() => props.onApply(it.id)}>
                Apply
              </button>
              <button
                className="ghost"
                disabled={props.busy}
                onClick={() => props.onDelete(it.id)}
                title="Delete preset"
              >
                ✕
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default App;
