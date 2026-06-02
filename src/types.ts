export interface MonitorPreset {
  id: string;
  name: string;
  file: string;
  hotkey?: string | null;
}

export interface AudioPreset {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  hotkey?: string | null;
}

export interface AppConfig {
  monitorPresets: MonitorPreset[];
  audioPresets: AudioPreset[];
}

export interface AudioDevice {
  name: string;
  id: string;
  isDefault: boolean;
}
