# Downloads the full NirSoft utility packages used by PepeSwitcher.
#
# These third-party tools are NOT committed to the repo (see .gitignore). Run
# this once after cloning, before `npm run tauri dev` or `npm run tauri build`.
#
# It places, for each tool:
#   * the complete, unmodified package in  src-tauri/resources/nirsoft/<tool>/
#     (bundled verbatim into the installer, per NirSoft's redistribution terms)
#   * a copy of the executable in           src-tauri/binaries/<name>-<triple>.exe
#     (the Tauri "sidecar" the app actually invokes)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$triple = 'x86_64-pc-windows-msvc'
$resBase = Join-Path $root 'src-tauri\resources\nirsoft'
$binBase = Join-Path $root 'src-tauri\binaries'
New-Item -ItemType Directory -Force -Path $binBase | Out-Null

$tools = @(
    @{ url = 'https://www.nirsoft.net/utils/multimonitortool-x64.zip'; dir = 'multimonitortool'; exe = 'MultiMonitorTool.exe'; bin = 'multimonitortool' },
    @{ url = 'https://www.nirsoft.net/utils/soundvolumeview-x64.zip'; dir = 'soundvolumeview'; exe = 'SoundVolumeView.exe'; bin = 'soundvolumeview' }
)

foreach ($t in $tools) {
    $dest = Join-Path $resBase $t.dir
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null

    $zip = Join-Path $env:TEMP ("pepeswitcher-" + $t.bin + '.zip')
    Write-Host "Downloading $($t.url) ..."
    Invoke-WebRequest -Uri $t.url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    Remove-Item $zip -Force

    $exeSrc = Join-Path $dest $t.exe
    if (-not (Test-Path $exeSrc)) { throw "Expected $($t.exe) in package $($t.dir)" }
    Copy-Item $exeSrc (Join-Path $binBase ("{0}-{1}.exe" -f $t.bin, $triple)) -Force

    $files = (Get-ChildItem $dest | Measure-Object).Count
    Write-Host "  $($t.dir): $files files -> $dest"
}

Write-Host "Done."
