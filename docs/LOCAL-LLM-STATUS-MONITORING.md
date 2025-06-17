# Local LLM Status Monitoring

EntraPulse Lite now includes dynamic status monitoring for Local LLM providers (Ollama and LM Studio). 

## Features

### Background Polling
- The application periodically checks for Local LLM availability in the background
- Default polling interval: 5 seconds
- Status updates automatically without requiring a page refresh

### UI Updates
- The LLM status indicator in the header bar updates in real-time
- Shows "Local LLM Online" (green) or "Local LLM Offline" (amber) based on current availability
- Includes a refresh button to force an immediate status check
- Displays the last check time on hover

### Chat Routing Respect
- The chat functionality verifies LLM availability before sending messages
- If no LLM service is available (either local or cloud), an error message is displayed
- Prevents attempts to use a Local LLM that was turned off after the application started

### Configuration Integration
- The "Use Local LLM if available" setting now accurately respects the real-time LLM status
- If Local LLM becomes unavailable, the application properly falls back to cloud providers

## Technical Implementation

### LLM Status Context Provider
The implementation uses a React Context Provider pattern to manage and propagate status updates:

```tsx
<LLMStatusProvider pollingInterval={5000}>
  {/* Application components */}
</LLMStatusProvider>
```

### useLLMStatus Hook
Components can access LLM status data through the `useLLMStatus` hook:

```tsx
const { 
  localLLMAvailable, // Status of local LLM
  anyLLMAvailable,   // Status of any LLM (local or cloud)
  lastChecked,       // Timestamp of last check
  forceCheck         // Function to force an immediate check
} = useLLMStatus();
```

### IPC Communication
The renderer process communicates with the main process via IPC to check LLM availability:

```typescript
// Main process
ipcMain.handle('llm:isLocalAvailable', async () => {
  // Check local LLM availability
});

// Preload script
contextBridge.exposeInMainWorld('electronAPI', {
  llm: {
    isLocalAvailable: () => ipcRenderer.invoke('llm:isLocalAvailable')
  }
});
```
