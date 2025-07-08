param(
    [string]$CertThumbprint = "03ea1833246380e76e393d76a53f42bbaf1eba87",
    [string]$OutputPath = "DarrenJRobinson-CodeSigning.pfx"
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Exporting certificate for GitHub Actions..." -ForegroundColor Green
Write-Host "Certificate Thumbprint: $CertThumbprint" -ForegroundColor Cyan

# Find the certificate in both stores - try CurrentUser first as it's more likely to be exportable
Write-Host "🔍 Searching for certificate..." -ForegroundColor Yellow

# First try CurrentUser store (more likely to be exportable)
$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}
$storeLocation = "CurrentUser"

# If not found, try LocalMachine store
if (-not $cert) {
    Write-Host "Certificate not found in CurrentUser store, checking LocalMachine store..." -ForegroundColor Yellow
    $cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}
    $storeLocation = "LocalMachine"
}

if (-not $cert) {
    Write-Host "❌ Certificate with thumbprint $CertThumbprint not found!" -ForegroundColor Red
    Write-Host "Available certificates in LocalMachine\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\LocalMachine\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    Write-Host "Available certificates in CurrentUser\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\CurrentUser\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    exit 1
}

Write-Host "✅ Certificate found in $storeLocation store" -ForegroundColor Green
Write-Host "Subject: $($cert.Subject)" -ForegroundColor White
Write-Host "Issuer: $($cert.Issuer)" -ForegroundColor White
Write-Host "Valid from: $($cert.NotBefore)" -ForegroundColor White
Write-Host "Valid until: $($cert.NotAfter)" -ForegroundColor White

# Check if certificate has a private key
if (-not $cert.HasPrivateKey) {
    Write-Host "❌ Certificate does not have a private key! Cannot export for code signing." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Certificate has private key" -ForegroundColor Green

# Prompt for password to protect the exported certificate
$password = Read-Host -Prompt "Enter password to protect the exported certificate (.pfx file)" -AsSecureString

# Export the certificate with private key
try {
    Write-Host "📦 Exporting certificate to: $OutputPath" -ForegroundColor Yellow
    
    # Get full path for export - ensure we have a valid path
    $currentLocation = Get-Location
    Write-Host "Current location: $currentLocation" -ForegroundColor Gray
    
    if ([System.IO.Path]::IsPathRooted($OutputPath)) {
        $fullPath = $OutputPath
    } else {
        $fullPath = Join-Path $currentLocation.Path $OutputPath
    }
    
    Write-Host "Full export path: $fullPath" -ForegroundColor Gray
    
    # Export the certificate with private key to PFX format
    $cert | Export-PfxCertificate -FilePath $fullPath -Password $password -Force
    
    Write-Host "✅ Certificate exported successfully!" -ForegroundColor Green
    Write-Host "📁 File location: $fullPath" -ForegroundColor Cyan
    
    # Get file size
    $fileInfo = Get-Item $fullPath
    Write-Host "📊 File size: $($fileInfo.Length) bytes" -ForegroundColor White
    
    # Now convert to base64 for GitHub Secrets
    Write-Host "`n🔄 Converting to base64 for GitHub Secrets..." -ForegroundColor Yellow
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($fullPath))
    
    # Save base64 to text file
    $base64File = $fullPath.Replace('.pfx', '-base64.txt')
    $base64 | Out-File -FilePath $base64File -Encoding ASCII
    
    Write-Host "✅ Base64 conversion completed!" -ForegroundColor Green
    Write-Host "📁 Base64 file: $base64File" -ForegroundColor Cyan
    Write-Host "📊 Base64 length: $($base64.Length) characters" -ForegroundColor White
    
    Write-Host "`n🔑 GitHub Secrets Setup:" -ForegroundColor Magenta
    Write-Host "1. Copy the content of: $base64File" -ForegroundColor White
    Write-Host "2. Go to GitHub Repository Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "3. Add these secrets:" -ForegroundColor White
    Write-Host "   - Name: WIN_CSC_LINK" -ForegroundColor Cyan
    Write-Host "     Value: (paste the base64 content from the file)" -ForegroundColor Gray
    Write-Host "   - Name: WIN_CSC_KEY_PASSWORD" -ForegroundColor Cyan
    Write-Host "     Value: (the password you just entered)" -ForegroundColor Gray
    
    Write-Host "`n⚠️  Security Note:" -ForegroundColor Yellow
    Write-Host "Remember to delete the .pfx and base64 files after uploading to GitHub!" -ForegroundColor Yellow
    Write-Host "Commands to clean up:" -ForegroundColor Gray
    Write-Host "Remove-Item '$fullPath' -Force" -ForegroundColor Gray
    Write-Host "Remove-Item '$base64File' -Force" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Failed to export certificate!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Certificate export completed successfully!" -ForegroundColor Green
