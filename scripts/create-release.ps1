#!/usr/bin/env pwsh
# EntraPulse Lite Release Script

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [switch]$Beta,
    
    [switch]$DryRun
)

Write-Host "🚀 EntraPulse Lite Release Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Validate version format
if ($Version -notmatch '^v?\d+\.\d+\.\d+(-\w+\.\d+)?$') {
    Write-Error "Invalid version format. Use: v1.0.0 or v1.0.0-beta.1"
    exit 1
}

# Ensure version starts with 'v'
if (-not $Version.StartsWith('v')) {
    $Version = "v$Version"
}

Write-Host "📋 Release Information:" -ForegroundColor Cyan
Write-Host "  Version: $Version"
Write-Host "  Beta: $Beta"
Write-Host "  Dry Run: $DryRun"
Write-Host ""

# Pre-release checks
Write-Host "🔍 Running pre-release checks..." -ForegroundColor Yellow

if (-not $DryRun) {
    # Run tests
    Write-Host "Running tests..."
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tests failed. Aborting release."
        exit 1
    }

    # Run security check
    Write-Host "Running security checks..."
    npm run security:check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Security checks failed. Aborting release."
        exit 1
    }

    # Build the application
    Write-Host "Building application..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed. Aborting release."
        exit 1
    }
}

Write-Host "✅ Pre-release checks completed" -ForegroundColor Green

if ($DryRun) {
    Write-Host "🔍 Dry run completed. Would create release: $Version" -ForegroundColor Yellow
    exit 0
}

# Create and push tag
Write-Host "🏷️  Creating and pushing tag: $Version" -ForegroundColor Cyan
git tag $Version
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create tag. Aborting release."
    exit 1
}

git push origin $Version
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push tag. Aborting release."
    exit 1
}

Write-Host "🎉 Release $Version initiated!" -ForegroundColor Green
Write-Host "📊 Check GitHub Actions for build progress:" -ForegroundColor Cyan
Write-Host "   https://github.com/darrenjrobinson/EntraPulseLite/actions" -ForegroundColor Blue
Write-Host ""
Write-Host "📦 Release will be available at:" -ForegroundColor Cyan
Write-Host "   https://github.com/darrenjrobinson/EntraPulseLite/releases" -ForegroundColor Blue
