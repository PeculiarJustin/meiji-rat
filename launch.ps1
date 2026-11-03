# Launch the Meiji and Rat desktop pet.
# Start-Process passes the project path (which contains a space) reliably.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:ELECTRON_RUN_AS_NODE = ""

# On this machine the Electron runtime must live outside the project path.
$runtime = "D:\electron-runtime\electron.exe"

if (-not (Test-Path $runtime)) {
  # On other machines, fall back to the Electron inside node_modules.
  $runtime = Join-Path $root "node_modules\.bin\electron.cmd"
}

Start-Process -FilePath $runtime -ArgumentList ('"{0}"' -f $root) -WorkingDirectory $root
