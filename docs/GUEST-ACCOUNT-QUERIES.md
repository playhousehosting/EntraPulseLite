# Querying Guest Accounts with External Lokka MCP Server

This guide demonstrates how to use the External Lokka MCP Server in EntraPulseLite to query and analyze guest accounts in an Entra ID tenant.

## Prerequisites

1. **Client Credentials Configuration**: Ensure you have correctly configured your Entra ID client credentials in `.env.local`:

```
LOKKA_TENANT_ID=your_tenant_id
LOKKA_CLIENT_ID=your_client_id
LOKKA_CLIENT_SECRET=your_client_secret
```

2. **Required Permissions**: The service principal associated with your client credentials needs the following Microsoft Graph API permissions:
   - `User.Read.All` - To read all user profiles
   - `Directory.Read.All` - To read directory data

3. **External Lokka MCP Server**: Make sure the External Lokka MCP Server is enabled in your configuration.

## Basic Guest Account Query

To query for guest accounts, use the following query structure through the External Lokka MCP Server:

```typescript
const request = {
  id: 'guest-accounts-query',
  method: 'tools/call',
  params: {
    name: 'microsoft_graph_query',
    arguments: {
      endpoint: '/users',
      method: 'GET',
      queryParams: {
        '$select': 'id,displayName,userPrincipalName,userType',
        '$filter': "userType eq 'Guest'",
        '$count': 'true'
      }
    }
  }
};

const response = await mcpClient.callTool('external-lokka', request);
```

## Counting Guest Accounts

To get a count of guest accounts versus total accounts:

```typescript
// Get total users
const totalUsersCount = await mcpClient.callTool('external-lokka', 'microsoft_graph_query', {
  endpoint: '/users/$count',
  method: 'GET'
});

// Get guest users
const guestUsersCount = await mcpClient.callTool('external-lokka', 'microsoft_graph_query', {
  endpoint: '/users/$count',
  method: 'GET',
  queryParams: {
    '$filter': "userType eq 'Guest'"
  }
});

// Calculate percentage
const totalUsers = parseInt(totalUsersCount, 10);
const guestUsers = parseInt(guestUsersCount, 10);
const guestPercentage = (guestUsers / totalUsers) * 100;
```

## Advanced Guest Account Filtering

For more advanced queries, you can use the `d94_Lokka-Microsoft` tool:

```typescript
const advancedRequest = {
  id: 'advanced-guest-query',
  method: 'tools/call',
  params: {
    name: 'd94_Lokka-Microsoft',
    arguments: {
      apiType: 'graph',
      method: 'get',
      path: '/users',
      queryParams: {
        '$select': 'id,displayName,mail,userPrincipalName,userType,createdDateTime',
        '$filter': "userType eq 'Guest' and startswith(userPrincipalName, '#EXT#')",
        '$orderby': 'createdDateTime desc',
        '$top': '10'
      }
    }
  }
};

const advancedResponse = await mcpClient.callTool('external-lokka', advancedRequest);
```

## Common Guest Account Filters

- **Recently Added Guests**: `$filter=userType eq 'Guest'&$orderby=createdDateTime desc`
- **External Domain Guests**: `$filter=userType eq 'Guest' and endsWith(userPrincipalName, '@example.com')`
- **Inactive Guests**: `$filter=userType eq 'Guest' and signInActivity/lastSignInDateTime le 2023-01-01T00:00:00Z` (requires beta endpoint)
- **Guests with specific roles**: For this, you'll need to query `/directoryRoles/{role-id}/members` and filter for guests

## Using Results in EntraPulseLite UI

The guest account query results can be used in the EntraPulseLite UI to:

1. Show a count/percentage of guest accounts
2. Display recently added guests
3. Alert on unusual guest account activity
4. Generate reports on external organizations' presence in your directory

## Running the Tests

Tests for guest account querying are available in the integration test suite:

```bash
npm run test:integration -- -t "Guest Account Queries"
```

These tests verify that:
1. You can query and count guest accounts
2. You can perform advanced filtering of guest accounts
3. You can calculate the percentage of guest accounts in your tenant

## Security Considerations

When querying guest account information:

1. Apply least privilege principles to your service principal
2. Store client credentials securely
3. Never expose full guest account details in logs or UI without appropriate access controls
4. Consider tenant policies regarding guest accounts before exposing information widely
