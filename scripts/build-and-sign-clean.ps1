param(
    [Parameter(Mandatory=$false)]
    [switch]$Publish = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = $null,
    
    [Parameter(Mandatory=$false)]
    [string]$CertThumbprint = "03ea1833246380e76e393d76a53f42bbaf1eba87"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting EntraPulse Lite build and sign process..." -ForegroundColor Green

# Add Windows SDK to PATH for this session
$WindowsKitsPath = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
if (Test-Path $WindowsKitsPath) {
    Write-Host "Adding Windows SDK to PATH: $WindowsKitsPath" -ForegroundColor Cyan
    $env:PATH = "$WindowsKitsPath;$env:PATH"
} else {
    Write-Host "Warning: Windows SDK path not found: $WindowsKitsPath" -ForegroundColor Yellow
}

# Test signtool availability
Write-Host "`n=== Testing signtool availability ===" -ForegroundColor Cyan
try {
    & signtool.exe 2>&1 | Select-Object -First 1 | Out-Null
    Write-Host "✓ signtool is available" -ForegroundColor Green
    Write-Host "signtool found at: $(Get-Command signtool.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)" -ForegroundColor Gray
} catch {
    Write-Host "✗ signtool not found in PATH" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Verify certificate exists - check both LocalMachine and CurrentUser stores
Write-Host "Verifying code signing certificate..." -ForegroundColor Yellow

# First try LocalMachine store (for certificates installed for all users)
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}

# If not found, try CurrentUser store (for user-specific certificates)
if (-not $cert) {
    Write-Host "Certificate not found in LocalMachine store, checking CurrentUser store..." -ForegroundColor Yellow
    $cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}
}

if (-not $cert) {
    Write-Host "Certificate with thumbprint $CertThumbprint not found in either store!" -ForegroundColor Red
    Write-Host "Available certificates in LocalMachine\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\LocalMachine\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    Write-Host "Available certificates in CurrentUser\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\CurrentUser\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    exit 1
}

Write-Host "Certificate found: $($cert.Subject)" -ForegroundColor Green

# Verify this is the Darren J Robinson certificate
if ($cert.Subject -notlike "*Darren J Robinson*") {
    Write-Host "Warning: Certificate subject '$($cert.Subject)' does not contain 'Darren J Robinson'" -ForegroundColor Yellow
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Set version if provided
if ($Version) {
    Write-Host "Setting version to: $Version" -ForegroundColor Cyan
    $env:npm_package_version = $Version
}

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "dist-release") {
    Remove-Item -Recurse -Force "dist-release"
}

# Build the application first
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

# Set environment variables for electron-builder
$env:CSC_LINK = $null
$env:CSC_KEY_PASSWORD = $null
$env:CSC_NAME = "Darren J Robinson"
$env:WIN_CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:WIN_CSC_SUBJECT_NAME = "Darren J Robinson"
$env:WIN_CSC_SHA1 = $CertThumbprint
$env:DEBUG = "electron-builder"

Write-Host "Environment variables set:" -ForegroundColor Cyan
Write-Host "  CSC_NAME: $env:CSC_NAME" -ForegroundColor White
Write-Host "  WIN_CSC_IDENTITY_AUTO_DISCOVERY: $env:WIN_CSC_IDENTITY_AUTO_DISCOVERY" -ForegroundColor White
Write-Host "  WIN_CSC_SUBJECT_NAME: $env:WIN_CSC_SUBJECT_NAME" -ForegroundColor White
Write-Host "  WIN_CSC_SHA1: $env:WIN_CSC_SHA1" -ForegroundColor White
Write-Host "  DEBUG: $env:DEBUG" -ForegroundColor White

# Test if signtool can access the certificate
Write-Host "Testing signtool certificate access..." -ForegroundColor Yellow
Write-Host "Note: Skipping signtool test file signing (requires executable file)" -ForegroundColor Cyan
Write-Host "Certificate validation will happen during actual executable signing..." -ForegroundColor Cyan

# Build with electron-builder (without running npm run build again)
Write-Host "Building Electron app with signing..." -ForegroundColor Yellow

# Create a temporary electron-builder config with signtool options for Windows store certificate
$tempConfig = @{
    appId = "com.darrenjrobinson.entrapulselite"
    productName = "EntraPulse Lite"
    directories = @{
        output = "dist-release"
    }
    files = @(
        "dist/**/*",
        "package.json",
        "assets/**/*"
    )
    win = @{
        target = @(
            @{
                target = "nsis"
                arch = @("x64")
            },
            @{
                target = "portable"
                arch = @("x64")
            }
        )
        icon = "assets/icon.ico"
        verifyUpdateCodeSignature = $false
        signtoolOptions = @{
            certificateSubjectName = "Darren J Robinson"
            certificateSha1 = $CertThumbprint
            rfc3161TimeStampServer = "http://timestamp.digicert.com"
            signingHashAlgorithms = @("sha256")
        }
    }
    nsis = @{
        oneClick = $false
        allowElevation = $true
        allowToChangeInstallationDirectory = $true
        installerIcon = "assets/icon.ico"
        uninstallerIcon = "assets/icon.ico"
        installerHeaderIcon = "assets/icon.ico"
        createDesktopShortcut = $true
        createStartMenuShortcut = $true
    }
}

# Write temporary config file
$tempConfigFile = "electron-builder-signing.json"
$tempConfig | ConvertTo-Json -Depth 10 | Set-Content $tempConfigFile

Write-Host "Using temporary config file with signtool configuration..." -ForegroundColor Cyan

if ($Publish) {
    npx electron-builder --config $tempConfigFile --publish=always
} else {
    npx electron-builder --config $tempConfigFile --publish=never
}

# Clean up temporary config file
Remove-Item $tempConfigFile -ErrorAction SilentlyContinue

# Verify the signed executable
$exeFiles = Get-ChildItem -Path "dist-release" -Filter "*.exe" -Recurse
if ($exeFiles) {
    foreach ($exeFile in $exeFiles) {
        Write-Host "Verifying signature on: $($exeFile.FullName)" -ForegroundColor Yellow
        $signature = Get-AuthenticodeSignature -FilePath $exeFile.FullName
        
        if ($signature.Status -eq "Valid") {
            Write-Host "Executable signature is valid!" -ForegroundColor Green
            Write-Host "Subject: $($signature.SignerCertificate.Subject)" -ForegroundColor White
            Write-Host "Thumbprint: $($signature.SignerCertificate.Thumbprint)" -ForegroundColor White
        } else {
            Write-Host "Executable signature is invalid: $($signature.Status)" -ForegroundColor Red
            Write-Host "Status message: $($signature.StatusMessage)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No executable found in dist-release folder" -ForegroundColor Yellow
}

Write-Host "Build and sign process completed!" -ForegroundColor Green
Write-Host "Output location: $(Resolve-Path 'dist-release')" -ForegroundColor Cyan
