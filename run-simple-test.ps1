# Simple Cloud LLM Query Test Runner (JavaScript version)
# This script runs the JavaScript version of the test

if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host "ERROR: ANTHROPIC_API_KEY environment variable not set"
    Write-Host "Please set it using:"
    Write-Host '$env:ANTHROPIC_API_KEY = "your-api-key"'
    exit 1
}

Write-Host "Running simple JavaScript test for Cloud LLM Query functionality..."
node simple-cloud-llm-test.js
