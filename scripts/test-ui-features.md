# Testing UI Features

## Copy Code Feature Test

1. Ask a question that would generate code (e.g., "Show me a PowerShell script to get Azure AD users")
2. Look for the copy button (clipboard icon) in the top-right corner of any code blocks
3. Click the copy button and verify the code is copied to clipboard
4. The button should show "Copied!" tooltip briefly after clicking

## Start New Chat Feature Test

1. Have a conversation with the assistant (ask a few questions)
2. Look for the "New Chat" button in the header (next to user profile)
3. Click "New Chat" button
4. Verify that:
   - All previous messages are cleared
   - A new welcome message appears
   - The conversation context is reset (ask a follow-up question that would normally reference previous context)

## Session Management Test

1. Start a conversation with a question like "What is Microsoft Entra?"
2. Ask a follow-up question like "What are the key features?"
3. Verify the assistant understands the context
4. Click "New Chat"
5. Ask the same follow-up question "What are the key features?"
6. Verify the assistant asks for clarification since context was cleared

## Code Examples to Test

Ask for these to generate code blocks with copy buttons:

1. "Show me a PowerShell script to list Azure AD users"
2. "Write a Microsoft Graph API query to get group memberships"
3. "Create a JSON configuration for an Azure app registration"
4. "Show me a REST API call to get user profile information"

## Expected Behavior

- Copy buttons should appear on all multi-line code blocks
- Inline code should not have copy buttons
- New Chat button should clear both UI state and server-side conversation context
- Session IDs should be unique for each new chat session
