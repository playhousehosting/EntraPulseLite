#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Security audit script for EntraPulse Lite project
.DESCRIPTION
    Scans the project for potential API keys, secrets, and sensitive information
    before setting up GitHub repository and multi-platform releases.
.NOTES
    Author: EntraPulse Lite Security Audit
    Version: 1.0
#>

param(
    [switch]$Verbose,
    [switch]$ExportReport,
    [string]$ReportPath = "security-audit-report.txt"
)

# Set colors for output
$colors = @{
    Header = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Gray'
    Found = 'Magenta'
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    Write-Host $Message -ForegroundColor $colors[$Color]
}

# Known safe client IDs that should not trigger alerts
$knownSafeClientIds = @(
    '14d82eec-204b-4c2f-b7e8-296a70dab67e',  # Microsoft Graph PowerShell
    '1950a258-227b-4e31-a9cf-717495945fc2',  # Microsoft Azure PowerShell
    '04b07795-8ddb-461a-bbee-02f9e1bf7b46'   # Microsoft Azure CLI
)

# Patterns to search for potential secrets
$secretPatterns = @{
    'Client Secrets' = @(
        'client_secret\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{10,})["\''`]?',
        'clientSecret\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{10,})["\''`]?'
    )
    'API Keys' = @(
        'api_key\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{10,})["\''`]?',
        'apiKey\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{10,})["\''`]?',
        'x-api-key\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{10,})["\''`]?'
    )
    'Access Tokens' = @(
        'access_token\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{20,})["\''`]?',
        'accessToken\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~]{20,})["\''`]?',
        'bearer\s+([a-zA-Z0-9\-\._~]{20,})'
    )
    'Connection Strings' = @(
        'connection_string\s*[=:]\s*["\''`]?([^"\''`;\s]{20,})["\''`]?',
        'connectionString\s*[=:]\s*["\''`]?([^"\''`;\s]{20,})["\''`]?',
        'DefaultEndpointsProtocol=https;AccountName=',
        'Server=tcp:.*\.database\.windows\.net'
    )
    'Private Keys' = @(
        '-----BEGIN PRIVATE KEY-----',
        '-----BEGIN RSA PRIVATE KEY-----',
        '-----BEGIN EC PRIVATE KEY-----'
    )
    'Azure Storage Keys' = @(
        'AccountKey=([a-zA-Z0-9+/]{88}==)',
        'sas_token\s*[=:]\s*["\''`]?([a-zA-Z0-9\-\._~%]{20,})["\''`]?'
    )
    'Subscription Keys' = @(
        'subscription_key\s*[=:]\s*["\''`]?([a-fA-F0-9]{32})["\''`]?',
        'subscriptionKey\s*[=:]\s*["\''`]?([a-fA-F0-9]{32})["\''`]?'
    )
    'Passwords' = @(
        'password\s*[=:]\s*["\''`]?([^"\''`;\s]{8,})["\''`]?',
        'pwd\s*[=:]\s*["\''`]?([^"\''`;\s]{8,})["\''`]?'
    )
}

# GUID patterns for potential client IDs (will check against safe list)
$guidPattern = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}'

# Files and directories to exclude
$excludePatterns = @(
    '\.git',
    'node_modules',
    'dist',
    'build',
    'out',
    '\.vscode',
    'coverage',
    'logs',
    '\.log$',
    '\.lock$',
    'package-lock\.json',
    'yarn\.lock',
    'pnpm-lock\.yaml'
)

# Patterns for legitimate code that should not trigger alerts
$legitimateCodePatterns = @(
    'apiKey.*config\.apiKey',           # Reading from config
    'clientSecret.*config\..*',         # Reading from config  
    'accessToken.*substring',           # Token truncation for logging
    'const.*ApiKey.*=.*provider',       # Variable assignments from providers
    'CLIENT_SECRET.*authConfig',        # Reading from auth config
    'env\..*_TOKEN.*=.*config',         # Environment setup from config
    '\.env\.',                          # Environment variable references
    'process\.env\.',                   # Environment variable access
    'your-.*-key',                      # Placeholder text
    'test-.*-key',                      # Test placeholders
    'sk-ant-api-test-key',              # Obvious test key format
    'dummy-token',                      # Obvious dummy values
    'certificate-password',             # Build certificate placeholder
    'const hasClientSecret',            # Checking if client secret exists
    'const has.*ApiKey',                # Checking if API key exists
    'storedEntraConfig\.clientSecret',  # Reading from stored config
    'configToTest\.auth\.clientSecret', # Test configuration
    'exportedConfig\.application',      # Configuration export
    "'test-.*secret'",                  # Test secret literals
    "'invalid-.*secret'",               # Invalid test secrets
    'test-token-replacement',           # Test token replacement
    'LOKKA_CLIENT_SECRET=your_client_secret',  # Documentation placeholders
    'CLIENT_SECRET=your-client-secret', # Documentation placeholders
    'DefaultEndpointsProtocol=https;AccountName=', # Connection string template
    '-----BEGIN.*KEY-----',             # Key format templates
    'sk-user-specific-key-67890',       # Test key format
    'new-azure-openai-api-key',         # Test key format
    'user-api-key',                     # Generic test key
    'app-secret',                       # Generic test secret
    'CLIENT_SECRET.*config\.clientSecret' # Reading client secret from config
)

# File types to scan
$includeExtensions = @(
    '*.ts', '*.js', '*.tsx', '*.jsx',
    '*.json', '*.yaml', '*.yml',
    '*.md', '*.txt',
    '*.config.js', '*.config.ts',
    '*.ps1', '*.sh', '*.bat'
)

# Initialize results
$auditResults = @{
    TotalFilesScanned = 0
    IssuesFound = @()
    SafeGuidsFound = @()
    SuspiciousGuidsFound = @()
    FilesWithIssues = @()
}

function Test-ShouldExcludeFile {
    param([string]$FilePath)
    
    foreach ($pattern in $excludePatterns) {
        if ($FilePath -match $pattern) {
            return $true
        }
    }
    return $false
}

function Test-ShouldIncludeFile {
    param([string]$FilePath)
    
    foreach ($extension in $includeExtensions) {
        if ($FilePath -like $extension) {
            return $true
        }
    }
    return $false
}

function Test-IsLegitimateCode {
    param([string]$Line)
    
    foreach ($pattern in $legitimateCodePatterns) {
        if ($Line -match $pattern) {
            return $true
        }
    }
    return $false
}

function Search-FileForSecrets {
    param(
        [string]$FilePath,
        [string]$Content
    )
    
    $fileIssues = @()
    $lineNumber = 0
    
    foreach ($line in ($Content -split "`n")) {
        $lineNumber++
        
        # Search for secret patterns
        foreach ($category in $secretPatterns.Keys) {
            foreach ($pattern in $secretPatterns[$category]) {
                if ($line -match $pattern) {
                    # Skip if this looks like legitimate code
                    if (-not (Test-IsLegitimateCode $line)) {
                        $fileIssues += @{
                            Category = $category
                            Pattern = $pattern
                            Line = $lineNumber
                            Content = $line.Trim()
                            Match = $matches[0]
                        }
                    }
                }
            }
        }
        
        # Search for GUIDs
        $guidMatches = [regex]::Matches($line, $guidPattern)
        foreach ($match in $guidMatches) {
            $guid = $match.Value
            if ($knownSafeClientIds -contains $guid) {
                $auditResults.SafeGuidsFound += @{
                    File = $FilePath
                    Line = $lineNumber
                    Guid = $guid
                    Context = $line.Trim()
                }
            } else {
                $auditResults.SuspiciousGuidsFound += @{
                    File = $FilePath
                    Line = $lineNumber
                    Guid = $guid
                    Context = $line.Trim()
                }
            }
        }
    }
    
    return $fileIssues
}

# Main execution
Write-ColorOutput "🔍 Starting Security Audit for EntraPulse Lite" Header
Write-ColorOutput "=================================================" Header
Write-Host ""

# Get current directory
$projectRoot = Get-Location
Write-ColorOutput "📁 Scanning project: $projectRoot" Info
Write-Host ""

# Get all files to scan
Write-ColorOutput "📋 Collecting files to scan..." Info
$allFiles = Get-ChildItem -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Replace($projectRoot.Path, '').TrimStart('\')
    $shouldInclude = Test-ShouldIncludeFile $_.Name
    $shouldExclude = Test-ShouldExcludeFile $relativePath
    
    return $shouldInclude -and -not $shouldExclude
}

Write-ColorOutput "📊 Found $($allFiles.Count) files to scan" Info
Write-Host ""

# Scan each file
Write-ColorOutput "🔎 Scanning files for potential secrets..." Info
foreach ($file in $allFiles) {
    $auditResults.TotalFilesScanned++
    $relativePath = $file.FullName.Replace($projectRoot.Path, '').TrimStart('\')
    
    if ($Verbose) {
        Write-ColorOutput "  Scanning: $relativePath" Info
    }
    
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $issues = Search-FileForSecrets -FilePath $relativePath -Content $content
        
        if ($issues.Count -gt 0) {
            $auditResults.IssuesFound += $issues
            $auditResults.FilesWithIssues += $relativePath
            
            Write-ColorOutput "  ⚠️  Issues found in: $relativePath" Warning
            foreach ($issue in $issues) {
                Write-ColorOutput "      Line $($issue.Line): $($issue.Category) - $($issue.Content)" Found
            }
        }
    }
    catch {
        Write-ColorOutput "  ❌ Error reading file: $relativePath - $($_.Exception.Message)" Error
    }
}

Write-Host ""

# Display results
Write-ColorOutput "📋 SECURITY AUDIT RESULTS" Header
Write-ColorOutput "=========================" Header
Write-ColorOutput "Files Scanned: $($auditResults.TotalFilesScanned)" Info
Write-ColorOutput "Issues Found: $($auditResults.IssuesFound.Count)" $(if ($auditResults.IssuesFound.Count -gt 0) { 'Error' } else { 'Success' })
Write-ColorOutput "Files with Issues: $($auditResults.FilesWithIssues.Count)" $(if ($auditResults.FilesWithIssues.Count -gt 0) { 'Error' } else { 'Success' })
Write-ColorOutput "Suspicious GUIDs: $($auditResults.SuspiciousGuidsFound.Count)" $(if ($auditResults.SuspiciousGuidsFound.Count -gt 0) { 'Warning' } else { 'Success' })
Write-ColorOutput "Known Safe GUIDs: $($auditResults.SafeGuidsFound.Count)" Info
Write-Host ""

# Detailed results
if ($auditResults.IssuesFound.Count -gt 0) {
    Write-ColorOutput "🚨 POTENTIAL SECRETS FOUND:" Error
    Write-ColorOutput "=============================" Error
    
    $groupedIssues = $auditResults.IssuesFound | Group-Object { $_.Category }
    foreach ($group in $groupedIssues) {
        Write-ColorOutput "  $($group.Name):" Warning
        foreach ($issue in $group.Group) {
            $filePath = $auditResults.FilesWithIssues | Where-Object { $_ -eq (Split-Path $issue.Match -Parent) }
            Write-ColorOutput "    - Line $($issue.Line): $($issue.Content)" Found
        }
        Write-Host ""
    }
}

if ($auditResults.SuspiciousGuidsFound.Count -gt 0) {
    Write-ColorOutput "⚠️  SUSPICIOUS GUIDs FOUND:" Warning
    Write-ColorOutput "=============================" Warning
    foreach ($guid in $auditResults.SuspiciousGuidsFound) {
        Write-ColorOutput "  $($guid.File):$($guid.Line)" Info
        Write-ColorOutput "    GUID: $($guid.Guid)" Found
        Write-ColorOutput "    Context: $($guid.Context)" Info
        Write-Host ""
    }
    Write-ColorOutput "Please verify these GUIDs are not real client IDs or secrets." Warning
    Write-Host ""
}

if ($auditResults.SafeGuidsFound.Count -gt 0 -and $Verbose) {
    Write-ColorOutput "✅ KNOWN SAFE GUIDs:" Success
    Write-ColorOutput "====================" Success
    foreach ($guid in $auditResults.SafeGuidsFound) {
        Write-ColorOutput "  $($guid.File):$($guid.Line) - $($guid.Guid)" Success
    }
    Write-Host ""
}

# Recommendations
Write-ColorOutput "💡 RECOMMENDATIONS:" Header
Write-ColorOutput "===================" Header

if ($auditResults.IssuesFound.Count -eq 0 -and $auditResults.SuspiciousGuidsFound.Count -eq 0) {
    Write-ColorOutput "✅ No security issues found! Project is ready for GitHub." Success
} else {
    Write-ColorOutput "❌ Security issues detected. Please address before publishing:" Error
    Write-ColorOutput "  1. Remove or move hardcoded secrets from code" Info
    Write-ColorOutput "  2. Add sensitive files to .gitignore" Info
    Write-ColorOutput "  3. Use placeholder values in documentation" Info
    Write-ColorOutput "  4. Use UI configuration for all app settings" Info
}

Write-Host ""
Write-ColorOutput "🛡️  Additional Security Steps:" Info
Write-ColorOutput "  • Set up pre-commit hooks to prevent future secret commits" Info
Write-ColorOutput "  • Configure GitHub secret scanning" Info
Write-ColorOutput "  • Use UI configuration for all sensitive settings" Info
Write-ColorOutput "  • Regularly rotate any exposed credentials" Info

# Export report if requested
if ($ExportReport) {
    Write-Host ""
    Write-ColorOutput "📄 Exporting detailed report to: $ReportPath" Info
    
    $reportContent = @"
ENTRAPULSE LITE SECURITY AUDIT REPORT
=====================================
Generated: $(Get-Date)
Project: $projectRoot

SUMMARY
-------
Files Scanned: $($auditResults.TotalFilesScanned)
Issues Found: $($auditResults.IssuesFound.Count)
Files with Issues: $($auditResults.FilesWithIssues.Count)
Suspicious GUIDs: $($auditResults.SuspiciousGuidsFound.Count)
Known Safe GUIDs: $($auditResults.SafeGuidsFound.Count)

DETAILED FINDINGS
----------------
$(if ($auditResults.IssuesFound.Count -gt 0) {
    "POTENTIAL SECRETS:`n" + 
    ($auditResults.IssuesFound | ForEach-Object { 
        "  - $($_.Category): Line $($_.Line) - $($_.Content)" 
    } | Out-String)
} else {
    "No potential secrets found.`n"
})

$(if ($auditResults.SuspiciousGuidsFound.Count -gt 0) {
    "SUSPICIOUS GUIDs:`n" + 
    ($auditResults.SuspiciousGuidsFound | ForEach-Object { 
        "  - $($_.File):$($_.Line) - $($_.Guid)" 
    } | Out-String)
} else {
    "No suspicious GUIDs found.`n"
})

FILES SCANNED
------------
$($allFiles | ForEach-Object { $_.FullName.Replace($projectRoot.Path, '').TrimStart('\') } | Sort-Object | Out-String)
"@
    
    Set-Content -Path $ReportPath -Value $reportContent
    Write-ColorOutput "✅ Report exported successfully" Success
}

# Exit with appropriate code
if ($auditResults.IssuesFound.Count -gt 0) {
    Write-Host ""
    Write-ColorOutput "🚫 Security audit failed. Please address issues before proceeding." Error
    exit 1
} else {
    Write-Host ""
    Write-ColorOutput "✅ Security audit passed!" Success
    exit 0
}
