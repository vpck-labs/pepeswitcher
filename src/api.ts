import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  AudioDevice,
  AudioPreset,
  MasterPreset,
  MonitorPreset,
} from "./types";

export const getConfig = () => invoke<AppConfig>("get_config");

export const saveMonitorPreset = (name: string) =>
  invoke<MonitorPreset>("save_monitor_preset", { name });
export const applyMonitorPreset = (id: string) =>
  invoke<void>("apply_monitor_preset", { id });
export const activeMonitorPresets = () => invoke<string[]>("active_monitor_presets");
export const deleteMonitorPreset = (id: string) =>
  invoke<void>("delete_monitor_preset", { id });

export const listAudioDevices = () => invoke<AudioDevice[]>("list_audio_devices");
export const saveAudioPreset = (name: string, deviceId: string, deviceName: string) =>
  invoke<AudioPreset>("save_audio_preset", { name, deviceId, deviceName });
export const applyAudioPreset = (id: string) =>
  invoke<void>("apply_audio_preset", { id });
export const deleteAudioPreset = (id: string) =>
  invoke<void>("delete_audio_preset", { id });

export const getAutostart = () => invoke<boolean>("get_autostart");
export const setAutostart = (enabled: boolean) =>
  invoke<void>("set_autostart", { enabled });

export const saveMasterPreset = (
  name: string,
  monitorPresetId: string | null,
  audioPresetId: string | null,
  hotkey: string | null,
) =>
  invoke<MasterPreset>("save_master_preset", {
    name,
    monitorPresetId,
    audioPresetId,
    hotkey,
  });
export const applyMasterPreset = (id: string) =>
  invoke<void>("apply_master_preset", { id });
export const reorderMasterPresets = (orderedIds: string[]) =>
  invoke<void>("reorder_master_presets", { orderedIds });
export const deleteMasterPreset = (id: string) =>
  invoke<void>("delete_master_preset", { id });

export const hideWindow = () => invoke<void>("hide_window");
