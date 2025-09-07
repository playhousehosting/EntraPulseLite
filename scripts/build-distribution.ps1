# Build Distribution Script
# Builds multiple distribution formats for EntraPulse Lite

param(
    [string]$Type = "all",
    [switch]$Clean = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "Usage: .\build-distribution.ps1 [-Type <type>] [-Clean] [-Help]" -ForegroundColor Green
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -Type    : Type of build (portable, installer, msi, all)" -ForegroundColor White
    Write-Host "  -Clean   : Clean dist folder before building" -ForegroundColor White
    Write-Host "  -Help    : Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\build-distribution.ps1                    # Build all formats" -ForegroundColor Gray
    Write-Host "  .\build-distribution.ps1 -Type portable     # Build only portable" -ForegroundColor Gray
    Write-Host "  .\build-distribution.ps1 -Type installer    # Build only NSIS installer" -ForegroundColor Gray
    Write-Host "  .\build-distribution.ps1 -Type msi          # Build only MSI installer" -ForegroundColor Gray
    Write-Host "  .\build-distribution.ps1 -Clean             # Clean and build all" -ForegroundColor Gray
    exit 0
}

$ErrorActionPreference = "Stop"

Write-Host "🚀 EntraPulse Lite Distribution Builder" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Clean if requested
if ($Clean) {
    Write-Host "🧹 Cleaning build directories..." -ForegroundColor Yellow
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "dist-release") { Remove-Item -Recurse -Force "dist-release" }
}

# Build the application first
Write-Host "⚡ Building application..." -ForegroundColor Green
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✅ Application built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    exit 1
}

# Function to build specific target
function Build-Target {
    param($TargetName, $ElectronBuilderTarget)
    
    Write-Host "📦 Building $TargetName..." -ForegroundColor Blue
    try {
        $env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
        $env:WIN_CSC_IDENTITY_AUTO_DISCOVERY = "false"
        
        Invoke-Expression "electron-builder --config electron-builder-distribution.json --win $ElectronBuilderTarget --publish=never"
        
        if ($LASTEXITCODE -ne 0) {
            throw "$TargetName build failed"
        }
        Write-Host "✅ $TargetName built successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ $TargetName build failed: $_" -ForegroundColor Red
        return $false
    }
    return $true
}

# Build based on type
$success = $true

switch ($Type.ToLower()) {
    "portable" {
        $success = Build-Target "Portable EXE" "portable"
    }
    "installer" {
        $success = Build-Target "NSIS Installer" "nsis"
    }
    "msi" {
        $success = Build-Target "MSI Installer" "msi"
    }
    "all" {
        Write-Host "🔄 Building all distribution formats..." -ForegroundColor Magenta
        
        $portable = Build-Target "Portable EXE" "portable"
        $nsis = Build-Target "NSIS Installer" "nsis"
        $msi = Build-Target "MSI Installer" "msi"
        
        $success = $portable -and $nsis -and $msi
    }
    default {
        Write-Host "❌ Unknown build type: $Type" -ForegroundColor Red
        Write-Host "Valid types: portable, installer, msi, all" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Build Summary" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

if (Test-Path "dist-release") {
    $files = Get-ChildItem "dist-release" -File
    Write-Host "📁 Output directory: dist-release" -ForegroundColor Yellow
    Write-Host "📦 Generated files:" -ForegroundColor Green
    foreach ($file in $files) {
        $size = [math]::Round($file.Length / 1MB, 1)
        Write-Host "   • $($file.Name) ($size MB)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "🎉 Distribution files ready!" -ForegroundColor Green
    Write-Host "You can now:" -ForegroundColor Yellow
    Write-Host "  • Share the .exe files directly (no installation needed)" -ForegroundColor White
    Write-Host "  • Use installers for automated setup on other computers" -ForegroundColor White
    Write-Host "  • All files work without requiring npm or terminal access" -ForegroundColor White
} else {
    Write-Host "❌ No output files found" -ForegroundColor Red
    $success = $false
}

if ($success) {
    Write-Host ""
    Write-Host "✨ All builds completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "❌ Some builds failed. Check the output above." -ForegroundColor Red
    exit 1
}