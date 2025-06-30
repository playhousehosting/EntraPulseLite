param(
    [Parameter(Mandatory=$false)]
    [switch]$Publish = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = $null,
    
    [Parameter(Mandatory=$false)]
    [string]$CertThumbprint = "03ea1833246380e76e393d76a53f42bbaf1eba87"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting EntraPulse Lite build and sign process..." -ForegroundColor Green

# Verify certificate exists - check both LocalMachine and CurrentUser stores
Write-Host "🔍 Verifying code signing certificate..." -ForegroundColor Yellow

# First try LocalMachine store (for certificates installed for all users)
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}

# If not found, try CurrentUser store (for user-specific certificates)
if (-not $cert) {
    Write-Host "🔍 Certificate not found in LocalMachine store, checking CurrentUser store..." -ForegroundColor Yellow
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}
}

if (-not $cert) {
    Write-Host "❌ Certificate with thumbprint $CertThumbprint not found in either store!" -ForegroundColor Red
    Write-Host "Available certificates in LocalMachine\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\LocalMachine\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    Write-Host "Available certificates in CurrentUser\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\CurrentUser\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    exit 1
}

Write-Host "✅ Certificate found: $($cert.Subject)" -ForegroundColor Green

# Verify this is the Darren J Robinson certificate
if ($cert.Subject -notlike "*Darren J Robinson*") {
    Write-Host "⚠️ Warning: Certificate subject '$($cert.Subject)' does not contain 'Darren J Robinson'" -ForegroundColor Yellow
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Set version if provided
if ($Version) {
    Write-Host "📝 Setting version to: $Version" -ForegroundColor Cyan
    $env:npm_package_version = $Version
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "dist-release") {
    Remove-Item -Recurse -Force "dist-release"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build

# Set environment variables for electron-builder
$env:CSC_LINK = $null  # Don't use file-based certificate
$env:CSC_KEY_PASSWORD = $null  # Not needed for store certificates
$env:CSC_NAME = "Darren J Robinson"
$env:WIN_CSC_IDENTITY_AUTO_DISCOVERY = "true"
$env:WIN_CSC_SUBJECT_NAME = "Darren J Robinson"

# Build with electron-builder
Write-Host "📱 Building Electron app with signing..." -ForegroundColor Yellow
if ($Publish) {
    npm run release
} else {
    npm run release:local
}

# Verify the signed executable
$exePath = Get-ChildItem -Path "dist-release" -Filter "*.exe" -Recurse | Select-Object -First 1
if ($exePath) {
    Write-Host "🔍 Verifying signature on: $($exePath.FullName)" -ForegroundColor Yellow
    $signature = Get-AuthenticodeSignature -FilePath $exePath.FullName
    
    if ($signature.Status -eq "Valid") {
        Write-Host "✅ Executable signature is valid!" -ForegroundColor Green
        Write-Host "📋 Signature details:" -ForegroundColor Cyan
        Write-Host "   Subject: $($signature.SignerCertificate.Subject)" -ForegroundColor White
        Write-Host "   Thumbprint: $($signature.SignerCertificate.Thumbprint)" -ForegroundColor White
        Write-Host "   Timestamp: $($signature.TimeStamperCertificate.NotBefore)" -ForegroundColor White
    } else {
        Write-Host "❌ Executable signature is invalid: $($signature.Status)" -ForegroundColor Red
        Write-Host "❌ Status message: $($signature.StatusMessage)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️ No executable found in dist folder" -ForegroundColor Yellow
}

Write-Host "🎉 Build and sign process completed successfully!" -ForegroundColor Green
Write-Host "📁 Output location: $(Resolve-Path 'dist-release')" -ForegroundColor Cyan
