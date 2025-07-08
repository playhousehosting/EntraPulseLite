#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get command line arguments
const version = process.argv[2];
const buildType = process.argv[3] || 'Release';
const releaseNotes = process.argv[4] || 'See release notes for detailed changes.';

if (!version) {
    console.error('Usage: node generate-release-readme.js <version> [buildType] [releaseNotes]');
    console.error('Example: node generate-release-readme.js v1.0.0-beta.1 "Beta Release" "Initial beta release with core features"');
    process.exit(1);
}

// Read the template
const templatePath = path.join(__dirname, '..', 'docs', 'RELEASE-README-TEMPLATE.md');
let template;

try {
    template = fs.readFileSync(templatePath, 'utf8');
} catch (error) {
    console.error('Error reading template:', error.message);
    process.exit(1);
}

// Get current date
const releaseDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Determine signing status
const windowsSigningStatus = buildType.toLowerCase().includes('signed') || buildType.toLowerCase().includes('release') 
    ? 'Code signed with DigiCert certificate' 
    : 'Unsigned build';

// Approximate file sizes (these would be updated with actual sizes in a real implementation)
const fileSizes = {
    portable: '~100 MB',
    installer: '~100 MB', 
    macos: '~130 MB',
    linux: '~125 MB'
};

// Replace template variables
const replacements = {
    '{VERSION}': version,
    '{RELEASE_DATE}': releaseDate,
    '{BUILD_TYPE}': buildType,
    '{RELEASE_NOTES}': releaseNotes,
    '{WINDOWS_SIGNING_STATUS}': windowsSigningStatus,
    '{PORTABLE_SIZE}': fileSizes.portable,
    '{INSTALLER_SIZE}': fileSizes.installer,
    '{MACOS_SIZE}': fileSizes.macos,
    '{LINUX_SIZE}': fileSizes.linux
};

let readme = template;
for (const [placeholder, value] of Object.entries(replacements)) {
    readme = readme.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
}

// Write the generated README
const outputPath = path.join(__dirname, '..', 'RELEASE-README.md');
try {
    fs.writeFileSync(outputPath, readme);
    console.log(`✅ Release README generated: ${outputPath}`);
    console.log(`📄 Version: ${version}`);
    console.log(`🔨 Build Type: ${buildType}`);
    console.log(`📅 Release Date: ${releaseDate}`);
} catch (error) {
    console.error('Error writing README:', error.message);
    process.exit(1);
}
