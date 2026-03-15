param(
    [string]$TaskName = "CryptoSyncRetrain",
    [int]$EveryMinutes = 30,
    [string]$PythonExe = "",
    [string]$ProjectRoot = "",
    [switch]$Unregister
)

if (-not $ProjectRoot) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

if (-not $PythonExe) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $PythonExe = $pythonCmd.Source
    } else {
        throw "Python executable not found. Pass -PythonExe explicitly."
    }
}

$RunnerScript = Join-Path $ProjectRoot "backened\pipeline_runner.py"
$LogPath = Join-Path $ProjectRoot "backened\sync_train_scheduler.log"

if ($Unregister) {
    schtasks /Delete /TN $TaskName /F | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to delete task: $TaskName"
    }
    Write-Host "Deleted task: $TaskName"
    exit 0
}

if ($EveryMinutes -lt 1 -or $EveryMinutes -gt 1439) {
    throw "EveryMinutes must be between 1 and 1439."
}

if (-not (Test-Path $RunnerScript)) {
    throw "Runner script not found: $RunnerScript"
}

$TaskCommand = "cmd /c cd /d `"$ProjectRoot`" ^&^& set PYTHONUTF8=1 ^&^& `"$PythonExe`" `"$RunnerScript`" >> `"$LogPath`" 2^>^&1"

$null = schtasks /Create /SC MINUTE /MO $EveryMinutes /TN $TaskName /TR $TaskCommand /F
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create scheduled task: $TaskName"
}
Write-Host "Scheduled task created:"
Write-Host "TaskName: $TaskName"
Write-Host "Interval: every $EveryMinutes minute(s)"
Write-Host "Python: $PythonExe"
Write-Host "Runner: $RunnerScript"
Write-Host "Log: $LogPath"
