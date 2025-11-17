# Windows PowerShell Script - Server Start

Write-Host "🚀 Starting Server..." -ForegroundColor Green

# Change to project directory
Set-Location "C:\Users\Vishal\Desktop\cashfree-wallet-backend\cashfree-wallet-backend"

# Start server in background with logs
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Vishal\Desktop\cashfree-wallet-backend\cashfree-wallet-backend; node index.js *> server_live.log" -WindowStyle Minimized

Write-Host "✅ Server started in background!" -ForegroundColor Green
Write-Host "📊 View logs: Get-Content server_live.log -Wait" -ForegroundColor Yellow
Write-Host "🛑 Stop server: Get-Process node | Stop-Process -Force" -ForegroundColor Yellow


