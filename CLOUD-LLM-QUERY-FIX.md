# Cloud LLM Query Execution Fix

## Issue Description
The Cloud LLM (Claude from Anthropic) correctly generates responses with `<execute_query>` tags, but these queries were not being executed by the Lokka MCP server. This issue only affected cloud LLMs, as local LLMs were already integrated correctly.

## Changes Made

### 1. Enhanced UnifiedLLMService
- Added regex pattern to detect `<execute_query>` tags in LLM responses
- Implemented a new `processQueriesInResponse` method that:
  - Extracts queries from the response 
  - Parses the JSON query object
  - Executes the query via Lokka MCP
  - Replaces the query tags with both the query and results

### 2. Updated System Prompts
- Enhanced system prompts for both Cloud and Local LLMs with:
  - Clear instructions on how to format Microsoft Graph queries
  - Added examples of proper query format with endpoint, method, and params
  - Consistent formatting across all LLM providers (Anthropic, OpenAI, Ollama, LM Studio)

### 3. Improved Result Processing
- Enhanced `generateFinalResponse` method in EnhancedLLMService to better handle various response formats
- Added better extraction of nested result structures from the Graph API responses

### 4. Added Testing Tool
- Created `test-cloud-llm-query.js` to verify the integration between Cloud LLM and Lokka MCP
- Includes diagnostics to check if queries are being properly detected and executed

## Testing
To test the fix, run the test script:

```powershell
$env:ANTHROPIC_API_KEY = "your-api-key"
node test-cloud-llm-query.js
```

The script will:
1. Initialize an EnhancedLLMService with Anthropic provider
2. Send a test query that should trigger a Graph API call
3. Verify if the query was properly extracted and executed
4. Display the final response with query results

## Expected Behavior
- When a user asks a question that requires Microsoft Graph data:
  1. The Cloud LLM (Claude) will generate a response with `<execute_query>` tags
  2. The UnifiedLLMService will extract and execute these queries via Lokka MCP
  3. The query results will be inserted into the response
  4. The user will see both the natural language answer and the actual data
