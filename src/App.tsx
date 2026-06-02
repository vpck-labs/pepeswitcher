import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import type { AppConfig, AudioDevice } from "./types";
import AddMonitor from "./AddMonitor";
import AddAudio from "./AddAudio";
import AddMaster from "./AddMaster";
import About from "./About";
import { prettyAccel } from "./hotkey";
import "./App.css";

const EMPTY: AppConfig = { monitorPresets: [], audioPresets: [], masterPresets: [] };

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.8 2.2l3 3L6 13l-3.2.6L3.4 10l7.4-7.8z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function App() {
  const [config, setConfig] = useState<AppConfig>(EMPTY);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [activeMonitorIds, setActiveMonitorIds] = useState<string[]>([]);
  const [autostart, setAutostartState] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "monitor" | "audio" | "master" | "about">(null);
  const [editId, setEditId] = useState<string | null>(null);

  const openAdd = (kind: "monitor" | "audio" | "master") => {
    setEditId(null);
    setDialog(kind);
  };
  const openEdit = (kind: "monitor" | "audio" | "master", id: string) => {
    setEditId(id);
    setDialog(kind);
  };
  const closeDialog = () => {
    setDialog(null);
    setEditId(null);
  };

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

  const onDialogDone = () => {
    closeDialog();
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

  // Reorder master presets (drag & drop); persist quietly without a toast.
  const reorderMaster = async (orderedIds: string[]) => {
    try {
      await api.reorderMasterPresets(orderedIds);
      await refresh();
    } catch (e) {
      flash("err", String(e));
    }
  };

  // The active audio preset is whichever one points at the current default
  // output device — derived live from the device list.
  const defaultDeviceId = devices.find((d) => d.isDefault)?.id;
  const activeAudioIds = new Set(
    defaultDeviceId
      ? config.audioPresets.filter((p) => p.deviceId === defaultDeviceId).map((p) => p.id)
      : [],
  );
  const activeMonitorSet = new Set(activeMonitorIds);

  // The currently-active selection, used to snapshot a master preset.
  const activeMonitorId = activeMonitorIds[0] ?? null;
  const activeAudioId = [...activeAudioIds][0] ?? null;
  const currentSelection = {
    monitorId: activeMonitorId,
    monitorName: config.monitorPresets.find((p) => p.id === activeMonitorId)?.name ?? null,
    audioId: activeAudioId,
    audioName: config.audioPresets.find((p) => p.id === activeAudioId)?.name ?? null,
  };

  // A master is active when every preset it references is itself active.
  const masterActiveIds = new Set(
    config.masterPresets
      .filter((m) => {
        const refs = [m.monitorPresetId, m.audioPresetId].filter(Boolean) as string[];
        if (refs.length === 0) return false;
        return refs.every((id) => activeMonitorSet.has(id) || activeAudioIds.has(id));
      })
      .map((m) => m.id),
  );

  const monName = (id?: string | null) =>
    config.monitorPresets.find((p) => p.id === id)?.name ?? null;
  const audName = (id?: string | null) =>
    config.audioPresets.find((p) => p.id === id)?.name ?? null;
  const masterCombo = (m: AppConfig["masterPresets"][number]) =>
    [monName(m.monitorPresetId), audName(m.audioPresetId)].filter(Boolean).join(" + ") || "—";

  // The preset currently targeted for editing (if any), per category.
  const editMonitor = editId ? config.monitorPresets.find((p) => p.id === editId) : undefined;
  const editAudio = editId ? config.audioPresets.find((p) => p.id === editId) : undefined;
  const editMaster = editId ? config.masterPresets.find((m) => m.id === editId) : undefined;

  return (
    <main className="app">
      <header className="app-head">
        <button className="app-title" onClick={() => setDialog("about")} title="About">
          PepeSwitcher
        </button>
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

      <div className="app-body">
        {status && <div className={`status ${status.kind}`}>{status.text}</div>}

        <Section
        id="monitor"
        title="Monitor presets"
        actions={
          <>
            <button className="ghost icon" onClick={reloadMonitors} disabled={busy} title="Reload">
              ↻
            </button>
            <button
              className="ghost icon"
              onClick={() => openAdd("monitor")}
              disabled={busy}
              title="Add monitor preset"
            >
              <PlusIcon />
            </button>
          </>
        }
      >
        <PresetList
          empty="No monitor presets yet. Add one to save your current arrangement."
          items={config.monitorPresets.map((p) => ({ id: p.id, primary: p.name }))}
          activeIds={activeMonitorSet}
          busy={busy}
          onApply={(id) => run("Applied monitor preset", () => api.applyMonitorPreset(id))}
          onEdit={(id) => openEdit("monitor", id)}
          onDelete={(id) => run("Deleted monitor preset", () => api.deleteMonitorPreset(id))}
        />
      </Section>

      <Section
        id="audio"
        title="Audio output presets"
        actions={
          <>
            <button className="ghost icon" onClick={reloadAudio} disabled={busy} title="Reload devices">
              ↻
            </button>
            <button
              className="ghost icon"
              onClick={() => openAdd("audio")}
              disabled={busy}
              title="Add audio preset"
            >
              <PlusIcon />
            </button>
          </>
        }
      >
        <PresetList
          empty="No audio presets yet. Add one to save an output device."
          items={config.audioPresets.map((p) => ({
            id: p.id,
            primary: p.name,
            secondary: p.deviceName,
          }))}
          activeIds={activeAudioIds}
          busy={busy}
          onApply={(id) => run("Switched audio output", () => api.applyAudioPreset(id))}
          onEdit={(id) => openEdit("audio", id)}
          onDelete={(id) => run("Deleted audio preset", () => api.deleteAudioPreset(id))}
        />
      </Section>

      <Section
        id="master"
        title="Master presets"
        actions={
          <button
            className="ghost icon"
            onClick={() => openAdd("master")}
            disabled={busy}
            title="Add master preset"
          >
            <PlusIcon />
          </button>
        }
      >
        <PresetList
          empty="No master presets yet. Apply a monitor/audio combo, then add one (with an optional hotkey)."
          items={config.masterPresets.map((m) => ({
            id: m.id,
            primary: m.name,
            secondary: masterCombo(m),
            hotkey: m.hotkey ? prettyAccel(m.hotkey) : undefined,
          }))}
          activeIds={masterActiveIds}
          busy={busy}
          onApply={(id) => run("Applied master preset", () => api.applyMasterPreset(id))}
          onEdit={(id) => openEdit("master", id)}
          onDelete={(id) => run("Deleted master preset", () => api.deleteMasterPreset(id))}
          onReorder={reorderMaster}
        />
      </Section>
      </div>

      {dialog && (
        <div className="modal-backdrop" onMouseDown={closeDialog}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            {dialog === "about" ? (
              <About onClose={closeDialog} />
            ) : dialog === "monitor" ? (
              <AddMonitor
                initial={editMonitor ? { id: editMonitor.id, name: editMonitor.name } : undefined}
                onDone={onDialogDone}
                onCancel={closeDialog}
              />
            ) : dialog === "audio" ? (
              <AddAudio
                initial={
                  editAudio
                    ? { id: editAudio.id, name: editAudio.name, deviceId: editAudio.deviceId }
                    : undefined
                }
                onDone={onDialogDone}
                onCancel={closeDialog}
              />
            ) : (
              <AddMaster
                current={
                  editMaster
                    ? {
                        monitorId: editMaster.monitorPresetId ?? null,
                        monitorName: monName(editMaster.monitorPresetId),
                        audioId: editMaster.audioPresetId ?? null,
                        audioName: audName(editMaster.audioPresetId),
                      }
                    : currentSelection
                }
                initial={
                  editMaster
                    ? { id: editMaster.id, name: editMaster.name, hotkey: editMaster.hotkey ?? null }
                    : undefined
                }
                onDone={onDialogDone}
                onCancel={closeDialog}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/** Collapsible card section; remembers its open/closed state in localStorage. */
function Section(props: {
  id: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const key = `collapsed:${props.id}`;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(key) === "1");
  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(key, next ? "1" : "0");
      return next;
    });

  return (
    <section className={`card ${collapsed ? "collapsed" : ""}`}>
      <div className="card-head">
        <button className="card-title" onClick={toggle} aria-expanded={!collapsed}>
          <svg className="chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M2.5 4l2.5 2.5L7.5 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h2>{props.title}</h2>
        </button>
        {props.actions && <div className="card-actions">{props.actions}</div>}
      </div>
      {!collapsed && <div className="card-body">{props.children}</div>}
    </section>
  );
}

interface Row {
  id: string;
  primary: string;
  secondary?: string;
  hotkey?: string;
}

function PresetList(props: {
  items: Row[];
  empty: string;
  busy: boolean;
  activeIds: Set<string>;
  onApply: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}) {
  const { onReorder } = props;
  const [dragId, setDragId] = useState<string | null>(null);

  if (props.items.length === 0) {
    return <p className="empty">{props.empty}</p>;
  }

  const onDrop = (targetId: string) => {
    if (!onReorder || !dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = props.items.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    onReorder(ids);
  };

  return (
    <ul className="presets">
      {props.items.map((it) => {
        const active = props.activeIds.has(it.id);
        return (
          <li
            key={it.id}
            className={`${active ? "active" : ""} ${onReorder ? "draggable" : ""} ${
              dragId === it.id ? "dragging" : ""
            }`}
            draggable={!!onReorder}
            onDragStart={(e) => {
              setDragId(it.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", it.id);
            }}
            onDragOver={(e) => {
              if (onReorder) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              if (onReorder) e.preventDefault();
              onDrop(it.id);
            }}
            onDragEnd={() => setDragId(null)}
          >
            <span className="preset-name">
              <span className="preset-title-row">
                <span className="preset-title">{it.primary}</span>
                {active && (
                  <span className="check" title="Active" aria-label="Active">
                    ✓
                  </span>
                )}
              </span>
              {it.secondary && <small>{it.secondary}</small>}
              {it.hotkey && <small className="kbd">{it.hotkey}</small>}
            </span>
            <span className="preset-actions">
              <button disabled={props.busy} onClick={() => props.onApply(it.id)}>
                Apply
              </button>
              {props.onEdit && (
                <button
                  className="ghost icon"
                  disabled={props.busy}
                  onClick={() => props.onEdit!(it.id)}
                  title="Edit preset"
                >
                  <PencilIcon />
                </button>
              )}
              <button
                className="ghost danger icon"
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
