param(
    [Parameter(Mandatory=$false)]
    [string]$CertThumbprint = "03ea1833246380e76e393d76a53f42bbaf1eba87"
)

Write-Host "Verifying code signing certificate..." -ForegroundColor Yellow
Write-Host "Looking for thumbprint: $CertThumbprint" -ForegroundColor Cyan

# Get the certificate
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Thumbprint -eq $CertThumbprint}

if (-not $cert) {
    Write-Host "Certificate not found!" -ForegroundColor Red
    Write-Host "Available certificates in LocalMachine\My:" -ForegroundColor Yellow
    Get-ChildItem -Path Cert:\LocalMachine\My | Select-Object Subject, Thumbprint, NotAfter | Format-Table
    exit 1
}

Write-Host "Certificate found!" -ForegroundColor Green
Write-Host ""
Write-Host "Certificate Details:" -ForegroundColor Cyan
Write-Host "  Subject: $($cert.Subject)" -ForegroundColor White
Write-Host "  Issuer: $($cert.Issuer)" -ForegroundColor White
Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor White
Write-Host "  Valid From: $($cert.NotBefore)" -ForegroundColor White
Write-Host "  Valid To: $($cert.NotAfter)" -ForegroundColor White
Write-Host "  Has Private Key: $($cert.HasPrivateKey)" -ForegroundColor White

# Check if certificate is valid for code signing
$codeSigningUsage = $cert.Extensions | Where-Object {$_.Oid.Value -eq "2.5.29.37"}
if ($codeSigningUsage) {
    Write-Host "  Code Signing: [OK] Enabled" -ForegroundColor Green
} else {
    Write-Host "  Code Signing: [ERROR] Not found" -ForegroundColor Red
}

# Check expiration
$daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
if ($daysUntilExpiry -gt 30) {
    Write-Host "  Expiration: [OK] Valid for $daysUntilExpiry more days" -ForegroundColor Green
} elseif ($daysUntilExpiry -gt 0) {
    Write-Host "  Expiration: [WARNING] Expires in $daysUntilExpiry days" -ForegroundColor Yellow
} else {
    Write-Host "  Expiration: [ERROR] Certificate has expired!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Certificate verification complete!" -ForegroundColor Green
