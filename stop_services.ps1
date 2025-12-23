# LAB 2 - Stop All Services Script (Windows PowerShell)

Write-Host " Stopping all services..." -ForegroundColor Red

# Use taskkill for better compatibility (doesn't require admin rights in most cases)
$result = taskkill /F /IM node.exe 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " All Node.js services stopped successfully!" -ForegroundColor Green
} elseif ($LASTEXITCODE -eq 128) {
    Write-Host " No Node.js services were running" -ForegroundColor Yellow
} else {
    Write-Host " Note: Some services may still be running (no admin rights)" -ForegroundColor Yellow
    Write-Host " Try running PowerShell as Administrator if services don't stop" -ForegroundColor Cyan
}
