param(
    [Parameter(Mandatory=$false)]
    [string]$PfxFilePath = "C:\Users\DarrenRobinson\OneDrive\MVP\darrenjrobinson.pfx"
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Converting PFX certificate to base64 for GitHub Actions..." -ForegroundColor Green

# Check if the PFX file exists
if (-not (Test-Path $PfxFilePath)) {
    Write-Host "❌ PFX file not found at: $PfxFilePath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PFX file found: $PfxFilePath" -ForegroundColor Green

# Get file info
$fileInfo = Get-Item $PfxFilePath
Write-Host "📊 File size: $($fileInfo.Length) bytes" -ForegroundColor White
Write-Host "📅 Last modified: $($fileInfo.LastWriteTime)" -ForegroundColor White

# Convert to base64
try {
    Write-Host "`n🔄 Converting to base64..." -ForegroundColor Yellow
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($PfxFilePath))
    
    # Save base64 to text file in the project directory
    $base64File = Join-Path (Get-Location) "DarrenJRobinson-CodeSigning-base64.txt"
    $base64 | Out-File -FilePath $base64File -Encoding ASCII
    
    Write-Host "✅ Base64 conversion completed!" -ForegroundColor Green
    Write-Host "📁 Base64 file: $base64File" -ForegroundColor Cyan
    Write-Host "📊 Base64 length: $($base64.Length) characters" -ForegroundColor White
    
    # Show first and last few characters for verification
    Write-Host "`n📋 Base64 preview:" -ForegroundColor Gray
    Write-Host "First 50 chars: $($base64.Substring(0, [Math]::Min(50, $base64.Length)))" -ForegroundColor Gray
    if ($base64.Length -gt 100) {
        Write-Host "Last 50 chars:  $($base64.Substring($base64.Length - 50))" -ForegroundColor Gray
    }
    
    Write-Host "`n🔑 GitHub Secrets Setup Instructions:" -ForegroundColor Magenta
    Write-Host "1. Copy the ENTIRE content from: $base64File" -ForegroundColor White
    Write-Host "2. Go to GitHub Repository: Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "3. Click 'New repository secret'" -ForegroundColor White
    Write-Host "4. Add these secrets:" -ForegroundColor White
    Write-Host ""
    Write-Host "   Secret #1:" -ForegroundColor Cyan
    Write-Host "   Name: WIN_CSC_LINK" -ForegroundColor Yellow
    Write-Host "   Value: (paste the entire base64 content from the file)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Secret #2:" -ForegroundColor Cyan
    Write-Host "   Name: WIN_CSC_KEY_PASSWORD" -ForegroundColor Yellow
    Write-Host "   Value: (your certificate password)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Once uploaded, you can use the 'Beta Release (Signed)' workflow" -ForegroundColor White
    
    Write-Host "`n⚠️  Security Notes:" -ForegroundColor Yellow
    Write-Host "- Keep the .pfx file secure and don't commit it to Git" -ForegroundColor Yellow
    Write-Host "- Delete the base64 text file after uploading to GitHub" -ForegroundColor Yellow
    Write-Host "- The GitHub secret is encrypted and only accessible to workflow runs" -ForegroundColor Yellow
    
    Write-Host "`n🧹 Cleanup command (run after uploading to GitHub):" -ForegroundColor Gray
    Write-Host "Remove-Item '$base64File' -Force" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Failed to convert certificate to base64!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Conversion completed successfully!" -ForegroundColor Green
Write-Host "Next step: Add the secrets to GitHub and run the signed release workflow!" -ForegroundColor Green
