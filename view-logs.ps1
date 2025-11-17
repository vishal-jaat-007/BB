# Windows PowerShell Script - View Logs

Write-Host "📊 Viewing Server Logs (Press Ctrl+C to stop)..." -ForegroundColor Cyan

Set-Location "C:\Users\Vishal\Desktop\cashfree-wallet-backend\cashfree-wallet-backend"

Get-Content server_live.log -Wait -Tail 50


