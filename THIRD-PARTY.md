# Third-party software

PepeSwitcher bundles the following freeware utilities by **NirSoft (Nir Sofer)**,
**unmodified**, to read and apply Windows display and audio settings. The
complete original package for each (executable, `.chm` help, and `readme.txt`
containing the full license terms) is included verbatim in the PepeSwitcher
installer.

## MultiMonitorTool

- Author: NirSoft
- Website / docs: https://www.nirsoft.net/utils/multi_monitor_tool.html
- Used by PepeSwitcher to save and restore monitor arrangements.

## SoundVolumeView

- Author: NirSoft
- Website / docs: https://www.nirsoft.net/utils/sound_volume_view.html
- Used by PepeSwitcher to list and switch the default audio output device.

## License / redistribution

These utilities are freeware and may be freely redistributed for non-commercial
use **provided they are not modified and the full package is distributed**.
PepeSwitcher ships each package in full and unmodified, in compliance with those
terms. All rights to these tools belong to their author, NirSoft. Refer to the
`readme.txt` inside each bundled package for the authoritative license text.

These tools are **not** stored in this repository; they are downloaded by
`npm run fetch:tools` (see `scripts/fetch-nirsoft.ps1`).
