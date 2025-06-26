/**
 * Debug Token Permissions
 * 
 * This script helps debug what permissions are actually present in the access token
 * for Enhanced Graph Access mode. Run this when troubleshooting permission issues.
 */

const jwt = require('jsonwebtoken');

function decodeTokenPermissions(token) {
  try {
    // Decode without verification (we just want to see the claims)
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      console.error('❌ Failed to decode token');
      return null;
    }

    console.log('🔐 Token Information:');
    console.log('====================');
    console.log(`📱 Client ID (appid): ${decoded.appid}`);
    console.log(`🏢 Tenant ID (tid): ${decoded.tid}`);
    console.log(`👤 User (upn): ${decoded.upn}`);
    console.log(`📅 Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
    console.log('');

    console.log('🔑 Permissions Analysis:');
    console.log('========================');
    
    // Check delegated scopes (scp claim)
    if (decoded.scp) {
      const scopes = decoded.scp.split(' ');
      console.log('✅ Delegated Scopes (scp):');
      scopes.forEach(scope => {
        const isMailScope = scope.includes('Mail');
        const isCalendarScope = scope.includes('Calendar');
        const isFileScope = scope.includes('File');
        const isDirectoryScope = scope.includes('Directory');
        const emoji = isMailScope || isCalendarScope || isFileScope || isDirectoryScope ? '🎯' : '📋';
        console.log(`   ${emoji} ${scope}`);
      });
      console.log('');

      // Check for required Enhanced Graph Access permissions
      const requiredScopes = [
        'Mail.Read',
        'Mail.ReadWrite', 
        'Calendars.Read',
        'Files.Read.All',
        'Directory.Read.All'
      ];

      console.log('🎯 Enhanced Graph Access Requirements:');
      requiredScopes.forEach(required => {
        const hasScope = scopes.some(scope => scope === required || scope.includes(required));
        const status = hasScope ? '✅' : '❌';
        console.log(`   ${status} ${required}`);
      });
    }

    // Check app-only permissions (roles claim)
    if (decoded.roles) {
      console.log('🏢 Application Permissions (roles):');
      decoded.roles.forEach(role => {
        console.log(`   🔐 ${role}`);
      });
    }

    console.log('');
    console.log('📊 Summary:');
    console.log('===========');
    
    const isGraphPowerShell = decoded.appid === '14d82eec-204b-4c2f-b7e8-296a70dab67e';
    console.log(`🔧 Enhanced Graph Access Mode: ${isGraphPowerShell ? '✅ YES' : '❌ NO'}`);
    
    if (decoded.scp) {
      const scopes = decoded.scp.split(' ');
      const hasMailPermissions = scopes.some(s => s.includes('Mail'));
      const hasCalendarPermissions = scopes.some(s => s.includes('Calendar'));
      const hasFilePermissions = scopes.some(s => s.includes('File'));
      
      console.log(`📧 Mail Access: ${hasMailPermissions ? '✅ YES' : '❌ NO'}`);
      console.log(`📅 Calendar Access: ${hasCalendarPermissions ? '✅ YES' : '❌ NO'}`);
      console.log(`📁 File Access: ${hasFilePermissions ? '✅ YES' : '❌ NO'}`);
    }

    return decoded;
  } catch (error) {
    console.error('❌ Error decoding token:', error.message);
    return null;
  }
}

// Export for use in other scripts
module.exports = { decodeTokenPermissions };

// If run directly, expect token as command line argument
if (require.main === module) {
  const token = process.argv[2];
  
  if (!token) {
    console.log('Usage: node debug-token-permissions.js <access_token>');
    console.log('');
    console.log('Example:');
    console.log('  node debug-token-permissions.js eyJ0eXAiOiJKV1QiLCJub25jZSI6...');
    process.exit(1);
  }

  decodeTokenPermissions(token);
}
