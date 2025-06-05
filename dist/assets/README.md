# Assets Directory

This directory contains application icons and logos for EntraPulse Lite.

## Required Icon Files

### Application Icon (Window & Taskbar)
- **icon.png** (512x512) - Main application icon
- **icon@2x.png** (1024x1024) - High DPI version
- **icon.ico** (Windows) - Multi-size icon file for Windows
- **icon.icns** (macOS) - Multi-size icon file for macOS

### In-App Logo
- **logo.png** (any size, recommended 200x40 for header)
- **logo@2x.png** (400x80) - High DPI version for header
- **logo-large.png** (any size, recommended 128x128 for welcome screen)

## Usage

### Application Icon
The main application icon is already configured in `src/main/main.ts`:
```typescript
icon: path.join(__dirname, '../../assets/icon.ico')
```

### In-App Logos
Logos are prepared for use in:
1. **App Header** (`src/renderer/App.tsx`) - Uncomment the logo line
2. **Welcome Screen** (`src/renderer/components/ChatComponent.tsx`) - Uncomment the logo line

## Format Recommendations

- **PNG format** for logos (supports transparency)
- **ICO format** for Windows application icon (multi-size)
- **ICNS format** for macOS application icon (multi-size)
- **Square aspect ratio** for application icons
- **Transparent background** for logos to work with both light and dark themes

## To Enable Logos

1. Add your icon files to this directory
2. Uncomment the logo lines in the UI components
3. Adjust the height/size as needed for your design
4. Test with both light and dark themes

## Example File Structure
```
assets/
├── icon.png           # 512x512 app icon
├── icon@2x.png        # 1024x1024 app icon
├── icon.ico           # Windows multi-size
├── icon.icns          # macOS multi-size
├── logo.png           # Header logo
├── logo@2x.png        # Header logo high DPI
└── logo-large.png     # Welcome screen logo
```
