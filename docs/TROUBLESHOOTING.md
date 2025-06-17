# Troubleshooting Guide

## 🔍 Common Issues and Solutions

### LLM Status Monitoring Issues

#### Issue: Local LLM Status Shows Offline Despite Running LLM

**Symptoms**:
- LLM status indicator shows "Local LLM Offline" when Ollama/LM Studio is running
- Unable to use local LLM despite it being available
- Chat requests failing with LLM connectivity errors

**Solutions**:
1. **Force Status Check**:
   - Click the refresh button on the LLM status indicator
   - This triggers an immediate check of LLM availability

2. **Verify LLM Service**:
   ```powershell
   # For Ollama
   Invoke-RestMethod -Uri "http://localhost:11434/api/version" -Method Get
   
   # For LM Studio
   Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -Method Get
   ```

3. **Check Network Configuration**:
   - Ensure no firewall is blocking communication on port 11434 (Ollama) or 1234 (LM Studio)
   - Verify the LLM service is bound to localhost or 0.0.0.0, not 127.0.0.1 only

4. **Restart Application**:
   - Close and reopen EntraPulse Lite
   - This reinitializes all IPC handlers and status monitors

5. **Review Application Logs**:
   - Open DevTools (Ctrl+Shift+I)
   - Check console for LLM connection errors
   - Look for errors in the IPC communication

#### Issue: False Positive LLM Status

**Symptoms**:
- LLM status shows "Online" but chat messages fail
- Status indicator doesn't update when LLM becomes unavailable

**Solutions**:
1. **Increase Polling Frequency**:
   - Edit the LLMStatusProvider configuration to reduce the polling interval
   ```tsx
   // In src/renderer/App.tsx
   <LLMStatusProvider pollingInterval={2000}> {/* 2 seconds */}
     <App />
   </LLMStatusProvider>
   ```

2. **Clear Cache and Restart**:
   - Clear application cache
   - Restart both EntraPulse Lite and the LLM service

3. **Force Connection Test**:
   ```typescript
   // In DevTools console
   await window.electronAPI.llm.isLocalAvailable();
   ```

### Authentication Issues

#### Issue: Authentication Fails with "AADSTS" Error Codes

**Symptoms**:
- Login button returns error
- Error codes starting with "AADSTS"
- Unable to acquire tokens

**Common Error Codes**:

| Error Code | Description | Solution |
|------------|-------------|----------|
| `AADSTS50011` | Redirect URI mismatch | Verify redirect URI in app registration |
| `AADSTS65001` | User consent required | Request permissions in correct order |
| `AADSTS70001` | Application not found | Check CLIENT_ID configuration |
| `AADSTS90002` | Tenant not found | Verify TENANT_ID configuration |

**Solutions**:
1. **Check App Registration**:
   ```bash
   # Verify configuration
   echo $CLIENT_ID
   echo $TENANT_ID
   ```

2. **Reset Authentication**:
   ```typescript
   // Clear cached tokens
   await window.electronAPI.auth.clearTokenCache();
   ```

3. **Use Diagnostic Tool**:
   ```typescript
   // Get detailed auth info
   const authInfo = await window.electronAPI.auth.getAuthenticationInfo();
   console.log(authInfo);
   ```

#### Issue: Permissions Not Working

**Symptoms**:
- "Insufficient privileges" errors
- 403 Forbidden responses
- Limited data access

**Solutions**:
1. **Check Required Permissions**:
   ```typescript
   // Request specific permissions
   await window.electronAPI.auth.requestPermissions([
     'User.ReadBasic.All',
     'Directory.Read.All'
   ]);
   ```

2. **Admin Consent**:
   - Navigate to Azure Portal → App Registrations
   - Select your app → API Permissions
   - Click "Grant admin consent"

3. **Progressive Permissions**:
   - Start with basic permissions
   - Request additional permissions as needed
   - Check permission tiers in app

### LLM Provider Issues

#### Issue: Local LLM Not Connecting

**Symptoms**:
- "LLM service unavailable" messages
- Connection timeout errors
- Models not appearing in dropdown

**Ollama Troubleshooting**:
1. **Check Ollama Status**:
   ```bash
   # Test Ollama connection
   curl http://localhost:11434/api/version
   
   # List available models
   curl http://localhost:11434/api/tags
   ```

2. **Restart Ollama Service**:
   ```bash
   # Stop Ollama
   pkill ollama
   
   # Start Ollama
   ollama serve
   ```

3. **Docker Ollama**:
   ```bash
   # Check container status
   docker ps | grep ollama
   
   # Restart container
   docker restart ollama
   
   # Check logs
   docker logs ollama
   ```

**LM Studio Troubleshooting**:
1. **Check LM Studio Server**:
   ```bash
   # Test LM Studio connection
   curl http://localhost:1234/v1/models
   ```

2. **Server Configuration**:
   - Ensure "Start Server" is enabled in LM Studio
   - Check port configuration (default: 1234)
   - Verify model is loaded

#### Issue: Cloud LLM API Errors

**Symptoms**:
- API key authentication failures
- Rate limiting errors
- Model not found errors

**OpenAI Troubleshooting**:
1. **Verify API Key**:
   ```bash
   # Test API key
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

2. **Check Rate Limits**:
   - Monitor API usage in OpenAI dashboard
   - Implement retry logic with exponential backoff
   - Consider upgrading API plan

**Anthropic Troubleshooting**:
1. **Verify API Key**:
   ```bash
   # Test API key
   curl -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        https://api.anthropic.com/v1/messages
   ```

2. **Model Availability**:
   - Check if model is available in your region
   - Verify model name spelling
   - Try alternative models

**Google Gemini Troubleshooting**:
1. **Verify API Key**:
   ```bash
   # Test API key
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_GEMINI_API_KEY"
   ```

2. **Enable APIs**:
   - Ensure Generative Language API is enabled
   - Check quota limits in Google Cloud Console

### MCP Server Issues

#### Issue: MCP Servers Not Responding

**Symptoms**:
- "MCP server unavailable" errors
- Tool execution failures
- Empty responses

**Diagnostics**:
1. **Check Server Health**:
   ```typescript
   // Check MCP server status
   const health = await window.electronAPI.debug.checkMCPServerHealth();
   console.log(health);
   ```

2. **Debug MCP Communication**:
   ```typescript
   // Get MCP debug information
   const debugInfo = await window.electronAPI.debug.debugMCP();
   console.log(debugInfo);
   ```

**Solutions**:
1. **Restart MCP Servers**:
   - Restart the application
   - Clear server cache
   - Check server configuration

2. **Authentication Issues**:
   - Verify authentication tokens
   - Check permission scopes
   - Refresh authentication

#### Issue: Microsoft Graph API Errors

**Symptoms**:
- 401 Unauthorized errors
- 403 Forbidden errors
- 404 Not Found errors

**Solutions**:
1. **Check Authentication**:
   ```typescript
   // Verify token validity
   const token = await window.electronAPI.auth.getToken();
   console.log('Token expires:', token.expiresOn);
   ```

2. **Verify Permissions**:
   ```typescript
   // Check granted permissions
   const authInfo = await window.electronAPI.auth.getAuthenticationInfo();
   console.log('Granted permissions:', authInfo.actualPermissions);
   ```

3. **Test API Endpoints**:
   ```bash
   # Test Graph API directly
   curl -H "Authorization: Bearer $ACCESS_TOKEN" \
        https://graph.microsoft.com/v1.0/me
   ```

### Application Issues

#### Issue: Application Won't Start

**Symptoms**:
- Electron window doesn't open
- Application crashes on startup
- Build errors

**Solutions**:
1. **Check Node.js Version**:
   ```bash
   node --version  # Should be 18.0+
   npm --version   # Should be 8.0+
   ```

2. **Clear Cache and Reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for Port Conflicts**:
   ```bash
   # Check if ports are in use
   lsof -i :11434  # Ollama
   lsof -i :1234   # LM Studio
   lsof -i :3000   # Development server
   ```

#### Issue: Build Failures

**Symptoms**:
- TypeScript compilation errors
- Webpack build failures
- Package distribution errors

**Solutions**:
1. **Type Check**:
   ```bash
   npm run type-check
   ```

2. **Clean Build**:
   ```bash
   npm run clean
   npm run build
   ```

3. **Check Dependencies**:
   ```bash
   npm audit
   npm update
   ```

### Performance Issues

#### Issue: Slow Response Times

**Symptoms**:
- Long delays in chat responses
- UI freezing
- High memory usage

**Solutions**:
1. **Check LLM Performance**:
   - Use smaller models for local LLMs
   - Monitor GPU/CPU usage
   - Consider cloud providers for better performance

2. **Optimize Settings**:
   - Reduce max tokens for faster responses
   - Lower temperature for consistent responses
   - Enable model caching

3. **Monitor Resources**:
   ```bash
   # Check memory usage
   top -p $(pgrep electron)
   
   # Check disk space
   df -h
   ```

#### Issue: High Memory Usage

**Symptoms**:
- System slowdown
- Out of memory errors
- Application crashes

**Solutions**:
1. **Local LLM Optimization**:
   - Use quantized models
   - Limit concurrent requests
   - Implement model unloading

2. **Application Optimization**:
   - Clear message history periodically
   - Implement lazy loading
   - Monitor memory leaks

## 🛠️ Diagnostic Tools

### Built-in Diagnostics

#### Authentication Diagnostics
```typescript
// Get comprehensive auth information
const authDiagnostics = await window.electronAPI.auth.getAuthenticationInfo();
console.log('Auth Mode:', authDiagnostics.mode);
console.log('Permissions:', authDiagnostics.permissions);
console.log('Is Authenticated:', authDiagnostics.isAuthenticated);
console.log('Client ID:', authDiagnostics.clientId);
console.log('Tenant ID:', authDiagnostics.tenantId);
```

#### MCP Server Diagnostics
```typescript
// Check all MCP servers
const serverHealth = await window.electronAPI.debug.checkMCPServerHealth();
serverHealth.forEach(server => {
  console.log(`Server: ${server.name}, Status: ${server.status}`);
  if (server.error) {
    console.error(`Error: ${server.error}`);
  }
});
```

#### LLM Provider Diagnostics
```typescript
// Test LLM provider availability
const providers = ['ollama', 'lm-studio', 'openai', 'anthropic', 'gemini'];
for (const provider of providers) {
  try {
    const available = await window.electronAPI.llm.isAvailable();
    console.log(`${provider}: ${available ? 'Available' : 'Unavailable'}`);
  } catch (error) {
    console.error(`${provider}: Error - ${error.message}`);
  }
}
```

### External Diagnostic Tools

#### Network Connectivity
```bash
# Test Microsoft Graph API
curl -H "Accept: application/json" \
     https://graph.microsoft.com/v1.0/

# Test LLM Provider APIs
curl https://api.openai.com/v1/models
curl https://api.anthropic.com/v1/
```

#### System Resources
```bash
# Check available memory
free -h

# Check CPU usage
htop

# Check disk space
df -h

# Check network connections
netstat -an | grep ESTABLISHED
```

## 📋 Debug Logs

### Enable Debug Logging

#### Environment Variables
```bash
# Enable all debug logs
export DEBUG=*

# Enable specific debug logs
export DEBUG=mcp:*,llm:*,auth:*
```

#### Application-Level Logging
```typescript
// Enable verbose logging in app
window.electronAPI.config.update({
  logLevel: 'verbose',
  enableTelemetry: true
});
```

### Log Locations

#### Windows
```
%APPDATA%\entrapulse-lite\logs\
```

#### macOS
```
~/Library/Logs/entrapulse-lite/
```

#### Linux
```
~/.config/entrapulse-lite/logs/
```

### Log Analysis

#### Common Log Patterns
```bash
# Find authentication errors
grep "auth:error" logs/main.log

# Find MCP communication issues
grep "mcp:error" logs/main.log

# Find API errors
grep "api:error" logs/main.log
```

## 🆘 Getting Help

### Self-Service Resources
1. **Check Documentation**: [docs/](../docs/)
2. **Search Issues**: [GitHub Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
3. **Community Discussions**: [GitHub Discussions](https://github.com/darrenjrobinson/EntraPulseLite/discussions)

### Reporting Issues

#### Issue Template
```markdown
## Bug Report

### Environment
- OS: [Windows/macOS/Linux]
- Node.js Version: [version]
- Application Version: [version]

### Expected Behavior
[Description of expected behavior]

### Actual Behavior
[Description of actual behavior]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

### Logs
```
[Include relevant log snippets]
```

### Configuration
```json
[Include sanitized configuration]
```

### Screenshots
[Include screenshots if applicable]
```

#### Collecting Diagnostic Information
```typescript
// Comprehensive diagnostic report
const diagnostics = {
  auth: await window.electronAPI.auth.getAuthenticationInfo(),
  mcpHealth: await window.electronAPI.debug.checkMCPServerHealth(),
  config: await window.electronAPI.config.get(),
  timestamp: new Date().toISOString()
};

console.log('Diagnostic Report:', JSON.stringify(diagnostics, null, 2));
```

### Support Channels
1. **GitHub Issues**: Bug reports and feature requests
2. **GitHub Discussions**: General questions and community support
3. **Documentation**: Comprehensive guides and API references
4. **Stack Overflow**: Tag questions with `entrapulse-lite`

Remember to sanitize any sensitive information (API keys, tokens, personal data) before sharing diagnostic information.
