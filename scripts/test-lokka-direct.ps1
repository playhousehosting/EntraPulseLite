#!/usr/bin/env pwsh

# Simple test to verify Lokka client token mode works
Write-Host "🧪 Testing Lokka Client Token Mode - Direct Test" -ForegroundColor Cyan
Write-Host "=" * 60

# Check if access token is provided
$testToken = $env:ACCESS_TOKEN
if (-not $testToken) {
    Write-Host "❌ No ACCESS_TOKEN environment variable provided" -ForegroundColor Red
    Write-Host "Please set ACCESS_TOKEN environment variable and run again" -ForegroundColor Yellow
    Write-Host "Example: `$env:ACCESS_TOKEN='your-token'; .\test-lokka-direct.ps1"
    exit 1
}

Write-Host "✅ Access token found (length: $($testToken.Length))" -ForegroundColor Green

# Set environment variables for Lokka
$env:USE_CLIENT_TOKEN = "true"
Write-Host "🔧 Set USE_CLIENT_TOKEN=true" -ForegroundColor Yellow

# Test 1: Check if Lokka recognizes the environment variable
Write-Host "`n📋 Test 1: Starting Lokka with USE_CLIENT_TOKEN=true..." -ForegroundColor Cyan

# Start Lokka and capture output
$lokkaProcess = Start-Process -FilePath "npx" -ArgumentList "@merill/lokka@latest" -PassThru -NoNewWindow -RedirectStandardOutput "lokka-output.txt" -RedirectStandardError "lokka-error.txt"

# Wait for process to start
Start-Sleep -Seconds 3

# Send initialize request
Write-Host "📤 Sending initialize request..." -ForegroundColor Yellow
$initRequest = @{
    id = 1
    jsonrpc = "2.0"
    method = "initialize"
    params = @{
        protocolVersion = "2024-11-05"
        capabilities = @{ tools = @{} }
        clientInfo = @{ name = "TestClient"; version = "1.0.0" }
    }
} | ConvertTo-Json -Compress

Write-Host "Request: $initRequest"
$initRequest | Out-File -FilePath "lokka-input.txt" -Encoding UTF8

# Check if process is still running
if ($lokkaProcess.HasExited) {
    Write-Host "❌ Lokka process exited unexpectedly" -ForegroundColor Red
    Write-Host "Exit code: $($lokkaProcess.ExitCode)"
    
    if (Test-Path "lokka-error.txt") {
        Write-Host "`n🔍 Error output:" -ForegroundColor Red
        Get-Content "lokka-error.txt"
    }
    
    if (Test-Path "lokka-output.txt") {
        Write-Host "`n📋 Standard output:" -ForegroundColor Blue
        Get-Content "lokka-output.txt"
    }
} else {
    Write-Host "✅ Lokka process is running (PID: $($lokkaProcess.Id))" -ForegroundColor Green
    
    # Kill the process
    $lokkaProcess.Kill()
    Write-Host "🧹 Process terminated" -ForegroundColor Yellow
}

# Clean up
Remove-Item -Path "lokka-output.txt" -ErrorAction SilentlyContinue
Remove-Item -Path "lokka-error.txt" -ErrorAction SilentlyContinue
Remove-Item -Path "lokka-input.txt" -ErrorAction SilentlyContinue

Write-Host "`n✅ Test completed" -ForegroundColor Green
