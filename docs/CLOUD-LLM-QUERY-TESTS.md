# Cloud LLM Query Execution Fix

## Issue Summary
The Cloud LLM (Claude from Anthropic) correctly generates responses with `<execute_query>` tags, but these queries were not being executed by the Lokka MCP server. While local LLMs were properly integrated with query execution, cloud LLMs lacked this functionality.

## Changes Made

### 1. Enhanced UnifiedLLMService
The `UnifiedLLMService` now handles query extraction from both local and cloud LLM responses:
- Added regex pattern to detect `<execute_query>` tags in responses
- Implemented `processQueriesInResponse` method to:
  - Extract and parse queries
  - Execute them via Lokka MCP
  - Replace query tags with results

### 2. Improved System Prompts
All LLM providers (Anthropic, OpenAI, Ollama, LM Studio) now have consistent system prompts that:
- Provide clear instructions on query format
- Include examples with proper endpoint, method, and params
- Guide the LLMs to use the correct tag format

### 3. Better Result Processing
Enhanced the `generateFinalResponse` method in `EnhancedLLMService` to:
- Handle various response formats from the Graph API
- Extract data from nested result structures
- Present results clearly within the response

## Testing Tools

Several testing scripts are available to verify the fix:

### 1. Simple JavaScript Test
```powershell
.\run-simple-test.ps1
```
This tests the query extraction and replacement logic using a simulated response.

### 2. Query Extraction Test
```powershell
.\run-query-extraction-test.ps1
```
Focused test for the query extraction logic without actual API calls. Tests multiple query formats and endpoint types.

### 3. Full TypeScript Integration Test
```powershell
# First, set your Anthropic API key
$env:ANTHROPIC_API_KEY = "your-api-key"

# Then run the test
.\run-cloud-llm-test.ps1
```
Complete end-to-end test using the real Anthropic API and Lokka MCP server integration.

## Expected Behavior

When a user asks a question requiring Microsoft Graph data:
1. The Cloud LLM generates a response with `<execute_query>` tags
2. The `UnifiedLLMService` extracts and executes these queries
3. The results are inserted into the response
4. The user sees a complete answer with both explanation and data

## Troubleshooting

If any issues arise with the cloud LLM query execution:

1. Check the API key is properly set
2. Ensure the Lokka MCP server is running
3. Verify the system prompts have the correct query format examples
4. Run the diagnostic tests to pinpoint the issue

## Implementation Details

The main change is in the `UnifiedLLMService.chat()` method, which now processes any `<execute_query>` tags found in responses from any LLM provider. This creates a unified approach where both local and cloud LLMs can trigger query execution through the same pathway.
