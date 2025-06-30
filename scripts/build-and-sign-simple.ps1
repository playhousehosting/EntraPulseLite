param(
    [switch]$Publish = $false,
    [switch]$Clean = $false
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges for code signing." -ForegroundColor Red
    Write-Host "Please run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "Starting build and sign process..." -ForegroundColor Green
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Gray

# Clean if requested
if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "dist-release") { Remove-Item -Recurse -Force "dist-release" }
    if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }
}

# Verify certificate is available
Write-Host "Verifying code signing certificate..." -ForegroundColor Cyan
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*CN=Darren J Robinson*" -and $_.NotAfter -gt (Get-Date) }
if (-not $cert) {
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*CN=Darren J Robinson*" -and $_.NotAfter -gt (Get-Date) }
}

if (-not $cert) {
    Write-Host "ERROR: Code signing certificate 'Darren J Robinson' not found!" -ForegroundColor Red
    Write-Host "Available certificates:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\LocalMachine\My | Select-Object Subject, NotAfter | Format-Table
    Get-ChildItem -Path Cert:\CurrentUser\My | Select-Object Subject, NotAfter | Format-Table
    exit 1
}

Write-Host "Found certificate: $($cert.Subject)" -ForegroundColor Green
Write-Host "Certificate expires: $($cert.NotAfter)" -ForegroundColor Green
Write-Host "Certificate thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# Test signtool access to certificate
Write-Host "Testing signtool access to certificate..." -ForegroundColor Cyan
$testResult = & signtool sign /v /sm /s My /n "Darren J Robinson" /fd sha256 /tr "http://timestamp.digicert.com" /td sha256 "package.json" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Signtool can access the certificate successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Signtool cannot access the certificate:" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Set environment variables for electron-builder
$env:WIN_CSC_IDENTITY_AUTO_DISCOVERY = "true"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "true"

# Build and sign with electron-builder
Write-Host "Running electron-builder with signing..." -ForegroundColor Cyan
if ($Publish) {
    Write-Host "Publishing to GitHub..." -ForegroundColor Yellow
    npx electron-builder --win --publish=always
} else {
    Write-Host "Building without publishing..." -ForegroundColor Yellow
    npx electron-builder --win --publish=never
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Electron-builder failed!" -ForegroundColor Red
    exit 1
}

# Verify signatures
Write-Host "Verifying signatures on built executables..." -ForegroundColor Cyan
$signedFiles = @()
if (Test-Path "dist-release") {
    $exeFiles = Get-ChildItem -Path "dist-release" -Recurse -Include "*.exe" -ErrorAction SilentlyContinue
    foreach ($file in $exeFiles) {
        Write-Host "Checking signature on: $($file.FullName)" -ForegroundColor Gray
        $signature = Get-AuthenticodeSignature -FilePath $file.FullName
        if ($signature.Status -eq "Valid") {
            Write-Host "✓ $($file.Name) is properly signed" -ForegroundColor Green
            Write-Host "  Signer: $($signature.SignerCertificate.Subject)" -ForegroundColor Gray
            $signedFiles += $file.FullName
        } else {
            Write-Host "✗ $($file.Name) signature status: $($signature.Status)" -ForegroundColor Red
        }
    }
}

if ($signedFiles.Count -gt 0) {
    Write-Host "`nSUCCESS: Found $($signedFiles.Count) properly signed executable(s):" -ForegroundColor Green
    $signedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
} else {
    Write-Host "`nWARNING: No signed executables found!" -ForegroundColor Yellow
}

Write-Host "`nBuild and sign process completed!" -ForegroundColor Green
