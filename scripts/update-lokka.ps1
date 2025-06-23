#!/usr/bin/env pwsh

# Script to ensure latest Lokka version is installed and cached by NPX
# Run this if you're getting "Token update only supported in client provided token mode" errors

Write-Host "Clearing NPX cache..." -ForegroundColor Yellow
npx clear-npx-cache

Write-Host "Installing latest Lokka version..." -ForegroundColor Yellow
npx --yes @merill/lokka@latest --version

Write-Host "Verifying Lokka version..." -ForegroundColor Green
npx --yes @merill/lokka@latest --help

Write-Host "Done! Please restart EntraPulse Lite." -ForegroundColor Green
