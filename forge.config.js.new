const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon', // This will use icon.ico on Windows and icon.icns on macOS
    ignore: [
      // Source files (keep only dist)
      '^/src$',
      '^/src/',
      
      // Build and config files
      '^/webpack\\.config\\.js$',
      '^/forge\\.config\\.js$',
      '^/tsconfig\\.json$',
      '^/jest\\.config\\.js$',
      '^/\\.eslintrc',
      '^/\\.prettierrc',
      '^/babel\\.config\\.js$',
      
      // Environment and secrets
      '^/\\.env',
      
      // Version control and Git hooks
      '^/\\.git$',
      '^/\\.git/',
      '^/\\.github$',
      '^/\\.github/',
      '^/\\.gitignore$',
      '^/\\.husky$',
      '^/\\.husky/',
      
      // Documentation
      '^/README\\.md$',
      '^/README_NEW\\.md$',
      '^/CHANGELOG\\.md$',
      '^/LICENSE$',
      '^/docs$',
      '^/docs/',
      
      // Test files
      '^/tests?$',
      '^/tests?/',
      '^/test$',
      '^/test/',
      '^/__tests__$',
      '^/__tests__/',
      '\\.test\\.',
      '\\.spec\\.',
      '^/coverage$',
      '^/coverage/',
      '^/\\.nyc_output$',
      '^/\\.nyc_output/',
      
      // Build artifacts and temp files  
      '^/out$',
      '^/out/',
      '^/dist-release$',
      '^/dist-release/',
      '^/build$',
      '^/build/',
      '^/tmp$',
      '^/tmp/',
      '^/temp$',
      '^/temp/',
      '^/\\.webpack$',
      '^/\\.webpack/',
      
      // Package manager files
      '^/yarn\\.lock$',
      '^/package-lock\\.json$',
      '^/pnpm-lock\\.yaml$',
      '^/\\.yarn$',
      '^/\\.yarn/',
      
      // IDE and editor files
      '^/\\.vscode$',
      '^/\\.vscode/',
      '^/\\.idea$',
      '^/\\.idea/',
      '\\.swp$',
      '\\.swo$',
      '\\.DS_Store$',
      'Thumbs\\.db$',
      
      // Scripts and utilities
      '^/scripts$',
      '^/scripts/',
      '^/copy-assets\\.js$',
      '^/asset-diagnostics\\.js$',
      
      // Source maps in production
      '\\.map$',
      
      // Cache directories
      '^/\\.cache$',
      '^/\\.cache/',
      '^/node_modules/\\.cache$',
      '^/node_modules/\\.cache/',
      
      // Log files
      '\\.log$',
      '^/logs$',
      '^/logs/',
      
      // Development only node modules
      'node_modules/typescript',
      'node_modules/@types',
      'node_modules/webpack',
      'node_modules/jest',
      'node_modules/eslint',
      'node_modules/prettier',
      'node_modules/@testing-library',
      'node_modules/husky',
      'node_modules/cross-env',
      'node_modules/rimraf',
      'node_modules/@electron-forge',
      'node_modules/electron-builder'
    ],
    
    // Additional packager options to reduce size
    prune: true,
    out: 'out'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
