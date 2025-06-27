#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Security setup script for EntraPulse Lite project
.DESCRIPTION
    Sets up security measures including enhanced .gitignore, pre-commit hooks,
    and environment configuration templates.
.NOTES
    Author: EntraPulse Lite Security Setup
    Version: 1.0
#>

param(
    [switch]$Force,
    [switch]$SkipHusky
)

$colors = @{
    Header = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Gray'
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = 'White'
    )
    Write-Host $Message -ForegroundColor $colors[$Color]
}

function New-SecurityGitignore {
    $gitignoreContent = @'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Environment files - Not used in EntraPulse Lite (UI-based config)
# but include common patterns for security
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*

# Build outputs
dist/
build/
out/
release/
app/dist/

# Electron specific
app/dist/
release/
.electron-builder-cache/

# IDE files
.vscode/settings.json
.vscode/launch.json
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# Logs
logs/
*.log

# Security - NEVER commit these
*.pem
*.key
*.p12
*.pfx
*.crt
*.cer
*.der
config/secrets.json
config/production.json
secrets.*
credentials.*
auth.json
token.json

# Azure specific
azure.json
.azure/
*.publishsettings

# Test artifacts
test-results/
screenshots/
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
.tmp/

# Package manager lock files (optional - uncomment if needed)
# package-lock.json
# yarn.lock

# Documentation build
docs/_build/
site/

# Cache directories
.cache/
.parcel-cache/
.sass-cache/

# Editor directories and files
.vscode/
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Local configuration overrides
config.local.*
settings.local.*

# Database files
*.db
*.sqlite
*.sqlite3

# Certificate files
*.p7b
*.p7c
*.p7r
*.spc

# Windows specific
Thumbs.db
ehthumbs.db
Desktop.ini
$RECYCLE.BIN/

# macOS specific
.DS_Store
.AppleDouble
.LSOverride
Icon
._*
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.apdisk

# Linux specific
*~
.fuse_hidden*
.directory
.Trash-*
.nfs*
'@

    return $gitignoreContent
}

function New-PreCommitHook {
    $preCommitContent = @'
#!/bin/sh
# EntraPulse Lite Pre-commit Security Hook

echo "🔍 Running pre-commit security checks..."

# Check for common secret patterns (excluding known safe GUIDs)
SECRET_PATTERNS="client_secret|api_key|secret_key|access_token|private_key|password.*=|pwd.*=|connectionString|connection_string"

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|tsx|jsx|json|md|txt)$')

if [ -n "$STAGED_FILES" ]; then
    echo "Checking staged files for secrets..."
    
    # Check for potential secrets
    SECRET_FOUND=$(echo "$STAGED_FILES" | xargs grep -l -i -E "$SECRET_PATTERNS" 2>/dev/null || true)
    
    if [ -n "$SECRET_FOUND" ]; then
        echo "❌ Potential secrets found in staged files:"
        echo "$SECRET_FOUND"
        echo ""
        echo "Please remove any hardcoded secrets before committing."
        echo "Use UI configuration for all app settings."
        exit 1
    fi
    
    # Check for suspicious GUIDs (but allow known safe ones)
    GUID_FILES=$(echo "$STAGED_FILES" | xargs grep -l -E '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null || true)
    
    if [ -n "$GUID_FILES" ]; then
        # Filter out known safe GUIDs
        SUSPICIOUS_GUIDS=$(echo "$STAGED_FILES" | xargs grep -E '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' 2>/dev/null | grep -v -E '14d82eec-204b-4c2f-b7e8-296a70dab67e|1950a258-227b-4e31-a9cf-717495945fc2|04b07795-8ddb-461a-bbee-02f9e1bf7b46' || true)
        
        if [ -n "$SUSPICIOUS_GUIDS" ]; then
            echo "⚠️  Found GUID patterns in staged files:"
            echo "$SUSPICIOUS_GUIDS"
            echo ""
            echo "Please verify these are not real client IDs or secrets."
            echo "Use placeholder values in documentation and examples."
            echo ""
            echo "Known safe GUIDs (Microsoft well-known client IDs) are allowed."
        fi
    fi
fi

echo "✅ Pre-commit security checks passed"
exit 0
'@

    return $preCommitContent
}

function Install-HuskyHooks {
    Write-ColorOutput "🪝 Setting up Husky pre-commit hooks..." Info
    
    # Check if package.json exists
    if (!(Test-Path "package.json")) {
        Write-ColorOutput "❌ package.json not found. Cannot install Husky." Error
        return $false
    }
    
    # Install husky if not already installed
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $hasHusky = $packageJson.devDependencies.PSObject.Properties.Name -contains "husky"
    
    if (!$hasHusky) {
        Write-ColorOutput "📦 Installing Husky..." Info
        npm install --save-dev husky
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Failed to install Husky" Error
            return $false
        }
    }
    
    # Initialize husky
    Write-ColorOutput "🔧 Initializing Husky..." Info
    npx husky init
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Failed to initialize Husky" Error
        return $false
    }
    
    # Create pre-commit hook
    $preCommitPath = ".husky/pre-commit"
    $preCommitContent = New-PreCommitHook
    
    if (Test-Path $preCommitPath) {
        if (!$Force) {
            Write-ColorOutput "⚠️  Pre-commit hook already exists. Use -Force to overwrite." Warning
            return $true
        }
    }
    
    Set-Content -Path $preCommitPath -Value $preCommitContent -NoNewline
    
    # Make executable on Unix-like systems
    if ($IsLinux -or $IsMacOS) {
        chmod +x $preCommitPath
    }
    
    Write-ColorOutput "✅ Husky pre-commit hook installed" Success
    return $true
}

# Main execution
Write-ColorOutput "🛡️  EntraPulse Lite Security Setup" Header
Write-ColorOutput "===================================" Header
Write-Host ""

$setupSuccess = $true

# 1. Create enhanced .gitignore
Write-ColorOutput "📝 Setting up enhanced .gitignore..." Info
$gitignoreContent = New-SecurityGitignore

if (Test-Path ".gitignore") {
    if (!$Force) {
        Write-ColorOutput "⚠️  .gitignore already exists. Use -Force to overwrite." Warning
    } else {
        Set-Content -Path ".gitignore" -Value $gitignoreContent
        Write-ColorOutput "✅ Enhanced .gitignore created" Success
    }
} else {
    Set-Content -Path ".gitignore" -Value $gitignoreContent
    Write-ColorOutput "✅ Enhanced .gitignore created" Success
}

# 2. Setup Husky pre-commit hooks
if (!$SkipHusky) {
    $huskySuccess = Install-HuskyHooks
    if (!$huskySuccess) {
        $setupSuccess = $false
    }
} else {
    Write-ColorOutput "⏭️  Skipping Husky setup (use --SkipHusky=false to enable)" Info
}

# 3. Create GitHub workflow template
Write-ColorOutput "🔧 Creating GitHub workflow template..." Info
$workflowDir = ".github/workflows"
if (!(Test-Path $workflowDir)) {
    New-Item -Path $workflowDir -ItemType Directory -Force | Out-Null
}

$securityWorkflowContent = @'
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security audit script
      shell: pwsh
      run: ./scripts/security-audit.ps1 -Verbose
    
    - name: Check for hardcoded secrets
      run: |
        # Check for common secret patterns (excluding known safe GUIDs)
        if grep -r -E "(client_secret|api_key|secret_key|access_token|private_key)" \
           --include="*.ts" --include="*.js" --include="*.json" \
           --exclude-dir=node_modules --exclude-dir=.git .; then
          echo "❌ Hardcoded secrets found!"
          exit 1
        fi
        echo "✅ No hardcoded secrets detected"
'@

$workflowPath = "$workflowDir/security-scan.yml"
if (Test-Path $workflowPath) {
    if (!$Force) {
        Write-ColorOutput "⚠️  GitHub workflow already exists. Use -Force to overwrite." Warning
    } else {
        Set-Content -Path $workflowPath -Value $securityWorkflowContent
        Write-ColorOutput "✅ GitHub security workflow created" Success
    }
} else {
    Set-Content -Path $workflowPath -Value $securityWorkflowContent
    Write-ColorOutput "✅ GitHub security workflow created" Success
}

# Summary
Write-Host ""
Write-ColorOutput "📋 SECURITY SETUP SUMMARY" Header
Write-ColorOutput "===========================" Header

if ($setupSuccess) {
    Write-ColorOutput "✅ Security setup completed successfully!" Success
    Write-Host ""
    Write-ColorOutput "📋 Files created/updated:" Info
    Write-ColorOutput "  • .gitignore (enhanced security patterns)" Info
    if (!$SkipHusky) {
        Write-ColorOutput "  • .husky/pre-commit (security hook)" Info
    }
    Write-ColorOutput "  • .github/workflows/security-scan.yml" Info
    
    Write-Host ""
    Write-ColorOutput "🔄 Next Steps:" Header
    Write-ColorOutput "  1. Run: ./scripts/security-audit.ps1 to verify current state" Info
    Write-ColorOutput "  2. Configure app settings through the UI" Info
    Write-ColorOutput "  3. Commit these security improvements" Info
    Write-ColorOutput "  4. Push to GitHub to trigger security workflow" Info
} else {
    Write-ColorOutput "⚠️  Security setup completed with warnings" Warning
    Write-ColorOutput "Please review the warnings above and re-run if needed." Info
}

Write-Host ""
Write-ColorOutput "🛡️  Your project is now ready for secure GitHub deployment!" Success
