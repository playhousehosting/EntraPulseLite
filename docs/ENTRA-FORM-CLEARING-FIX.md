# Entra Application Settings Form Clearing Fix

## Problem Description

Users reported that when trying to enter Entra Application Settings (ClientID, TenantID, ClientSecret), the form would be cleared by background LLM refresh processes before they could finish entering all values. This was particularly problematic during initial setup when users needed to enter these credentials.

## Root Cause Analysis

The issue was caused by a combination of factors:

1. **Global Authentication Event Listener**: The `App.tsx` component has an event listener for `auth:configurationAvailable` that triggers when authentication is established or refreshed.

2. **Automatic Config Reload**: When this event fires, it automatically reloads the LLM configuration, which can trigger state updates throughout the application.

3. **Form State Reset**: The `EntraConfigForm` component was configured to reset its local state whenever the `config` prop changed, even if the user was actively editing the form.

4. **Background Authentication**: Authentication processes could trigger during user input, especially during initial setup or token refresh scenarios.

## Solution Implemented

### 1. Form Edit State Protection

Modified `EntraConfigForm` in `EnhancedSettingsDialog.tsx`:

- Added `isUserEditing` state to track when the user is actively modifying the form
- Updated the `useEffect` to only reload config when the user is NOT editing
- Created a `handleInputChange` function that marks the form as being edited
- Reset editing state after successful save or clear operations

```typescript
const [isUserEditing, setIsUserEditing] = useState(false);

useEffect(() => {
  // Only update local config if the user is not actively editing
  // This prevents the form from being cleared when background processes reload config
  if (config && !isUserEditing) {
    setLocalConfig(config);
  }
}, [config, isUserEditing]);

const handleInputChange = (field: keyof EntraConfig, value: string) => {
  setLocalConfig({ ...localConfig, [field]: value });
  // Mark as user editing when any input changes
  setIsUserEditing(true);
};
```

### 2. Debounced Global Config Reloads

Modified `App.tsx` to add intelligent debouncing:

- Added `configReloadTimeout` state to manage delayed reloads
- Modified the `auth:configurationAvailable` event handler to delay config reloads when settings dialog is open
- Implemented a 2-second delay if settings are open, 100ms otherwise
- Added proper cleanup of timeouts

```typescript
const handleConfigurationAvailable = (event: any, data: any) => {
  console.log('🔄 [App.tsx] Configuration available - scheduling LLM config reload and status check');
  
  // Clear any existing timeout
  if (configReloadTimeout) {
    clearTimeout(configReloadTimeout);
  }
  
  // If settings dialog is open, delay the reload to avoid interfering with user input
  const delay = settingsOpen ? 2000 : 100; // 2 second delay if settings are open
  
  const timeoutId = setTimeout(() => {
    console.log('🔄 [App.tsx] Executing delayed configuration reload');
    // Reload configuration now that authentication is verified
    loadLLMConfig();
    // Also update authentication status
    checkAuthStatus();
    // Force LLM status check through the context
    forceCheck();
    setConfigReloadTimeout(null);
  }, delay);
  
  setConfigReloadTimeout(timeoutId);
};
```

### 3. Enhanced Settings Dialog State Management

- Added proper handlers for settings dialog open/close events
- Improved logging to track when settings dialog state changes
- Ensured the debouncing system is aware of dialog state

## Benefits

1. **User Experience**: Users can now enter Entra Application Settings without the form being cleared
2. **Background Processing**: Background authentication and configuration processes still function normally
3. **Intelligent Debouncing**: Config reloads are delayed when users are actively working in settings
4. **State Protection**: Form state is preserved during editing sessions
5. **Graceful Recovery**: System still responds to authentication events, just with appropriate delays

## Testing Recommendations

1. **Primary Use Case**: Open settings, start entering Entra Application Settings, verify form doesn't clear
2. **Authentication Flow**: Test that authentication still works properly with the debouncing
3. **Background Refresh**: Verify that LLM status monitoring and config reloads still function
4. **Save/Clear Operations**: Test that save and clear operations work correctly and reset editing state
5. **Dialog Navigation**: Test opening/closing settings dialog multiple times

## Files Modified

- `src/renderer/components/EnhancedSettingsDialog.tsx`
- `src/renderer/App.tsx`
- `docs/ENTRA-FORM-CLEARING-FIX.md` (this document)

## Future Considerations

If additional background processes are identified that could interfere with user input, the same pattern can be applied:

1. Add editing state tracking to forms
2. Implement debouncing for background reloads
3. Use timeouts to delay operations when users are actively working

This solution maintains the responsive nature of the application while protecting user input from background interference.
