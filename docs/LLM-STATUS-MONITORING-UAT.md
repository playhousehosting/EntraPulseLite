# LLM Status Monitoring - User Acceptance Testing

## Test Plan

### Prerequisites
- EntraPulse Lite application installed and running
- Local LLM environment available (Ollama or LM Studio)
- Test user credentials for Microsoft authentication

### Test Scenarios

#### 1. Initial Status Detection

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC001 | 1. Start Local LLM<br>2. Start EntraPulse Lite | LLM status indicator shows "Local LLM Online" (green) | ⬜️ |
| TC002 | 1. Ensure Local LLM is NOT running<br>2. Start EntraPulse Lite | LLM status indicator shows "Local LLM Offline" (amber) | ⬜️ |

#### 2. Dynamic Status Changes

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC003 | 1. Start with LLM running<br>2. Stop LLM<br>3. Observe status | Status changes to "Offline" within the polling interval | ⬜️ |
| TC004 | 1. Start with LLM not running<br>2. Start LLM<br>3. Observe status | Status changes to "Online" within the polling interval | ⬜️ |
| TC005 | 1. Start with LLM not running<br>2. Start LLM<br>3. Click refresh button | Status changes to "Online" immediately | ⬜️ |

#### 3. Chat Integration

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC006 | 1. Start with LLM running<br>2. Send a chat message | Message is processed by local LLM | ⬜️ |
| TC007 | 1. Start with LLM running<br>2. Stop LLM<br>3. Send a chat message | Appropriate error message or fallback to cloud provider | ⬜️ |
| TC008 | 1. Start with LLM not running<br>2. Select "Use Local LLM"<br>3. Attempt to send message | Message is blocked with appropriate notification | ⬜️ |

#### 4. Settings Integration

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC009 | 1. Set "Use Local LLM" to true<br>2. Ensure Local LLM is available<br>3. Send a chat message | Message is processed by local LLM | ⬜️ |
| TC010 | 1. Set "Use Local LLM" to false<br>2. Ensure Local LLM is available<br>3. Send a chat message | Message is processed by cloud LLM | ⬜️ |
| TC011 | 1. Set "Use Local LLM" to true<br>2. Ensure Local LLM is NOT available<br>3. Send a chat message | Appropriate error or fallback behavior | ⬜️ |

#### 5. UI Components

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC012 | Hover over LLM status indicator | Tooltip shows last checked time | ⬜️ |
| TC013 | Click refresh button on status indicator | Immediate status check is performed | ⬜️ |

### Edge Cases

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| TC014 | 1. Start with LLM running<br>2. Disconnect network<br>3. Observe status | Status changes to "Offline" | ⬜️ |
| TC015 | Rapidly toggle LLM on/off | Status updates correctly without UI errors | ⬜️ |

## Test Execution

### Tester Information
- Tester Name: _________________
- Test Date: ___________________
- EntraPulse Lite Version: _____
- Local LLM Used: _____________

### Results Summary
- Total Test Cases: 15
- Passed: ___
- Failed: ___
- Not Tested: ___

### Issues Found
1. 
2. 
3. 

### Notes
