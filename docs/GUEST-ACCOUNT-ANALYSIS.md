# Working with Guest Accounts in EntraPulseLite

EntraPulseLite provides a comprehensive set of tools to analyze and manage guest accounts in your Microsoft Entra ID tenant. This guide demonstrates how to use the `GuestAccountAnalyzer` utility to query and analyze guest accounts.

## Prerequisites

1. **Valid Tenant Credentials**: Ensure you have valid tenant credentials in your `.env.local` file:
   ```
   LOKKA_TENANT_ID=your_tenant_id
   LOKKA_CLIENT_ID=your_client_id
   LOKKA_CLIENT_SECRET=your_client_secret
   ```

2. **Required Permissions**: Your application needs the following Microsoft Graph permissions:
   - `User.Read.All` - To read all user profiles
   - `Directory.Read.All` - To read directory data

## Getting Started

The `GuestAccountAnalyzer` class provides several methods to query and analyze guest accounts in your tenant:

```typescript
import { MCPClient } from './mcp/clients/MCPClient';
import { GuestAccountAnalyzer } from './shared/GuestAccountAnalyzer';

// Initialize the MCP client (typically done by your application)
const mcpClient = new MCPClient(/* your config */);

// Create an instance of the Guest Account Analyzer
const guestAnalyzer = new GuestAccountAnalyzer(mcpClient);

// Now you can use the analyzer to query guest accounts
```

## Querying Guest Accounts

### Get a Summary of Guest Accounts

To get a summary of guest vs. member accounts in your tenant:

```typescript
async function displayGuestSummary() {
  try {
    const summary = await guestAnalyzer.getGuestAccountSummary();
    
    console.log(`Total Users: ${summary.totalUsers}`);
    console.log(`Guest Users: ${summary.guestUsers} (${summary.guestPercentage}%)`);
    console.log(`Member Users: ${summary.memberUsers} (${summary.memberPercentage}%)`);
  } catch (error) {
    console.error('Error getting guest account summary:', error);
  }
}
```

### Get Recent Guest Accounts

To get a list of recently added guest accounts:

```typescript
async function displayRecentGuestAccounts() {
  try {
    const recentGuests = await guestAnalyzer.getRecentGuestAccounts(10);
    
    console.log('Recently Added Guest Accounts:');
    recentGuests.forEach((guest, index) => {
      const createdDate = new Date(guest.createdDateTime || '');
      console.log(`${index + 1}. ${guest.displayName} (${guest.userPrincipalName}) - Added: ${createdDate.toLocaleDateString()}`);
    });
  } catch (error) {
    console.error('Error getting recent guest accounts:', error);
  }
}
```

### Guest Accounts by Domain

To analyze guest accounts by their email domain:

```typescript
async function displayGuestsByDomain(domain: string) {
  try {
    const domainGuests = await guestAnalyzer.getGuestAccountsByDomain(domain);
    
    console.log(`Guest Accounts from ${domain}:`);
    domainGuests.forEach((guest, index) => {
      console.log(`${index + 1}. ${guest.displayName} (${guest.mail || 'No email'})`);
    });
  } catch (error) {
    console.error(`Error getting guest accounts from ${domain}:`, error);
  }
}
```

### Guest Domain Summary

To get a summary of which domains your guest accounts are from:

```typescript
async function displayGuestDomainSummary() {
  try {
    const domains = await guestAnalyzer.getGuestDomainSummary();
    
    console.log('Top Guest Account Domains:');
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.domain} - ${domain.count} users`);
    });
  } catch (error) {
    console.error('Error getting guest domain summary:', error);
  }
}
```

## Example: Creating a Guest Account Report

Here's a complete example of generating a comprehensive guest account report:

```typescript
async function generateGuestAccountReport() {
  try {
    // Get overall summary
    const summary = await guestAnalyzer.getGuestAccountSummary();
    console.log('==== GUEST ACCOUNT SUMMARY ====');
    console.log(`Total Users: ${summary.totalUsers}`);
    console.log(`Guest Users: ${summary.guestUsers} (${summary.guestPercentage}%)`);
    console.log(`Member Users: ${summary.memberUsers} (${summary.memberPercentage}%)`);
    console.log();
    
    // Get recent guests
    const recentGuests = await guestAnalyzer.getRecentGuestAccounts(5);
    console.log('==== RECENTLY ADDED GUESTS ====');
    recentGuests.forEach((guest, index) => {
      const createdDate = new Date(guest.createdDateTime || '');
      console.log(`${index + 1}. ${guest.displayName} (${guest.userPrincipalName}) - ${createdDate.toLocaleDateString()}`);
    });
    console.log();
    
    // Get domain summary
    const domains = await guestAnalyzer.getGuestDomainSummary(10);
    console.log('==== TOP GUEST DOMAINS ====');
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.domain} - ${domain.count} users (${((domain.count / summary.guestUsers) * 100).toFixed(2)}%)`);
    });
    
    // Return the full report data
    return {
      summary,
      recentGuests,
      domains
    };
  } catch (error) {
    console.error('Error generating guest account report:', error);
    throw error;
  }
}
```

## Adding Guest Account Analysis to Your UI

You can integrate guest account analysis into your application's UI components. Here's an example of a React component:

```tsx
import React, { useState, useEffect } from 'react';
import { MCPClient } from '../mcp/clients/MCPClient';
import { GuestAccountAnalyzer, GuestAccountSummary } from '../shared/GuestAccountAnalyzer';

interface GuestAccountReportProps {
  mcpClient: MCPClient;
}

export const GuestAccountReport: React.FC<GuestAccountReportProps> = ({ mcpClient }) => {
  const [summary, setSummary] = useState<GuestAccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const analyzer = new GuestAccountAnalyzer(mcpClient);
    
    async function loadSummary() {
      try {
        setIsLoading(true);
        const data = await analyzer.getGuestAccountSummary();
        setSummary(data);
        setError(null);
      } catch (err) {
        setError(`Error loading guest account summary: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSummary();
  }, [mcpClient]);
  
  if (isLoading) {
    return <div>Loading guest account data...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!summary) {
    return <div>No guest account data available</div>;
  }
  
  return (
    <div className="guest-account-summary">
      <h2>Guest Account Summary</h2>
      <div className="summary-card">
        <div className="stat">
          <span className="stat-value">{summary.totalUsers}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summary.guestUsers}</span>
          <span className="stat-label">Guest Users</span>
        </div>
        <div className="stat">
          <span className="stat-value">{summary.guestPercentage}%</span>
          <span className="stat-label">Guest Percentage</span>
        </div>
      </div>
    </div>
  );
};
```

## Conclusion

The `GuestAccountAnalyzer` provides a powerful and convenient way to work with guest accounts in your Microsoft Entra ID tenant. By leveraging the External Lokka MCP Server for Microsoft Graph API access, you can easily retrieve and analyze guest account data for security audits, reporting, and management purposes.
