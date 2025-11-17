# Windows PowerShell Script - Server Restart

Write-Host "🔄 Restarting Server..." -ForegroundColor Yellow

# Stop existing server
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "📴 Stopping existing server..." -ForegroundColor Yellow
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Change to project directory
Set-Location "C:\Users\Vishal\Desktop\cashfree-wallet-backend\cashfree-wallet-backend"

# Start server in background with logs
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Vishal\Desktop\cashfree-wallet-backend\cashfree-wallet-backend; node index.js *> server_live.log" -WindowStyle Minimized

Write-Host "✅ Server restarted!" -ForegroundColor Green
Write-Host "📊 View logs: Get-Content server_live.log -Wait" -ForegroundColor Yellow


