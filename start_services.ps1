# LAB 2 - Start All Services Script (Windows PowerShell)
# This script starts all replicas and the client service

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Starting Lab 2 - Distributed Book Store with Replicas" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Create logs directory if it doesn't exist
if (!(Test-Path -Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Kill any existing node processes on these ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Catalog Replica 1
Write-Host "Starting Catalog Replica 1 (Port 3001)..." -ForegroundColor Green
$env:PORT = "3001"
$env:CLIENT_URL = "http://localhost:3000"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "catalog_service/server.js" -RedirectStandardOutput "logs/catalog-1.log" -RedirectStandardError "logs/catalog-1-error.log"
Start-Sleep -Seconds 1

# Start Catalog Replica 2
Write-Host "Starting Catalog Replica 2 (Port 3011)..." -ForegroundColor Green
$env:PORT = "3011"
$env:CLIENT_URL = "http://localhost:3000"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "catalog_service/server.js" -RedirectStandardOutput "logs/catalog-2.log" -RedirectStandardError "logs/catalog-2-error.log"
Start-Sleep -Seconds 1

# Start Order Replica 1
Write-Host "Starting Order Replica 1 (Port 3002)..." -ForegroundColor Green
$env:PORT = "3002"
$env:CATALOG_URLS = "http://localhost:3001,http://localhost:3011"
$env:CLIENT_URL = "http://localhost:3000"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "order_service/server.js" -RedirectStandardOutput "logs/order-1.log" -RedirectStandardError "logs/order-1-error.log"
Start-Sleep -Seconds 1

# Start Order Replica 2
Write-Host "Starting Order Replica 2 (Port 3012)..." -ForegroundColor Green
$env:PORT = "3012"
$env:CATALOG_URLS = "http://localhost:3001,http://localhost:3011"
$env:CLIENT_URL = "http://localhost:3000"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "order_service/server.js" -RedirectStandardOutput "logs/order-2.log" -RedirectStandardError "logs/order-2-error.log"
Start-Sleep -Seconds 1

# Start Client (Front-End)
Write-Host "Starting Client/Front-End (Port 3000)..." -ForegroundColor Green
$env:PORT = "3000"
$env:CATALOG_URLS = "http://localhost:3001,http://localhost:3011"
$env:ORDER_URLS = "http://localhost:3002,http://localhost:3012"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "client_service/server.js" -RedirectStandardOutput "logs/client.log" -RedirectStandardError "logs/client-error.log"
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running on:" -ForegroundColor White
Write-Host "  Client:            http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Catalog Replica 1: http://localhost:3001" -ForegroundColor Yellow
Write-Host "  Catalog Replica 2: http://localhost:3011" -ForegroundColor Yellow
Write-Host "  Order Replica 1:   http://localhost:3002" -ForegroundColor Yellow
Write-Host "  Order Replica 2:   http://localhost:3012" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs available in ./logs/ directory" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop all services, run: .\stop_services.ps1" -ForegroundColor Magenta
Write-Host "To test performance, run: node test_performance.js" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Cyan
