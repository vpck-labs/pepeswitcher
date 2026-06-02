# PepeSwitcher

A lightweight Windows tray app for quickly switching **monitor arrangements** and
**audio output devices**, plus combined **master presets** that restore a
monitor + audio combo with a single global hotkey.

Built with [Tauri 2](https://tauri.app/) + React + TypeScript.

## Releases

- [Downloads here](https://github.com/vpck-labs/pepeswitcher/releases/latest)

## Features

- **Monitor presets** - save and restore your display layout (positions,
  resolutions, which displays are enabled).
- **Audio presets** - switch the default output device in one click.
- **Master presets** - snapshot the current monitor + audio selection and bind
  it to a global keyboard shortcut.
- **Live active indicators** - reflect the real current system state, not just
  the last thing you clicked (re-checked on reload).
- Frameless panel docked to the bottom-right, lives in the tray, optional
  launch-on-startup.

## Prerequisites to build

- Windows 10/11
- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install) (stable `x86_64-pc-windows-msvc`)
- MSVC C++ build tools (Visual Studio Build Tools with the "Desktop development
  with C++" workload) - required to compile Tauri on Windows.

## Setup

```sh
npm install
npm run fetch:tools   # downloads the bundled NirSoft utilities (see below)
```

`fetch:tools` is required before the first dev/build run - the NirSoft tools are
not committed to this repo.

## Develop

```sh
npm run tauri dev
```

## Build installers

```sh
npm run tauri build
```

Produces an MSI and an NSIS setup under `src-tauri/target/release/bundle/`. The
installers are **unsigned**, so Windows SmartScreen will warn on first run
(More info → Run anyway). Distribute them via GitHub Releases rather than
committing them.

## Third-party tools

PepeSwitcher drives Windows display/audio settings using two freeware
[NirSoft](https://www.nirsoft.net/) utilities, bundled **unmodified** (full
package, including help and readme) in the installer:

- [MultiMonitorTool](https://www.nirsoft.net/utils/multi_monitor_tool.html) - save/restore monitor arrangements
- [SoundVolumeView](https://www.nirsoft.net/utils/sound_volume_view.html) - switch the default audio output

See [THIRD-PARTY.md](THIRD-PARTY.md). These tools are fetched by
`npm run fetch:tools`, not stored in the repository.

## License

PepeSwitcher is released under the **GNU General Public License v3.0** (see
[`LICENSE`](LICENSE)). The bundled NirSoft tools remain under their own freeware
license and are not covered by this project's GPL.

Developed by **vpck** · https://github.com/vpck-labs/pepeswitcher
