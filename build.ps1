Start-Transcript -Path "C:\Users\shilo2\Desktop\Give\my-agent-app\build.log" -Force
cd "C:\Users\shilo2\Desktop\Give\my-agent-app"
$env:ANDROID_HOME = "C:\Users\shilo2\AppData\Local\Android\Sdk"
$env:NODE_ENV = "development"
$env:TEMP = "C:\Users\shilo2\Desktop\Give\my-agent-app\tmp"
$env:TMP = "C:\Users\shilo2\Desktop\Give\my-agent-app\tmp"

Write-Output "Stopping WSL..."
try {
    wsl --shutdown
} catch {
    Write-Output "WSL shutdown skipped or failed"
}

Write-Output "Cleaning .cxx directories..."
Add-Type -AssemblyName Microsoft.VisualBasic
Get-ChildItem -Path "C:\Users\shilo2\Desktop\Give\my-agent-app" -Filter ".cxx" -Recurse -Directory -Force | ForEach-Object {
    $dirPath = $_.FullName
    Write-Output "Moving .cxx folder to Recycle Bin: $dirPath"
    try {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($dirPath, 'OnlyErrorDialogs', 'SendToRecycleBin')
    } catch {
        Write-Output "Error deleting $dirPath : $_"
    }
}

cd android
Write-Output "Running gradlew clean..."
./gradlew clean

Write-Output "Running gradlew installDebug..."
./gradlew installDebug

Stop-Transcript
