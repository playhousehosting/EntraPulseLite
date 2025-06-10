# Cloud LLM Query Execution Test Runner
# This script sets up and runs the Cloud LLM Query Test with Node.js directly

if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "ERROR: ANTHROPIC_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Please set it using:" -ForegroundColor Yellow
    Write-Host '$env:ANTHROPIC_API_KEY = "your-api-key"' -ForegroundColor Cyan
    exit 1
}

Write-Host "Running Cloud LLM Query test..." -ForegroundColor Green

# First, make sure we have the required dependencies installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$packageJson = Get-Content -Path "package.json" | ConvertFrom-Json
$missingDeps = @()

$requiredPackages = @("ts-node", "typescript", "tsconfig-paths")
foreach ($pkg in $requiredPackages) {
    if (-not ($packageJson.devDependencies.PSObject.Properties.Name -contains $pkg) -and 
        -not ($packageJson.dependencies.PSObject.Properties.Name -contains $pkg)) {
        $missingDeps += $pkg
    }
}

if ($missingDeps.Count -gt 0) {
    Write-Host "Installing missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Yellow
    npm install --save-dev $missingDeps
}

# Compile the TypeScript test file to JavaScript
Write-Host "Compiling TypeScript test file..." -ForegroundColor Yellow
npx tsc --esModuleInterop --target ES2018 src/tests/direct-cloud-llm-test.ts

# Check if compilation was successful
if (-not (Test-Path "src/tests/direct-cloud-llm-test.js")) {
    Write-Host "Compilation failed. Trying with simpler method..." -ForegroundColor Yellow
    # Try with ts-node directly without any special args as a fallback
    Write-Host "Executing test script using ts-node..." -ForegroundColor Green
    npx ts-node src/tests/direct-cloud-llm-test.ts
} else {
    # Run the compiled JavaScript file
    Write-Host "Executing compiled test script..." -ForegroundColor Green
    node src/tests/direct-cloud-llm-test.js
    
    # Clean up the compiled file
    Remove-Item -Path "src/tests/direct-cloud-llm-test.js" -ErrorAction SilentlyContinue
}

Write-Host "Test execution completed" -ForegroundColor Green
