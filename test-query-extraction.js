// Test script for verifying the query extraction logic without making actual API calls
const fs = require('fs');
const path = require('path');

// Mock the necessary LLM response with execute_query tags
const mockLLMResponse = `
I'll help you find information about users in your tenant. Let me query the Microsoft Graph API:

<execute_query>
{
  "endpoint": "/users",
  "method": "get",
  "params": {
    "$select": "displayName,userPrincipalName,id,userType,mail",
    "$filter": "startsWith(displayName, 'A')",
    "$top": 5
  }
}
</execute_query>

<execute_query>
{
  "endpoint": "/groups",
  "method": "get",
  "params": {
    "$select": "displayName,description",
    "$top": 3
  }
}
</execute_query>

Let me show you the guest accounts specifically:

<execute_query>
{
  "endpoint": "/users",
  "method": "get",
  "params": {
    "$filter": "userType eq 'Guest'"
  }
}
</execute_query>
`;

// Regular expression for extracting Graph API queries from LLM responses - same as in UnifiedLLMService
const EXECUTE_QUERY_REGEX = /<execute_query>([\s\S]*?)<\/execute_query>/g;

// Function to process and extract queries from a response
function processQueriesInResponse(response) {
  console.log('Processing queries in LLM response...');
  let modifiedResponse = response;
  let queryCount = 0;
  
  // Find all execute_query blocks
  const queryMatches = [...response.matchAll(EXECUTE_QUERY_REGEX)];
  
  console.log(`Found ${queryMatches.length} queries in response\n`);
  
  for (const match of queryMatches) {
    try {
      const queryText = match[1].trim();
      queryCount++;
      console.log(`Query #${queryCount} content:`);
      console.log(queryText);
      console.log();
      
      // Parse the query - expecting JSON object with endpoint, method, and optional params
      const query = JSON.parse(queryText);
      console.log(`Parsed query object:`);
      console.log(JSON.stringify(query, null, 2));
      console.log();
      
      if (!query.endpoint) {
        console.warn('Invalid query format - missing endpoint');
        continue;
      }
      
      // Mock execute query via Lokka MCP
      console.log(`Mock executing Graph API query: ${(query.method || 'GET').toUpperCase()} ${query.endpoint}`);
      
      // Create a mock result based on the query
      let mockResult;
      if (query.endpoint === '/users') {
        if (query.params && query.params['$filter'] === "userType eq 'Guest'") {
          mockResult = {
            value: [
              {
                displayName: "Guest User 1",
                userPrincipalName: "guest1_example.com#EXT#@example.onmicrosoft.com",
                id: "guest-id-1",
                userType: "Guest"
              },
              {
                displayName: "Guest User 2",
                userPrincipalName: "guest2_example.com#EXT#@example.onmicrosoft.com",
                id: "guest-id-2",
                userType: "Guest"
              }
            ]
          };
        } else {
          mockResult = {
            value: [
              {
                displayName: "Alice Johnson",
                userPrincipalName: "alice.johnson@example.com",
                id: "user-id-1",
                userType: "Member",
                mail: "alice.johnson@example.com"
              },
              {
                displayName: "Alex Smith",
                userPrincipalName: "alex.smith@example.com",
                id: "user-id-2",
                userType: "Member",
                mail: "alex.smith@example.com"
              }
            ]
          };
        }
      } else if (query.endpoint === '/groups') {
        mockResult = {
          value: [
            {
              displayName: "Marketing Team",
              description: "Group for marketing department",
              id: "group-id-1"
            },
            {
              displayName: "Finance Department",
              description: "Group for finance department",
              id: "group-id-2"
            },
            {
              displayName: "Executive Team",
              description: "Executive leadership team",
              id: "group-id-3"
            }
          ]
        };
      }
      
      // Replace the execute_query block with the result
      const resultDisplay = JSON.stringify(mockResult, null, 2);
      const replacementText = `<execute_query>${queryText}</execute_query>\n\n**Query Result:**\n\`\`\`json\n${resultDisplay}\n\`\`\``;
      modifiedResponse = modifiedResponse.replace(match[0], replacementText);
      
    } catch (error) {
      console.error(`Error processing query #${queryCount}:`, error);
      const errorMessage = `<execute_query>${match[1]}</execute_query>\n\n**Query Error:** ${error.message}`;
      modifiedResponse = modifiedResponse.replace(match[0], errorMessage);
    }
  }
  
  return {
    originalResponse: response,
    processedResponse: modifiedResponse,
    queryCount
  };
}

// Run the test
console.log('Starting Query Extraction Test\n');
console.log('Mock LLM Response (excerpt):');
console.log(mockLLMResponse.substring(0, 200) + '...\n');

const result = processQueriesInResponse(mockLLMResponse);

console.log(`\nExtracted ${result.queryCount} queries from response`);
console.log('\nProcessed Response:');
console.log(result.processedResponse);

console.log('\nTest completed successfully!');
