# GitHub Actions Workflows

This repository uses a streamlined set of workflows for building and releasing EntraPulse Lite.

## Workflow Overview

### 🔧 Beta/Development Workflows

#### `beta-release-unsigned.yml` - Beta Release (Unsigned Multi-Platform)
- **Purpose**: Create unsigned builds for testing across all platforms
- **Platforms**: Windows, macOS, Linux
- **Signing**: None (faster builds for testing)
- **Use case**: Internal testing, community preview builds
- **Artifacts**: Generates installers for all platforms

#### `beta-release-signed.yml` - Beta Release (Windows Signed) 
- **Purpose**: Create signed Windows builds for beta testing
- **Platforms**: Windows only
- **Signing**: Uses code signing certificate from GitHub Secrets
- **Use case**: Beta releases that need to pass Windows SmartScreen
- **Artifacts**: Signed Windows installer and portable executable

### 🚀 Production Workflows

#### `release.yml` - Production Release
- **Purpose**: Full production release with signing
- **Platforms**: Windows (signed), macOS, Linux
- **Signing**: Windows builds are signed
- **Use case**: Official releases
- **Artifacts**: Complete release package

#### `manual-release.yml` - Manual Release
- **Purpose**: On-demand releases with custom parameters
- **Use case**: Emergency releases, hotfixes

### 🔍 Maintenance Workflows

#### `security-scan.yml` - Security Scanning
- **Purpose**: Automated security scanning
- **Trigger**: Push to main branch, pull requests

## Required GitHub Secrets

For signed builds, you need these secrets in your repository settings:

- `WIN_CSC_LINK`: Base64-encoded certificate (.pfx file)
- `WIN_CSC_KEY_PASSWORD`: Certificate password
- `GITHUB_TOKEN`: Automatically provided by GitHub

## Usage

### For Testing (Unsigned)
1. Go to Actions → "Beta Release (Unsigned Multi-Platform)"
2. Click "Run workflow"
3. Enter version (e.g., `v1.0.0-beta.1`)
4. Choose prerelease: true

### For Beta with Windows Signing
1. Go to Actions → "Beta Release (Windows Signed)"
2. Click "Run workflow"
3. Enter version (e.g., `v1.0.0-beta.1`)
4. Choose prerelease: true

### For Production Release
1. Go to Actions → "Production Release"
2. Click "Run workflow"
3. Enter version (e.g., `v1.0.0`)
4. Set prerelease: false

## Asset Handling

All workflows automatically:
- Copy icons and assets via `copy-assets.js`
- Include proper app icons in builds
- Handle asset paths for both development and production

## Build Configurations

- **Unsigned builds**: Use `electron-builder-unsigned.json`
- **Signed builds**: Use default `package.json` electron-builder config
- **Assets**: Copied from `assets/` to `dist/assets/` during build
